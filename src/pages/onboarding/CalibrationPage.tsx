import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { markOnboarded, saveBaseline } from "@/lib/baseline";
import {
  getLiveSnapshot,
  getLiveRaw,
  isLiveHardware,
  resumeLiveSession,
  subscribeLive,
  subscribeRaw,
  type LiveBio,
} from "@/lib/live-device";
import { FocusDetectVisual, MeditateDetectVisual } from "@/components/DetectVisual";
import { IconArrow } from "@/components/icons/IconArrow";
import { ONBOARD_BLEED, ONBOARD_SAFE_TOP } from "@/lib/onboarding-layout";
import type { WorkSceneId } from "@/lib/scenes";
import { useSceneBgm } from "@/lib/use-scene-bgm";

/**
 * 首次校准:1 分钟建立新用户的脑电波日常基线(真实产品为 5 分钟,演示用 1 分钟)。
 *
 *  30s  读取默认状态 —— 基本校准与归一化
 *  15s  校准专注状态 —— 盯住小球,记录专注数值
 *  15s  监测冥想状态 —— 全身松弛、微睡意,记录冥想数值
 *
 * 阶段 BGM（复用六景入库轨，见 scene-audio / SCENE-BGM-INGEST）：
 *  平常 → post-meet 软光回落 · 专注 → clock-in 开工 · 冥想 → clock-out 下工
 */

type PhaseKey = "baseline" | "focus" | "meditate";

/** 平常 / 专注 / 冥想 → 已入库场景床轨 */
const PHASE_BGM: Record<PhaseKey, WorkSceneId> = {
  baseline: "post-meet",
  focus: "clock-in",
  meditate: "clock-out",
};

const PHASES: {
  key: PhaseKey;
  seconds: number;
  title: string;
  instruction: string;
}[] = [
  {
    key: "baseline",
    seconds: 30,
    title: "读取默认状态",
    instruction: "保持自然状态,正常呼吸。\n不需要做任何事,放松看着屏幕就好。",
  },
  {
    key: "focus",
    seconds: 15,
    title: "校准专注状态",
    instruction: "盯着中央的小球。\n让注意力收拢到它身上,别的什么都不要想。",
  },
  {
    key: "meditate",
    seconds: 15,
    title: "监测冥想状态",
    instruction: "肩膀下沉,把整个身心都松弛下来。\n保持像即将入睡、微微有睡意的状态。",
  },
];

const BIO_TARGET: Record<PhaseKey, { arousal: number; focus: number; calm: number }> = {
  baseline: { arousal: 62, focus: 55, calm: 50 },
  focus: { arousal: 58, focus: 86, calm: 55 },
  meditate: { arousal: 38, focus: 45, calm: 82 },
};

const METER_COLORS = { arousal: "#FF6B4A", calm: "#111111", focus: "#C9A227" } as const;

const WAVE_CHANNELS = [
  { key: "arousal" as const, color: "#FF6B4A", label: "唤醒", y: 0.22, freq: 1.9 },
  { key: "focus" as const, color: "#C9A227", label: "专注", y: 0.5, freq: 1.2 },
  { key: "calm" as const, color: "#111111", label: "冥想", y: 0.78, freq: 0.62 },
];

const METRIC_HINTS = [
  {
    key: "arousal" as const,
    label: "默认唤醒",
    hint: "你此刻的激活程度。偏高说明更容易警觉、走神或紧绷；偏低则更安静。Tuno 用它对照每天的起伏，不是评判好坏。",
  },
  {
    key: "focus" as const,
    label: "专注基线",
    hint: "来自头环 attention。这是你「收得住注意力」的参照水位。校准第二段盯小球时，这条线通常会抬高。",
  },
  {
    key: "calm" as const,
    label: "冥想基线",
    hint: "来自 meditation，反映放松与内收。肩背松开、微有睡意时会上升。之后练习会看你有没有回到这条线附近。",
  },
] as const;

/** 第一阶段同时画出唤醒 / 专注 / 冥想三条通道；真机把 raw EEG 织进各条，而不是盖成第四根。 */
function WaveCanvas({
  bioRef,
  rawRef,
  live,
}: {
  bioRef: React.MutableRefObject<{ arousal: number; focus: number; calm: number }>;
  rawRef: React.MutableRefObject<number[]>;
  live: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let t = 0;
    let last = performance.now();
    const smooth = { arousal: bioRef.current.arousal, focus: bioRef.current.focus, calm: bioRef.current.calm };
    const TAU = 0.28;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cssW = canvas.clientWidth || 330;
      const cssH = canvas.clientHeight || 196;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt * 1.05;
      const bio = bioRef.current;
      for (const k of ["arousal", "focus", "calm"] as const) {
        smooth[k] += (bio[k] - smooth[k]) * (1 - Math.exp(-dt / TAU));
      }
      const w = canvas.clientWidth || 330;
      const h = canvas.clientHeight || 196;
      ctx.clearRect(0, 0, w, h);
      const raw = rawRef.current;
      const rawMin = raw.length ? Math.min(...raw) : 0;
      const rawMax = raw.length ? Math.max(...raw) : 1;
      const rawSpan = Math.max(1, rawMax - rawMin);

      WAVE_CHANNELS.forEach((ch, li) => {
        const mid = h * ch.y;
        ctx.beginPath();
        ctx.strokeStyle = "rgba(17,17,17,0.06)";
        ctx.lineWidth = 1;
        ctx.moveTo(0, mid);
        ctx.lineTo(w, mid);
        ctx.stroke();

        const level = smooth[ch.key];
        const amp = 8 + (level / 100) * 26;
        ctx.beginPath();
        ctx.strokeStyle = ch.color;
        ctx.globalAlpha = 0.92;
        ctx.lineWidth = 1.7;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        for (let x = 0; x <= w; x += 2) {
          const i = raw.length > 1 ? Math.min(raw.length - 1, Math.floor((x / w) * (raw.length - 1))) : 0;
          const rawN = live && raw.length > 8 ? ((raw[i] - rawMin) / rawSpan - 0.5) * 2 : 0;
          const y =
            mid +
            Math.sin(x * 0.018 * ch.freq + t * (1.15 + ch.freq) + li * 2.05) * amp +
            Math.sin(x * 0.05 * ch.freq + t * 2.15 + li) * amp * 0.32 +
            rawN * (10 + level * 0.08);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [bioRef, rawRef, live]);
  return (
    <div className="flex w-full flex-col">
      <canvas ref={canvasRef} className="h-[min(168px,26vh)] w-full" />
      <div className="mt-1.5 flex items-center justify-center gap-4">
        {WAVE_CHANNELS.map((ch) => (
          <span key={ch.key} className="flex items-center gap-1.5 text-[10px] text-ink/45">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: ch.color }} />
            {ch.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function MetricHintCard({
  label,
  value,
  color,
  hint,
}: {
  label: string;
  value: number;
  color: string;
  hint: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      className="w-full cursor-help rounded-[18px] bg-white px-4 py-2.5 text-left shadow-[0_12px_32px_-18px_rgba(17,17,17,0.2)] transition hover:shadow-[0_14px_36px_-16px_rgba(17,17,17,0.28)]"
      aria-expanded={open}
      aria-label={`${label}，${value}。${open ? hint : "点按查看说明"}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen((v) => !v)}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-ink/50">
          {label}
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-cream text-[9px] font-semibold text-ink/45">
            i
          </span>
        </span>
        <span className="font-display text-lg font-bold">{value}</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-cream">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <p className="overflow-hidden text-[12px] leading-relaxed text-ink/55">
          <span className="mt-2.5 block">{hint}</span>
        </p>
      </div>
    </button>
  );
}

export default function CalibrationPage() {
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0); // 秒(0.1 精度)
  const [done, setDone] = useState(false);
  const [baseline, setBaseline] = useState<{ arousal: number; focus: number; calm: number } | null>(null);
  const [live, setLive] = useState({ arousal: 60, focus: 52, calm: 48 });
  const [liveHw, setLiveHw] = useState(() => isLiveHardware());
  const [contact, setContact] = useState<number | null>(null);

  const bioRef = useRef({ arousal: 60, focus: 52, calm: 48 });
  const displayBioRef = useRef({ arousal: 60, focus: 52, calm: 48 });
  const hardwareRef = useRef(isLiveHardware());
  const liveRef = useRef<LiveBio | null>(null);
  const rawRef = useRef<number[]>([]);
  const phaseSamplesRef = useRef<{ arousal: number[]; focus: number[]; calm: number[] }>({
    arousal: [],
    focus: [],
    calm: [],
  });

  const totalSeconds = PHASES.reduce((s, p) => s + p.seconds, 0);
  const bounds = PHASES.reduce<number[]>((acc, p) => [...acc, (acc.at(-1) ?? 0) + p.seconds], []);
  const phaseIdx = bounds.findIndex((b) => elapsed < b);
  const phase = phaseIdx === -1 ? null : PHASES[phaseIdx];
  const phaseLeft = phase ? Math.ceil(bounds[phaseIdx] - elapsed) : 0;
  const bgmScene = phase ? PHASE_BGM[phase.key] : PHASE_BGM.baseline;
  useSceneBgm(bgmScene, !done && phase != null);

  useEffect(() => {
    resumeLiveSession();
    const snap = getLiveSnapshot();
    const hw = isLiveHardware();
    hardwareRef.current = hw;
    setLiveHw(hw);
    rawRef.current = getLiveRaw();
    if (snap.last) {
      liveRef.current = snap.last;
      if (hw) {
        const next = { arousal: snap.last.arousal, focus: snap.last.focus, calm: snap.last.calm };
        bioRef.current = next;
        displayBioRef.current = { ...next };
        setLive(next);
        setContact(snap.last.signal);
      }
    }
    const offBio = subscribeLive((b) => {
      liveRef.current = b;
      const on = isLiveHardware();
      hardwareRef.current = on;
      setLiveHw(on);
      setContact(b.signal);
      if (on) {
        const next = { arousal: b.arousal, focus: b.focus, calm: b.calm };
        bioRef.current = next;
      }
    });
    const offRaw = subscribeRaw((raw) => {
      rawRef.current = raw;
    });
    return () => {
      offBio();
      offRaw();
    };
  }, []);

  // 显示层 EMA：把 10Hz 采样 / 真机抖动收成平滑条与视觉输入（~20fps 写回 React）
  useEffect(() => {
    if (done) return;
    let raf = 0;
    let last = performance.now();
    let lastPublish = 0;
    const TAU = 0.3;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const a = 1 - Math.exp(-dt / TAU);
      const src = bioRef.current;
      const d = displayBioRef.current;
      d.arousal += (src.arousal - d.arousal) * a;
      d.focus += (src.focus - d.focus) * a;
      d.calm += (src.calm - d.calm) * a;
      if (now - lastPublish >= 50) {
        lastPublish = now;
        setLive({ arousal: d.arousal, focus: d.focus, calm: d.calm });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [done]);

  // 主时钟:0.1s 步进；真机用实时样本，否则向阶段目标收敛
  useEffect(() => {
    if (done) return;
    const timer = setInterval(() => {
      setElapsed((e) => {
        const next = +(e + 0.1).toFixed(1);
        if (next >= totalSeconds) {
          clearInterval(timer);
          finish();
          return totalSeconds;
        }
        const idx = bounds.findIndex((b) => next < b);
        const key = PHASES[idx].key;
        const bio = bioRef.current;
        const hw = liveRef.current;
        if (hardwareRef.current && hw) {
          bio.arousal = hw.arousal;
          bio.focus = hw.focus;
          bio.calm = hw.calm;
        } else {
          const target = BIO_TARGET[key];
          for (const k of ["arousal", "focus", "calm"] as const) {
            bio[k] += (target[k] - bio[k]) * 0.028 + (Math.random() - 0.5) * 0.35;
            bio[k] = Math.max(8, Math.min(97, bio[k]));
          }
        }
        phaseSamplesRef.current[key === "baseline" ? "arousal" : key === "focus" ? "focus" : "calm"].push(
          bio[key === "baseline" ? "arousal" : key === "focus" ? "focus" : "calm"],
        );
        return next;
      });
    }, 100);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const finish = () => {
    const avgTail = (arr: number[], n = 40) =>
      arr.length === 0 ? 60 : Math.round(arr.slice(-n).reduce((s, x) => s + x, 0) / Math.min(arr.length, n));
    const result = {
      arousal: avgTail(phaseSamplesRef.current.arousal),
      focus: avgTail(phaseSamplesRef.current.focus),
      calm: avgTail(phaseSamplesRef.current.calm),
    };
    setBaseline(result);
    saveBaseline({ ...result, calibratedAt: new Date().toISOString() });
    markOnboarded();
    setDone(true);
  };

  const skip = () => {
    saveBaseline({ arousal: 62, focus: 55, calm: 50, calibratedAt: new Date().toISOString() });
    markOnboarded();
    navigate("/home");
  };

  const recalibrate = () => {
    phaseSamplesRef.current = { arousal: [], focus: [], calm: [] };
    setBaseline(null);
    setElapsed(0);
    setDone(false);
  };

  // ── 完成页 ──
  if (done && baseline) {
    return (
      <div className={`${ONBOARD_BLEED} bg-cream text-ink`}>
        <div className={`relative flex min-h-0 flex-1 flex-col px-6 pb-7 ${ONBOARD_SAFE_TOP}`}>
          <div className="pointer-events-none absolute -top-8 right-[-36px] h-36 w-36 rounded-full bg-mint" />
          <div className="pointer-events-none absolute top-40 left-[-48px] h-28 w-28 rounded-full bg-butter/90" />
          <div className="nf-fade-slow relative mt-2 shrink-0 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink text-xl text-white">
              ✦
            </div>
            <h1 className="font-display mt-4 text-[1.85rem] font-extrabold">校准完成</h1>
            <p className="mt-2 text-[12px] leading-relaxed text-ink/55">
              {liveHw
                ? "基线来自刚才头环读到的真实 attention / meditation。"
                : "已生成演示基线。接上头环后再校准，会改用真实读数。"}
            </p>
          </div>

          <div className="nf-fade-slow relative mt-5 min-h-0 w-full flex-1 space-y-2 overflow-hidden" style={{ animationDelay: "0.25s" }}>
            {METRIC_HINTS.map((item) => (
              <MetricHintCard
                key={item.key}
                label={item.label}
                value={baseline[item.key]}
                color={METER_COLORS[item.key]}
                hint={item.hint}
              />
            ))}
          </div>

          <div className="relative mt-4 flex w-full shrink-0 flex-col gap-2.5">
            <button
              type="button"
              onClick={() => navigate("/home")}
              className="nf-btn-primary nf-fade-slow flex w-full items-center justify-between !py-2 !pr-2 !pl-6"
              style={{ animationDelay: "0.4s" }}
            >
              <span>进入首页,开始第 1 天</span>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white">
                <IconArrow direction="right" />
              </span>
            </button>
            <button
              type="button"
              onClick={recalibrate}
              className="nf-fade-slow min-h-11 w-full rounded-full text-[13px] font-semibold text-ink/50 transition hover:bg-white/70 hover:text-ink"
              style={{ animationDelay: "0.5s" }}
            >
              重新校准
            </button>
          </div>
        </div>
      </div>
    );
  }

  const dark = phase?.key === "meditate";

  // ── 校准中 ──
  return (
    <div className={`${ONBOARD_BLEED} transition-colors duration-1000 ${dark ? "bg-ink" : "bg-cream"}`}>
      <div className={`relative flex min-h-0 flex-1 flex-col px-6 pb-6 ${ONBOARD_SAFE_TOP}`}>
        <div className="shrink-0">
          <div className="flex items-center justify-between">
            <span className={`label-caps ${dark ? "!text-cream/50" : ""}`}>
              首次校准 · 1 分钟
              {liveHw ? " · 真机" : " · 演示"}
            </span>
            <span className={`text-[11px] ${dark ? "text-cream/45" : "text-ink/40"}`}>
              {phaseIdx + 1} / 3
            </span>
          </div>
          <div className="mt-2.5 flex gap-1.5">
            {PHASES.map((p, i) => {
              const start = i === 0 ? 0 : bounds[i - 1];
              const fill = Math.max(0, Math.min(1, (elapsed - start) / p.seconds));
              return (
                <div key={p.key} className={`h-1 flex-1 overflow-hidden rounded-full ${dark ? "bg-cream/15" : "bg-ink/10"}`}>
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ease-out ${dark ? "bg-cream" : "bg-ink"}`}
                    style={{ width: `${fill * 100}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative mt-4 flex min-h-0 flex-1 items-center justify-center">
          {phase?.key === "baseline" && <WaveCanvas bioRef={bioRef} rawRef={rawRef} live={liveHw} />}
          {phase?.key === "focus" && (
            <div className="nf-fade-slow w-full">
              <FocusDetectVisual focus={live.focus} />
            </div>
          )}
          {phase?.key === "meditate" && (
            <div className="nf-fade-slow w-full">
              <MeditateDetectVisual calm={live.calm} />
            </div>
          )}
        </div>

        <div className="mt-3 shrink-0 text-center">
          <div className={`font-display text-4xl font-medium tabular-nums ${dark ? "text-cream" : "text-ink"}`}>
            {phaseLeft}
            <span className={`ml-1 text-sm ${dark ? "text-cream/40" : "text-ink/35"}`}>s</span>
          </div>
          <h2 className={`mt-2 font-display text-lg font-medium ${dark ? "text-cream" : "text-ink"}`}>
            {phase?.title}
          </h2>
          <p
            className={`mt-1.5 text-[12px] leading-relaxed whitespace-pre-line ${
              dark ? "text-cream/55" : "text-ink/55"
            }`}
          >
            {phase?.instruction}
          </p>
          {liveHw && contact != null && (
            <p className={`mt-1.5 text-[11px] ${dark ? "text-cream/45" : contact > 80 ? "text-clay" : "text-ink/40"}`}>
              {contact > 80 ? `接触偏弱 · signal ${contact}` : `真机信号 · contact ${contact}`}
            </p>
          )}
        </div>

        <div className="mt-auto shrink-0 space-y-1.5 pt-4">
          {(
            [
              ["Arousal", live.arousal, dark ? "rgba(255,255,255,0.35)" : METER_COLORS.arousal],
              ["Focus", live.focus, dark ? "rgba(255,255,255,0.55)" : METER_COLORS.focus],
              ["Calm", live.calm, dark ? "rgba(255,255,255,0.92)" : METER_COLORS.calm],
            ] as const
          ).map(([label, v, color]) => {
            const staring = phase?.key === "focus" || phase?.key === "meditate";
            return (
              <div key={label} className="flex items-center gap-3">
                {!staring && (
                  <span className="w-14 text-[10px] text-ink/45">{label}</span>
                )}
                <div className={`h-1.5 flex-1 overflow-hidden rounded-full ${dark ? "bg-cream/15" : "bg-ink/10"}`}>
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{
                      width: `${v}%`,
                      background: color,
                      boxShadow: staring && !dark ? `0 0 8px ${color}` : undefined,
                    }}
                  />
                </div>
                {!staring && (
                  <span className="w-7 text-right text-[10px] tabular-nums text-ink/45">{Math.round(v)}</span>
                )}
              </div>
            );
          })}
          <button
            onClick={skip}
            className={`w-full pt-2 text-center text-[11px] ${
              dark ? "text-cream/30 hover:text-cream/60" : "text-ink/30 hover:text-ink/55"
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1">
              跳过校准,使用默认基线
              <IconArrow direction="right" className="h-3 w-3 opacity-70" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
