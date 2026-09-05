import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import StatePanel from "@/components/StatePanel";
import LLMSettings, { useLLMConfig } from "@/components/LLMSettings";
import { trpc } from "@/providers/trpc";
import type { ConsultResult, UserState } from "@contracts/agents";
import { iconForExpert } from "@/lib/expert-icons";
import { loadBaseline } from "@/lib/baseline";
import { getLiveSnapshot, isLiveHardware } from "@/lib/live-device";
import { loadMemory, recordConsult } from "@/lib/memory";
import { summarizeMemory } from "@contracts/agents";
import type { HomeIntentState } from "@/lib/intent-route";
import { clipSpeakText, speakGuidance, stopGuidance } from "@/lib/tts";
import { IconArrow } from "@/components/icons/IconArrow";
import { PHONE_BLEED, PHONE_SAFE_TOP } from "@/lib/onboarding-layout";
import { TUNO_FRIENDS, TUNO_ROSTER } from "@/lib/tuno-friends";

/** 默认状态:有校准基线时用基线,否则用演示值 */
function defaultState(): UserState {
  const live = getLiveSnapshot().last;
  if (isLiveHardware() && live) {
    return {
      arousal: Math.round(live.arousal),
      focus: Math.round(live.focus),
      calm: Math.round(live.calm),
      sleepHours: 6.2,
      availableMinutes: 15,
    };
  }
  const b = loadBaseline();
  return {
    arousal: b?.arousal ?? 72,
    focus: b?.focus ?? 58,
    calm: b?.calm ?? 54,
    sleepHours: 6.2,
    availableMinutes: 15,
  };
}

const WEIGHT_META = [
  { key: "calm" as const, label: "减压", color: "#111111" },
  { key: "focus" as const, label: "专注", color: "#C9A227" },
  { key: "sleep" as const, label: "睡前准备", color: "#7B8CFF" },
];

function SettingsGearIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path
        d="M12 3.5v1.8M12 18.7v1.8M3.5 12h1.8M18.7 12h1.8M6.1 6.1l1.3 1.3M16.6 16.6l1.3 1.3M17.9 6.1l-1.3 1.3M7.4 16.6l-1.3 1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Friends 阵容：不同底色 + 头像；放在输入与定制按钮下方 */
function FriendsRoster({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" aria-label="Tuno 与专家阵容">
        {TUNO_ROSTER.map((f) => (
          <span
            key={f.id}
            title={`${f.name} · ${f.role}`}
            className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-ink/10"
            style={{ background: f.bg }}
          >
            <img src={f.avatar} alt="" className="h-full w-full object-cover" />
          </span>
        ))}
        <span className="ml-1 shrink-0 text-[11px] text-ink/40">{TUNO_FRIENDS.length} 位专家</span>
      </div>
    );
  }

  return (
    <section aria-label="Multi-Agent 阵容">
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <h2 className="text-[12px] font-semibold tracking-wide text-ink/55 uppercase">The Friends</h2>
        <span className="text-[11px] text-ink/35">按擅长上场 · 只拼目录</span>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2.5">
        {TUNO_ROSTER.map((f) => (
          <li
            key={f.id}
            className={`overflow-hidden rounded-[22px] ${f.host ? "col-span-2" : ""}`}
            style={{ background: f.bg }}
          >
            <div className={`flex items-center gap-3 p-3 ${f.host ? "sm:p-3.5" : ""}`}>
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-white/40 shadow-[0_8px_20px_-12px_rgba(17,17,17,0.35)] ring-2 ring-white/70">
                <img src={f.avatar} alt="" className="h-full w-full object-cover" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span
                    className={`font-display text-[15px] font-bold ${f.host ? "text-white" : "text-ink"}`}
                  >
                    {f.name}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      background: f.host ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.55)",
                      color: f.host ? "rgba(255,255,255,0.75)" : f.accent,
                    }}
                  >
                    {f.role}
                  </span>
                </div>
                <p className={`mt-0.5 text-[12px] leading-relaxed ${f.host ? "text-white/60" : "text-ink/55"}`}>
                  {f.blurb}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ConsultSettingsScreen({
  state,
  onChange,
  onBack,
}: {
  state: UserState;
  onChange: (s: UserState) => void;
  onBack: () => void;
}) {
  const mem = loadMemory();
  const memSummary = summarizeMemory(mem);

  return (
    <div className={`${PHONE_BLEED} bg-cream`}>
      <div className={`relative z-10 flex min-h-0 flex-1 flex-col px-5 pb-4 ${PHONE_SAFE_TOP}`}>
        <header className="flex shrink-0 items-center gap-2 pb-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-[0_8px_20px_-12px_rgba(17,17,17,0.28)] ring-1 ring-ink/5"
            aria-label="返回会诊"
          >
            <IconArrow direction="left" className="h-[18px] w-[18px]" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg font-bold text-ink">会诊设置</h1>
            <p className="text-[11px] text-ink/40">LLM · 记忆 · 模拟状态</p>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pb-2">
          <section className="rounded-[22px] bg-white p-4 shadow-[0_10px_28px_-18px_rgba(17,17,17,0.22)]">
            <LLMSettings bare forceOpen />
          </section>
          <section className="rounded-[22px] bg-white p-4 shadow-[0_10px_28px_-18px_rgba(17,17,17,0.22)]">
            <p className="label-caps mb-2">记忆</p>
            <p className="text-[13px] leading-relaxed text-ink/55">
              {mem.sessions.length > 0 || mem.consults.length > 0
                ? `已记住 ${memSummary.totalSessions} 次训练 · ${memSummary.totalConsults} 次会诊` +
                  (memSummary.lastSession ? ` · 上次练了「${memSummary.lastSession.planName}」` : "")
                : "还没有训练记忆——第一次会诊后会开始记住你"}
            </p>
            <p className="mt-2 text-[12px] text-ink/40">
              会诊时会把记忆与当下脑数据一并交给专家（不上传原始波形）。
            </p>
          </section>
          <section className="rounded-[22px] bg-white p-4 shadow-[0_10px_28px_-18px_rgba(17,17,17,0.22)]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="label-caps">NeuroBand · 模拟状态</span>
            </div>
            <StatePanel value={state} onChange={onChange} bare />
          </section>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="nf-btn-primary mt-3 flex w-full shrink-0 items-center justify-center gap-2"
        >
          <IconArrow direction="left" className="h-4 w-4" />
          返回会诊
        </button>
      </div>
    </div>
  );
}

/** Tuno 的编排分析:需求配比条 + 选派专家 */
function AnalysisCard({
  analysis,
  catalogCount,
}: {
  analysis: ConsultResult["analysis"];
  catalogCount?: number;
}) {
  return (
    <div className="rounded-[24px] bg-white p-5 shadow-[0_10px_28px_-18px_rgba(17,17,17,0.2)]">
      <span className="label-caps">Tuno 的读心 · 需求配比</span>
      <p className="mt-3 font-display text-base leading-relaxed text-ink/75">{analysis.summary}</p>
      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-sand/60">
        {WEIGHT_META.map((w) =>
          analysis.weights[w.key] > 0 ? (
            <div
              key={w.key}
              className="h-full transition-all duration-700"
              style={{ width: `${analysis.weights[w.key]}%`, background: w.color }}
            />
          ) : null,
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {WEIGHT_META.map((w) => (
          <span key={w.key} className="flex items-center gap-1.5 text-[11px] text-ink/55">
            <span className="h-2 w-2 rounded-full" style={{ background: w.color }} />
            {w.label} {analysis.weights[w.key]}%
          </span>
        ))}
      </div>
      <div className="mt-5 pt-4">
        <span className="text-[11px] tracking-wide text-ink/40">
          Tuno 选派了 {analysis.selectedExperts.length} 位 Friends
          {typeof catalogCount === "number" ? ` · 共用疗法目录 ${catalogCount} 项` : ""}
        </span>
        <div className="mt-2.5 space-y-2">
          {analysis.selectedExperts.map((e) => (
            <div key={e.expertId} className="flex items-start gap-2.5 text-xs">
              <span className="mt-0.5 text-ink">
                {iconForExpert({ expertId: e.expertId, reason: e.reason })}
              </span>
              <div>
                <span className="font-medium text-ink">{e.expertName}</span>
                <span className="ml-2 text-ink/45">{e.reason}</span>
                <div className="mt-0.5 text-[11px] leading-relaxed text-ink/50">分工:{e.task}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TranscriptBubble({
  m,
  onReplay,
}: {
  m: ConsultResult["transcript"][number];
  onReplay?: () => void;
}) {
  const isTuno = m.from === "tuno";
  const isChallenge = m.kind === "challenge";
  const isDecision = m.kind === "decision";
  return (
    <div className={`flex gap-3 ${isTuno ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm ${
          isTuno ? "bg-ink text-white" : "bg-mint text-ink"
        }`}
      >
        {isTuno
          ? "✦"
          : iconForExpert({
              expertId: m.from,
              domain: (m.payload as { domain?: string })?.domain,
            })}
      </div>
      <div className={`max-w-[78%] ${isTuno ? "text-right" : ""}`}>
        <div className="mb-1 text-[11px] text-ink/40">
          <span className="font-medium text-ink/70">{m.fromName}</span>
          <span className="mx-1 inline-flex align-middle text-ink/35">
            <IconArrow direction="right" className="h-3 w-3" />
          </span>
          {m.to === "user" ? "你" : m.to === "broadcast" ? "全体" : m.to.replace("expert_", "")}
        </div>
        <button
          type="button"
          onClick={onReplay}
          className={`rounded-2xl px-4 py-3 text-left text-xs leading-relaxed ${
            isDecision
              ? "bg-ink text-white"
              : isChallenge
                ? "bg-[#faf0e8] text-clay"
                : isTuno
                  ? "bg-ink text-white"
                  : "bg-white text-ink/75 shadow-[0_8px_24px_-16px_rgba(17,17,17,0.35)]"
          }`}
        >
          {m.content}
        </button>
      </div>
    </div>
  );
}

export default function ConsultPage() {
  const presets = trpc.agent.presets.useQuery();
  const consult = trpc.agent.consult.useMutation();
  const location = useLocation();
  const navigate = useNavigate();
  const prefill = (location.state ?? {}) as { prefillMessage?: string; userState?: UserState };
  const [message, setMessage] = useState(prefill.prefillMessage ?? "");
  const [state, setState] = useState<UserState>(prefill.userState ?? defaultState());
  const [result, setResult] = useState<ConsultResult | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const resultTopRef = useRef<HTMLDivElement>(null);
  const decisionRef = useRef<HTMLDivElement>(null);
  const llmConfig = useLLMConfig();

  useEffect(() => {
    if (!result) return;
    setVisibleCount(0);
    const timer = setInterval(() => {
      setVisibleCount((c) => {
        if (c >= result.transcript.length) {
          clearInterval(timer);
          return c;
        }
        return c + 1;
      });
    }, 420);
    return () => clearInterval(timer);
  }, [result]);

  useEffect(() => {
    if (!result || visibleCount <= 0) return;
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [visibleCount, result]);

  useEffect(() => () => stopGuidance(), []);

  const run = (override?: string) => {
    const text = (override ?? message).trim();
    if (!text) return;
    setResult(null);
    window.setTimeout(() => {
      resultTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    consult.mutate(
      {
        message: text,
        state,
        llm: llmConfig,
        memory: loadMemory(),
      },
      {
        onSuccess: (res) => {
          setResult(res);
          recordConsult({
            at: new Date().toISOString(),
            goalId: res.goalId,
            planId: res.decision.planId,
            planName: res.decision.planName,
          });
          window.setTimeout(() => {
            resultTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 60);
        },
      },
    );
  };

  useEffect(() => {
    const nav = (location.state ?? {}) as HomeIntentState;
    const text = nav.prefillMessage?.trim();
    if (!nav.autoStart || !text) return;
    const timer = window.setTimeout(() => {
      run(text);
      navigate(".", { replace: true, state: { prefillMessage: text, userState: state } });
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const transcriptDone = result ? visibleCount >= result.transcript.length : false;

  useEffect(() => {
    if (!transcriptDone) return;
    window.setTimeout(() => {
      decisionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 200);
  }, [transcriptDone]);

  const inventedWinner = result?.proposals.find(
    (p) => p.planId === "invented" && p.invented && result.decision.planId === "invented",
  )?.invented;

  if (settingsOpen) {
    return (
      <ConsultSettingsScreen
        state={state}
        onChange={setState}
        onBack={() => setSettingsOpen(false)}
      />
    );
  }

  return (
    <div className={`${PHONE_BLEED} bg-cream`}>
      <div className={`relative z-10 flex min-h-0 flex-1 flex-col ${PHONE_SAFE_TOP}`}>
        <header className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-ink/45">Multi-Agent</p>
            <h1 className="font-display mt-0.5 text-[1.7rem] leading-[1.12] font-extrabold text-ink">
              Tuno &amp; Friends
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink/40 transition hover:bg-white hover:text-ink/65"
            aria-label="会诊设置"
            title="设置"
          >
            <SettingsGearIcon className="h-[18px] w-[18px]" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
          <p className="max-w-[40ch] text-[14px] leading-relaxed text-ink/50">
            直接说出你想定制的练法——想缓解什么、练什么、有多少时间。Tuno
            会叫上擅长的 Friends，从疗法目录里拼出一套属于你的冥想方案。
          </p>

          <section className="mt-4">
            <label htmlFor="consult-intent" className="font-display text-[1.2rem] font-extrabold text-ink">
              说说你想怎么练
            </label>
            <textarea
              id="consult-intent"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run();
              }}
              rows={4}
              placeholder="例如：开完会还很紧，想先落地 5 分钟，再给专注热身；今晚想睡前下行，别太久……"
              className="mt-3 w-full resize-none rounded-[24px] bg-white px-4 py-3.5 text-[15px] leading-relaxed text-ink shadow-[0_12px_36px_-20px_rgba(17,17,17,0.28)] placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-ink/12"
            />
            <button
              type="button"
              onClick={() => run()}
              disabled={consult.isPending || !message.trim()}
              className="nf-btn-primary mt-3 w-full !py-4"
            >
              {consult.isPending ? (
                "Tuno 正在叫 Friends…"
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  让 Tuno &amp; Friends 定制
                  <IconArrow direction="right" className="h-4 w-4" />
                </span>
              )}
            </button>
            <p className="mt-2 text-center text-[11px] text-ink/30">⌘/Ctrl + Enter 也可发起</p>
          </section>

          <div className="mt-5">
            <FriendsRoster />
          </div>

          <div ref={resultTopRef} className="mt-6 scroll-mt-3 space-y-5">
            {consult.isPending && (
              <div className="flex flex-col items-center justify-center gap-3 rounded-[24px] bg-white px-5 py-8 text-sm text-ink/45 shadow-[0_10px_28px_-18px_rgba(17,17,17,0.2)]">
                <FriendsRoster compact />
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-ink" />
                  Tuno 正在分析诉求、按擅长选派 Friends…
                </div>
              </div>
            )}
            {consult.isError && (
              <div className="rounded-[24px] border border-clay/25 bg-[#faf0e8] p-6 text-sm leading-relaxed text-clay">
                会诊请求出错了:{consult.error.message}。
                {llmConfig
                  ? "如果你刚填了 API Key,请检查 Key、Base URL 与模型名;也可以切回规则引擎。"
                  : "可能是服务正在冷启动,稍等几秒重新发起。"}
              </div>
            )}

            {result && (
              <>
                <AnalysisCard analysis={result.analysis} catalogCount={presets.data?.plans.length} />

                <div className="rounded-[24px] bg-white p-5 shadow-[0_10px_28px_-18px_rgba(17,17,17,0.2)]">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="label-caps">会诊记录 · {result.transcript.length} 条消息</span>
                    <span className="text-[10px] text-ink/35">默认静音 · 点气泡听声</span>
                  </div>
                  <div className="mt-5 max-h-[min(420px,48vh)] space-y-4 overflow-y-auto pr-1">
                    {result.transcript.slice(0, visibleCount).map((m) => (
                      <TranscriptBubble
                        key={m.id}
                        m={m}
                        onReplay={() => {
                          if (m.from === "user") return;
                          void speakGuidance(clipSpeakText(m.content, 200), m.from);
                        }}
                      />
                    ))}
                    <div ref={transcriptEndRef} />
                  </div>
                </div>

                {transcriptDone && (
                  <>
                    <div className="grid gap-3">
                      {result.proposals.map((p) => (
                        <div
                          key={p.agentId}
                          className={`rounded-[22px] bg-white p-4 shadow-[0_8px_24px_-16px_rgba(17,17,17,0.18)] ${
                            p.planId === result.decision.planId ? "ring-2 ring-ink" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-ink">
                              {iconForExpert({ expertId: p.agentId, domain: p.domain })} {p.agentName}
                            </span>
                            <span className="text-[10px] tracking-wide text-ink/40">{p.domain}</span>
                          </div>
                          <div className="mt-2 text-sm font-semibold text-ink">
                            {p.planId === "invented" && p.invented
                              ? `✦ 即兴创作「${p.invented.name}」`
                              : (presets.data?.plans.find((x) => x.id === p.planId)?.name ?? p.planId)}
                          </div>
                          {p.planId === "invented" && p.invented && (
                            <p className="mt-1 text-[11px] leading-relaxed text-ink/55">{p.invented.scene}</p>
                          )}
                          <div className="mt-1 text-[11px] text-ink/50">
                            建议 {p.params.durationMin} min
                            {p.params.breathPattern ? ` · ${p.params.breathPattern}` : ""}
                            {p.params.musicType ? ` · ${p.params.musicType}` : ""}
                          </div>
                          {p.planId === result.decision.planId && (
                            <div className="mt-2 rounded-full bg-mint px-2 py-0.5 text-center text-[10px] font-semibold text-ink">
                              ✓ 被采纳
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {result.conflicts.length > 0 && (
                      <div className="rounded-[24px] border border-clay/25 bg-[#faf0e8] p-5">
                        <span className="label-caps !text-clay">⚡ 专家分歧</span>
                        <div className="mt-3 space-y-3">
                          {result.conflicts.map((c, i) => (
                            <div key={i} className="text-xs leading-relaxed text-ink/70">
                              <span className="font-medium text-clay">【{c.topic}】</span>
                              {c.agents.map((a) => `${a.agentName} 主张 ${a.position}`).join(";")}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div ref={decisionRef} className="scroll-mt-3 rounded-[28px] bg-mint p-6 text-ink">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] tracking-[0.14em] text-ink/45 uppercase">
                          Tuno 的最终决定
                        </span>
                        <span className="rounded-full bg-white/50 px-2.5 py-1 text-[10px] text-ink/55">
                          {result.engine === "rule"
                            ? "规则引擎"
                            : `LLM:${result.engine}`}
                        </span>
                      </div>
                      <h2 className="font-display mt-2 text-2xl font-extrabold">
                        {result.decision.planId === "invented" && (
                          <span className="mr-2 text-base font-semibold text-ink/55">✦ 即兴创作</span>
                        )}
                        {result.decision.planName}
                        <span className="ml-3 text-base font-normal text-ink/55">
                          {result.decision.customized.durationMin} 分钟
                        </span>
                      </h2>

                      <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                        {result.decision.customized.breathPattern && (
                          <span className="rounded-full bg-white/55 px-3 py-1">
                            呼吸:{result.decision.customized.breathPattern}
                          </span>
                        )}
                        {result.decision.customized.musicType && (
                          <span className="rounded-full bg-white/55 px-3 py-1">
                            声学:{result.decision.customized.musicType}
                          </span>
                        )}
                        <span className="rounded-full bg-white/55 px-3 py-1">
                          引导强度:{result.decision.customized.guidanceLevel}
                        </span>
                      </div>

                      <div className="mt-5 space-y-2">
                        {result.decision.customized.phases.map((ph, i) => (
                          <div key={i} className="flex gap-3 text-xs">
                            <span className="w-14 shrink-0 text-ink/40">{ph.minutes} min</span>
                            <div>
                              <span className="font-medium">{ph.name}</span>
                              <span className="ml-2 text-ink/55">{ph.instruction}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/session/${result.decision.planId}`, {
                              state: {
                                customized: result.decision.customized,
                                invented: inventedWinner,
                                goalId: result.goalId,
                                fromA2A: true,
                              },
                            })
                          }
                          className="nf-btn-primary flex w-full items-center justify-between !py-2 !pr-2 !pl-6"
                        >
                          <span>带着这个方案进入训练</span>
                          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-ink">
                            <IconArrow direction="right" />
                          </span>
                        </button>
                        <p className="mt-3 text-center text-[10px] leading-relaxed text-ink/40">
                          以上为身心调节练习建议,不构成医疗诊断或治疗意见;如有持续困扰请寻求专业帮助
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
