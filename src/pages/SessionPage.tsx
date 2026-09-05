import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { type LiveBio } from "@/components/BioOrb";
import PlayerAura from "@/components/PlayerAura";
import OverloadVisual from "@/components/training-visuals/OverloadVisual";
import { overloadVisualKind } from "@/lib/training-visual-registry";
import DebriefPanel from "@/components/DebriefPanel";
import { ComplianceDisclosure } from "@/components/ComplianceNote";
import { trpc } from "@/providers/trpc";
import type { BioSample, FinalDecision, GoalId, InventedPractice, TrainingPlan } from "@contracts/agents";
import { recordSession } from "@/lib/memory";
import { speakGuidance, stopGuidance } from "@/lib/tts";
import {
  BREATH_478_CUE_WINDOW_MS,
  breath478CueText,
  breath478SegAt,
  patchBreath478Phases,
  type Breath478Seg,
} from "@/lib/breath-478-session";
import { sceneIdForSession } from "@/lib/scene-audio";
import { useSceneBgm } from "@/lib/use-scene-bgm";
import { WORK_SCENE_BY_ID } from "@/lib/scenes";
import { pathStepForPlan } from "@/lib/scene-paths";
import { IconArrow } from "@/components/icons/IconArrow";
import {
  getLiveSnapshot,
  isLiveHardware,
  resumeLiveSession,
  subscribeLive,
} from "@/lib/live-device";
import { PHONE_BLEED, PHONE_SAFE_TOP } from "@/lib/onboarding-layout";

const PREF_CAPTIONS = "nf2-session-show-captions";
const PREF_LIVE_BIO = "nf2-session-show-live-bio";

function loadPref(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === "1";
  } catch {
    return fallback;
  }
}

function savePref(key: string, on: boolean) {
  try {
    localStorage.setItem(key, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function IconCaptions({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <path d="M7 12.5h4.5M7 15.5h10M13.5 12.5H17" strokeLinecap="round" />
    </svg>
  );
}

function IconWave({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 12h2.2l2-5.5 3.2 11L13.5 8l2.3 4H21" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSpeaker({ className = "", muted = false }: { className?: string; muted?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4.5 9.5v5h3.2L12.5 18V6L7.7 9.5H4.5Z" strokeLinejoin="round" />
      {muted ? (
        <path d="M16 9.5 20 14.5M20 9.5 16 14.5" strokeLinecap="round" />
      ) : (
        <>
          <path d="M15.2 9.2a3.6 3.6 0 0 1 0 5.6" strokeLinecap="round" />
          <path d="M17.4 7a6.2 6.2 0 0 1 0 10" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

const BIO_TARGET: Record<GoalId, LiveBio> = {
  calm: { arousal: 34, calm: 76, focus: 55 },
  focus: { arousal: 56, focus: 82, calm: 62 },
  sleep: { arousal: 26, calm: 82, focus: 42 },
};

function dominantGoal(plan: TrainingPlan): GoalId {
  const entries = Object.entries(plan.goalAffinity) as [GoalId, number][];
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function evolveBio(bio: LiveBio, target: LiveBio): LiveBio {
  const next = { ...bio };
  for (const k of ["arousal", "focus", "calm"] as const) {
    next[k] += (target[k] - bio[k]) * 0.018 + (Math.random() - 0.5) * 2.2;
    next[k] = Math.max(5, Math.min(98, next[k]));
  }
  if (Math.random() < 0.012) next.focus = Math.max(15, next.focus - 8);
  return next;
}

function fromHardware(): LiveBio | null {
  const snap = getLiveSnapshot();
  if (!isLiveHardware() || !snap.last) return null;
  return { arousal: snap.last.arousal, focus: snap.last.focus, calm: snap.last.calm };
}

function seedLive(): LiveBio {
  return fromHardware() ?? { arousal: 68, focus: 52, calm: 48 };
}

function fmt(sec: number) {
  const m = Math.floor(Math.max(0, sec) / 60);
  const s = Math.max(0, sec) % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SessionPage() {
  const { planId } = useParams<{ planId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const presets = trpc.agent.presets.useQuery();
  const debriefMut = trpc.agent.debrief.useMutation();

  const handoff = (location.state ?? {}) as {
    customized?: FinalDecision["customized"];
    invented?: InventedPractice;
    goalId?: GoalId;
    fromA2A?: boolean;
    sceneId?: string;
  };

  const inventedPlan: TrainingPlan | undefined = useMemo(() => {
    if (planId !== "invented" || !handoff.invented) return undefined;
    const inv = handoff.invented;
    return {
      id: "invented",
      category: "guided_imagery",
      name: inv.name,
      subtitle: inv.scene,
      tags: ["✦ 即兴创作", "为此刻而生"],
      cover: { from: "#e6dcf4", to: "#f7ecf3" },
      tagline: inv.scene,
      durationMin: inv.durationMin,
      intensity: 1,
      phases: inv.phases,
      goalAffinity: { calm: 0.7, focus: 0.5, sleep: 0.5 },
      stateFit: { arousalRange: [0, 100], outOfRangePenalty: 1 },
      tunableParams: {
        breathPattern: inv.breathPattern,
        musicType: inv.musicType,
        guidanceLevel: inv.guidanceLevel,
      },
      contraindications: [],
    };
  }, [planId, handoff.invented]);

  const plan = presets.data?.plans.find((p) => p.id === planId) ?? inventedPlan;

  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [finished, setFinished] = useState(false);
  const demoAuto = useMemo(
    () => new URLSearchParams(location.search).get("demo") === "1",
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [demoSpeed, setDemoSpeed] = useState(demoAuto);
  const [voiceOn, setVoiceOn] = useState(true);
  const [showCaptions, setShowCaptions] = useState(() => loadPref(PREF_CAPTIONS, true));
  const [showLiveBio, setShowLiveBio] = useState(() => loadPref(PREF_LIVE_BIO, true));
  const [bioHud, setBioHud] = useState<LiveBio>(() => seedLive());
  const [liveHw, setLiveHw] = useState(() => isLiveHardware());

  const liveRef = useRef<LiveBio>(seedLive());
  const hardwareRef = useRef(isLiveHardware());
  const samplesRef = useRef<BioSample[]>([]);
  const elapsedRef = useRef(0);
  const tickRef = useRef(0);
  const autoStartedRef = useRef(false);
  /** breath-478：引导词结束后短 cue 窗口截止时间戳 */
  const breathCueUntilRef = useRef(0);
  const breathCueLastSegRef = useRef<Breath478Seg | null>(null);
  const secondsLeftRef = useRef(0);

  const activePhases = useMemo(() => {
    if (!plan) return [];
    // breath-478：前端覆写循环段为 2′（4-7-8）；API presets 仍可能是 6′
    const base = plan.id === "breath-478" ? patchBreath478Phases(plan.phases) : plan.phases;
    const custom = handoff.customized;
    const planTotal = base.reduce((s, p) => s + p.minutes, 0);
    if (!custom || custom.durationMin === planTotal) return base;
    const scale = custom.durationMin / planTotal;
    return base.map((p) => ({
      ...p,
      minutes: Math.max(0.5, Math.round(p.minutes * scale * 2) / 2),
    }));
  }, [plan, handoff.customized]);

  const sessionGoal: GoalId | null = useMemo(
    () => (plan ? (handoff.goalId ?? dominantGoal(plan)) : null),
    [plan, handoff.goalId],
  );

  const sceneId = sceneIdForSession(planId, handoff.sceneId, sessionGoal);
  const scene = WORK_SCENE_BY_ID[sceneId];
  useSceneBgm(sceneId, running && !finished);

  /** 场景下的训练模块播放列表（如超载减负的四组）；无场景时只播当前这一条。 */
  const playlist = useMemo(() => {
    if (!planId) return [] as string[];
    const related = scene?.relatedPlanIds ?? [];
    if (related.length > 1 && related.includes(planId)) return related;
    if (related.length > 1) return [planId, ...related.filter((id) => id !== planId)];
    return [planId];
  }, [planId, scene]);
  const moduleIndex = Math.max(0, playlist.indexOf(planId ?? ""));
  const canStepModules = playlist.length > 1;

  const phase = activePhases[phaseIdx];
  const totalSec = useMemo(
    () => activePhases.reduce((s, p) => s + p.minutes, 0) * 60,
    [activePhases],
  );
  const remainingAfter =
    activePhases.slice(phaseIdx + 1).reduce((s, p) => s + p.minutes, 0) * 60;
  const remaining = (running || finished ? secondsLeft : totalSec) + (running ? remainingAfter : 0);
  const played = Math.max(0, totalSec - remaining);
  const progress = totalSec > 0 ? Math.min(1, played / totalSec) : 0;

  // 同页切换场景内模块时重置会话（Router 常复用组件实例）
  useEffect(() => {
    stopGuidance();
    setRunning(false);
    setPhaseIdx(0);
    setSecondsLeft(0);
    setFinished(false);
    samplesRef.current = [];
    elapsedRef.current = 0;
    liveRef.current = seedLive();
    debriefMut.reset();
    autoStartedRef.current = false;
    breathCueUntilRef.current = 0;
    breathCueLastSegRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  secondsLeftRef.current = secondsLeft;

  // 语音：普通阶段播 instruction；breath-478 循环段播完引导词后仅 ~20s 跟拍吸/屏/呼
  useEffect(() => {
    if (!running) {
      stopGuidance();
      breathCueUntilRef.current = 0;
      breathCueLastSegRef.current = null;
      return;
    }
    if (!voiceOn || demoSpeed || !phase || !plan) return;

    let cancelled = false;
    breathCueUntilRef.current = 0;
    breathCueLastSegRef.current = null;

    const run = async () => {
      if (plan.id === "breath-478" && phaseIdx === 1) {
        const result = await speakGuidance(phase.instruction);
        if (cancelled || result === "cancelled") return;
        // 开窗：之后约 20 秒内按 4-7-8 段切点提示；界面波形全程继续循环
        breathCueUntilRef.current = Date.now() + BREATH_478_CUE_WINDOW_MS;
        breathCueLastSegRef.current = null;
        return;
      }
      await speakGuidance(phase.instruction);
    };
    void run();

    return () => {
      cancelled = true;
      stopGuidance();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phaseIdx, voiceOn, demoSpeed, plan?.id]);

  // breath-478：引导词结束后的短 cue（吸气 / 屏住 / 呼气），超时即静音，视觉仍循环
  useEffect(() => {
    if (!running || !voiceOn || demoSpeed || plan?.id !== "breath-478" || phaseIdx !== 1) {
      return;
    }
    const id = window.setInterval(() => {
      const until = breathCueUntilRef.current;
      if (!until || Date.now() > until) return;
      const dur = phase ? Math.round(phase.minutes * 60) : 0;
      const elapsed = Math.max(0, dur - secondsLeftRef.current);
      const seg = breath478SegAt(elapsed);
      if (seg === breathCueLastSegRef.current) return;
      breathCueLastSegRef.current = seg;
      void speakGuidance(breath478CueText(seg));
    }, 280);
    return () => window.clearInterval(id);
  }, [running, voiceOn, demoSpeed, plan?.id, phaseIdx, phase]);

  useEffect(() => {
    resumeLiveSession();
    const seeded = seedLive();
    const hw = isLiveHardware();
    hardwareRef.current = hw;
    setLiveHw(hw);
    liveRef.current = seeded;
    setBioHud(seeded);
    return subscribeLive((b) => {
      const on = isLiveHardware();
      hardwareRef.current = on;
      setLiveHw(on);
      if (!on) return;
      liveRef.current = { arousal: b.arousal, focus: b.focus, calm: b.calm };
      if (showLiveBio) {
        setBioHud({ arousal: b.arousal, focus: b.focus, calm: b.calm });
      }
    });
  }, [showLiveBio]);

  useEffect(() => {
    if (!showLiveBio || finished) return;
    const id = window.setInterval(() => {
      setBioHud({ ...liveRef.current });
    }, 280);
    return () => window.clearInterval(id);
  }, [showLiveBio, finished, running]);

  useEffect(() => {
    if (!running || !plan || !phase || !sessionGoal) return;
    const target = BIO_TARGET[sessionGoal];
    const timer = setInterval(
      () => {
        tickRef.current++;
        elapsedRef.current++;
        const hwNow = fromHardware();
        if (hardwareRef.current && hwNow) {
          liveRef.current = hwNow;
        } else {
          liveRef.current = evolveBio(liveRef.current, target);
        }
        samplesRef.current.push({ t: elapsedRef.current, ...liveRef.current });
        setSecondsLeft((s) => {
          if (s > 1) return s - 1;
          if (phaseIdx < activePhases.length - 1) {
            setPhaseIdx(phaseIdx + 1);
            return activePhases[phaseIdx + 1].minutes * 60;
          }
          clearInterval(timer);
          setRunning(false);
          setFinished(true);
          const rec = samplesRef.current;
          if (rec.length > 1) {
            recordSession({
              planId: plan.id,
              planName: plan.name,
              goalId: sessionGoal,
              durationMin: Math.max(1, Math.round(rec[rec.length - 1].t / 60)),
              at: new Date().toISOString(),
              arousalStart: Math.round(rec[0].arousal),
              arousalEnd: Math.round(rec[rec.length - 1].arousal),
            });
          }
          if (plan.id !== "invented") {
            debriefMut.mutate({
              planId: plan.id,
              goalId: sessionGoal,
              samples: samplesRef.current,
            });
          }
          return 0;
        });
      },
      demoSpeed ? 1000 / 60 : 1000,
    );
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phaseIdx, plan, activePhases, sessionGoal, demoSpeed]);

  useEffect(() => {
    if (demoAuto && plan && activePhases.length > 0 && !autoStartedRef.current) {
      autoStartedRef.current = true;
      setPhaseIdx(0);
      setSecondsLeft(activePhases[0].minutes * 60);
      setFinished(false);
      samplesRef.current = [];
      elapsedRef.current = 0;
      liveRef.current = seedLive();
      debriefMut.reset();
      setRunning(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoAuto, plan, activePhases]);

  if (presets.isLoading) {
    return (
      <div className={`${PHONE_BLEED} items-center justify-center bg-[#0c0c0e] text-sm text-white/40`}>
        <span className={PHONE_SAFE_TOP}>准备声场…</span>
      </div>
    );
  }
  if (!plan) {
    return (
      <div className={`${PHONE_BLEED} items-center justify-center bg-[#0c0c0e] px-8 text-center text-white`}>
        <div className={PHONE_SAFE_TOP}>
          <p className="text-white/50">没有找到这个训练模块。</p>
          <Link to="/explore" className="mt-3 inline-block text-sm font-semibold underline">
            返回总览
          </Link>
        </div>
      </div>
    );
  }

  const start = () => {
    setPhaseIdx(0);
    setSecondsLeft(activePhases[0].minutes * 60);
    setFinished(false);
    samplesRef.current = [];
    elapsedRef.current = 0;
    liveRef.current = seedLive();
    debriefMut.reset();
    setRunning(true);
  };

  const goModule = (nextId: string) => {
    if (!nextId || nextId === planId) return;
    stopGuidance();
    setRunning(false);
    navigate(`/session/${nextId}`, {
      replace: true,
      state: {
        sceneId,
        goalId: handoff.goalId,
        fromA2A: handoff.fromA2A,
      },
    });
  };

  const goPrevModule = () => {
    if (!canStepModules || moduleIndex <= 0) return;
    goModule(playlist[moduleIndex - 1]!);
  };

  const goNextModule = () => {
    if (!canStepModules || moduleIndex >= playlist.length - 1) return;
    goModule(playlist[moduleIndex + 1]!);
  };

  const title = scene?.name ?? plan.name;
  const pathStep = pathStepForPlan(sceneId, plan.id);
  const moduleLabel =
    presets.data?.plans.find((p) => p.id === planId)?.name ?? plan.name;
  const caption = running
    ? phase?.instruction
    : pathStep
      ? `${pathStep.role}：${pathStep.when}。${phase?.instruction ?? activePhases[0]?.instruction ?? ""}`
      : scene?.description ?? activePhases[0]?.instruction;

  const visualKind = overloadVisualKind(plan.id);
  const phaseDurSec = phase ? Math.round(phase.minutes * 60) : 0;
  const phaseElapsedSec =
    running || finished ? Math.max(0, phaseDurSec - secondsLeft) : 0;
  const sessionElapsedSec = played;

  return (
    <div className={`${PHONE_BLEED} bg-[#0c0c0e] text-white`}>
      {visualKind ? (
        <OverloadVisual
          kind={visualKind}
          phaseIndex={phaseIdx}
          phaseElapsedSec={phaseElapsedSec}
          sessionElapsedSec={sessionElapsedSec}
          running={running}
          liveRef={liveRef}
        />
      ) : (
        <PlayerAura liveRef={liveRef} sceneId={sceneId} />
      )}

      <header className={`relative z-10 flex items-center justify-between px-5 pb-1 ${PHONE_SAFE_TOP}`}>
        <Link
          to={scene ? `/scene/${scene.id}` : "/explore"}
          className="flex h-11 w-11 items-center justify-center rounded-full text-white/80"
          aria-label="收起"
        >
          <IconArrow direction="down" />
        </Link>
        <div className="text-center">
          <div className="font-display text-[17px] font-semibold tracking-wide">
            {sceneId === "overload" ? "大脑超载" : title}
          </div>
          <p className="mt-0.5 max-w-[20ch] truncate text-[12px] text-white/45">
            {canStepModules
              ? pathStep
                ? `${moduleIndex + 1}/${playlist.length} · ${pathStep.role} · ${moduleLabel}`
                : `${moduleIndex + 1}/${playlist.length} · ${moduleLabel}`
              : "Tuno"}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              setShowCaptions((v) => {
                savePref(PREF_CAPTIONS, !v);
                return !v;
              });
            }}
            className={`flex h-11 w-10 items-center justify-center rounded-full ${
              showCaptions ? "text-white/90" : "text-white/28"
            }`}
            aria-pressed={showCaptions}
            aria-label={showCaptions ? "隐藏字幕" : "显示字幕"}
            title={showCaptions ? "隐藏字幕" : "显示字幕"}
          >
            <IconCaptions className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowLiveBio((v) => {
                savePref(PREF_LIVE_BIO, !v);
                return !v;
              });
            }}
            className={`flex h-11 w-10 items-center justify-center rounded-full ${
              showLiveBio ? "text-white/90" : "text-white/28"
            }`}
            aria-pressed={showLiveBio}
            aria-label={showLiveBio ? "隐藏脑电读数" : "显示脑电读数"}
            title={showLiveBio ? "隐藏脑电读数" : "显示脑电读数"}
          >
            <IconWave className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => setVoiceOn((v) => !v)}
            className={`flex h-11 w-10 items-center justify-center rounded-full ${
              voiceOn ? "text-white/90" : "text-white/28"
            }`}
            aria-pressed={voiceOn}
            aria-label={voiceOn ? "关闭语音" : "开启语音"}
            title={voiceOn ? "关闭语音" : "开启语音"}
          >
            <IconSpeaker className="h-[18px] w-[18px]" muted={!voiceOn} />
          </button>
        </div>
      </header>

      {!finished && showLiveBio && (
        <div className="relative z-10 mx-5 mt-3 rounded-[18px] bg-white/[0.07] px-2 py-2.5 ring-1 ring-white/10">
          <div className="flex items-center justify-around">
            {(
              [
                ["唤醒", Math.round(bioHud.arousal)],
                ["专注", Math.round(bioHud.focus)],
                ["平静", Math.round(bioHud.calm)],
              ] as const
            ).map(([label, v]) => (
              <div key={label} className="min-w-[4.5rem] text-center">
                <div className="font-display text-[15px] font-bold tabular-nums text-white/90">{v}</div>
                <div className="mt-0.5 text-[10px] tracking-wide text-white/40">{label}</div>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-center text-[9px] tracking-wide text-white/25">
            {liveHw ? "NeuroBand · 真机采集" : "模拟信号 · 光场仍随读数起伏"}
          </p>
        </div>
      )}
      {!finished && (
        <div className="relative z-10 px-5 pt-3">
          <div
            className="flex gap-1.5"
            role="group"
            aria-label={canStepModules ? `场景内 ${playlist.length} 个训练模块` : "当前训练进度"}
          >
            {playlist.map((id, i) => {
              const fill =
                i < moduleIndex ? 1 : i === moduleIndex ? (finished ? 1 : progress) : 0;
              const isCurrent = i === moduleIndex;
              return (
                <button
                  key={id}
                  type="button"
                  disabled={!canStepModules}
                  onClick={() => canStepModules && goModule(id)}
                  className={`h-1 min-w-0 flex-1 overflow-hidden rounded-full ${
                    canStepModules ? "cursor-pointer" : "cursor-default"
                  } ${isCurrent ? "bg-white/25" : "bg-white/12"}`}
                  aria-label={
                    canStepModules
                      ? `第 ${i + 1} 个模块${isCurrent ? "（当前）" : ""}`
                      : "训练进度"
                  }
                  aria-current={isCurrent ? "true" : undefined}
                >
                  <span
                    className={`block h-full rounded-full ${isCurrent ? "bg-white" : "bg-white/70"}`}
                    style={{ width: `${Math.round(fill * 100)}%` }}
                  />
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[11px] tabular-nums text-white/40">
            <span>{fmt(Math.round(played))}</span>
            <span>{fmt(Math.round(totalSec))}</span>
          </div>
        </div>
      )}

      <div className={`relative z-10 ${finished ? "hidden" : "flex-1"}`} />

      {!finished && (
        <div className="relative z-10 px-6 pb-8">
          {showCaptions ? (
            <p className="mx-auto min-h-[3.2em] max-w-[34ch] text-center text-[14px] leading-relaxed text-white/80">
              {caption}
              {running && activePhases.length > 1 ? (
                <span className="text-white/40">
                  {" "}
                  ({phaseIdx + 1}/{activePhases.length})
                </span>
              ) : null}
            </p>
          ) : (
            <div className="mx-auto min-h-[3.2em]" aria-hidden />
          )}

          {!running && (
            <div className="mt-3 flex justify-center">
              <ComplianceDisclosure tone="dark" />
            </div>
          )}

          <div className="mt-5 flex items-center justify-center gap-8">
            {canStepModules ? (
              <button
                type="button"
                onClick={goPrevModule}
                disabled={moduleIndex <= 0}
                className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 disabled:opacity-25"
                aria-label="上一个训练模块"
              >
                <IconArrow direction="left" className="h-5 w-5" />
              </button>
            ) : (
              <span className="w-11" />
            )}
            <button
              type="button"
              onClick={() => (running ? setRunning(false) : start())}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-ink"
              aria-label={running ? "暂停" : "开始"}
            >
              {running ? (
                <span className="flex gap-1">
                  <span className="h-5 w-[3px] rounded-full bg-ink" />
                  <span className="h-5 w-[3px] rounded-full bg-ink" />
                </span>
              ) : (
                <span className="ml-0.5 border-y-[9px] border-l-[14px] border-y-transparent border-l-ink" />
              )}
            </button>
            {canStepModules ? (
              <button
                type="button"
                onClick={goNextModule}
                disabled={moduleIndex >= playlist.length - 1}
                className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 disabled:opacity-25"
                aria-label="下一个训练模块"
              >
                <IconArrow direction="right" className="h-5 w-5" />
              </button>
            ) : (
              <span className="w-11" />
            )}
          </div>

          {!running && (
            <label className="mt-5 flex items-center justify-center gap-2 text-[11px] text-white/40">
              <input
                type="checkbox"
                checked={demoSpeed}
                onChange={(e) => setDemoSpeed(e.target.checked)}
                className="accent-white"
              />
              演示加速
            </label>
          )}
        </div>
      )}

      {!running && finished && (
        <div className="nf-scroll-hide relative z-10 flex flex-1 flex-col overflow-y-auto px-5 pb-8">
          <div className="text-center">
            <div className="font-display text-3xl">练习完成</div>
            <p className="mt-2 text-sm text-white/50">Tuno 正在解读你刚才的状态曲线…</p>
          </div>
          {plan.id === "invented" && (
            <div className="mt-6 rounded-[28px] bg-cream p-6 text-center text-ink">
              <p className="font-display text-lg text-ink/70">「{plan.name}」是为这一刻而生的练习,它已经被记住了。</p>
              <div className="mt-6 flex justify-center gap-3">
                <button onClick={start} className="nf-btn-ghost">
                  再练一次
                </button>
                <Link to="/home" className="nf-btn-primary">
                  回到首页
                </Link>
              </div>
            </div>
          )}
          {plan.id !== "invented" && (
            <div className="mt-6 rounded-[28px] bg-cream p-1 text-ink">
              {debriefMut.isPending && (
                <div className="flex items-center justify-center gap-2 p-8 text-sm text-ink/45">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-ink" />
                  Tuno 正在解读 {samplesRef.current.length} 个采样点…
                </div>
              )}
              {debriefMut.data && (
                <div className="p-3">
                  <DebriefPanel debrief={debriefMut.data} samples={samplesRef.current} onRestart={start} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
