import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import StatePanel from "@/components/StatePanel";
import LLMSettings, { useLLMConfig } from "@/components/LLMSettings";
import { trpc } from "@/providers/trpc";
import type { AgentMessage, ConsultResult, IntentAnalysis, UserState } from "@contracts/agents";
import { iconForExpert } from "@/lib/expert-icons";
import { loadBaseline } from "@/lib/baseline";
import { getLiveSnapshot, isLiveHardware } from "@/lib/live-device";
import { applyServerMemory, loadMemory, recordConsult } from "@/lib/memory";
import { streamConsult } from "@/lib/consult-stream";
import { summarizeMemory } from "@contracts/agents";
import type { HomeIntentState } from "@/lib/intent-route";
import { stopGuidance } from "@/lib/tts";
import { IconArrow } from "@/components/icons/IconArrow";
import { PHONE_BLEED, PHONE_SAFE_TOP } from "@/lib/onboarding-layout";
import { TUNO_FRIENDS, TUNO_ROSTER } from "@/lib/tuno-friends";
import AgentThinkingRail from "@/components/AgentThinkingRail";

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

/** Friends 阵容：横排 + 桌面端 6 个图标跳转 + 第 7 张「创建 Agent」占位 */
function FriendsRoster({ compact = false }: { compact?: boolean }) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const cardRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const [activeId, setActiveId] = useState(TUNO_ROSTER[0]?.id ?? "tuno");

  const scrollToFriend = (id: string) => {
    const scroller = scrollerRef.current;
    const card = cardRefs.current[id];
    if (!scroller || !card) return;
    setActiveId(id);
    const left = card.offsetLeft - scroller.clientWidth / 2 + card.clientWidth / 2;
    scroller.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  };

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const onScroll = () => {
      const mid = scroller.scrollLeft + scroller.clientWidth / 2;
      let best = TUNO_ROSTER[0]?.id ?? "tuno";
      let bestDist = Infinity;
      for (const f of TUNO_ROSTER) {
        const el = cardRefs.current[f.id];
        if (!el) continue;
        const center = el.offsetLeft + el.clientWidth / 2;
        const d = Math.abs(center - mid);
        if (d < bestDist) {
          bestDist = d;
          best = f.id;
        }
      }
      setActiveId(best);
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" aria-label="Tuno 与专家阵容">
        {TUNO_ROSTER.map((f) => (
          <span
            key={f.id}
            title={`${f.name} · ${f.role}`}
            className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[12px] ring-1 ring-ink/10"
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
      <ul
        ref={scrollerRef}
        className="-mx-5 mt-3 flex gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TUNO_ROSTER.map((f) => (
          <li
            key={f.id}
            ref={(el) => {
              cardRefs.current[f.id] = el;
            }}
            data-friend-id={f.id}
            className="w-[132px] shrink-0 overflow-hidden rounded-[22px]"
            style={{ background: f.bg }}
          >
            <div className="flex flex-col p-2.5">
              <span className="relative aspect-square w-full overflow-hidden rounded-[16px] shadow-[0_8px_20px_-12px_rgba(17,17,17,0.22)] ring-1 ring-white/50">
                <img src={f.avatar} alt="" className="h-full w-full object-cover" />
              </span>
              <div className="mt-2 min-w-0 px-0.5">
                <p className="font-display truncate text-[13px] font-bold text-ink">
                  <span className="mr-0.5 opacity-70" aria-hidden>
                    {f.icon}
                  </span>
                  {f.name}
                </p>
                <p className="mt-0.5 truncate text-[10px] font-medium" style={{ color: f.accent }}>
                  {f.role}
                </p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-ink/50">{f.blurb}</p>
              </div>
            </div>
          </li>
        ))}

        {/* 第 7 张：创建自己的 Agent（占位） */}
        <li
          className="w-[132px] shrink-0 overflow-hidden rounded-[22px] bg-[#F0F1F4] ring-1 ring-dashed ring-ink/15"
          aria-label="创建自己的 Agent，功能开发中"
        >
          <button
            type="button"
            onClick={() => {
              /* 占位：以后开票做创建 Agent */
            }}
            className="flex h-full w-full flex-col items-stretch p-2.5 text-left"
          >
            <span className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[16px] bg-white/70 ring-1 ring-ink/8">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-ink/25 text-2xl font-light text-ink/35">
                +
              </span>
            </span>
            <div className="mt-2 min-w-0 px-0.5">
              <p className="font-display text-[13px] font-bold text-ink/70">Create</p>
              <p className="mt-0.5 text-[10px] font-medium text-ink/40">自建 Agent</p>
              <p className="mt-1 text-[11px] leading-snug text-ink/35">功能开发中</p>
            </div>
          </button>
        </li>
      </ul>

      {/* 桌面端：六个可点 icon，跳到对应卡片 */}
      <div className="mt-3 hidden justify-center gap-2 sm:flex" role="tablist" aria-label="跳转到 Agent">
        {TUNO_ROSTER.map((f) => {
          const on = activeId === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={on}
              title={f.name}
              aria-label={`查看 ${f.name}`}
              onClick={() => scrollToFriend(f.id)}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-[13px] transition ${
                on
                  ? "bg-ink text-white shadow-[0_8px_18px_-10px_rgba(17,17,17,0.45)]"
                  : "bg-white text-ink/55 ring-1 ring-ink/8 hover:bg-mint"
              }`}
            >
              {f.icon}
            </button>
          );
        })}
        <button
          type="button"
          title="Create · 功能开发中"
          aria-label="创建自己的 Agent，功能开发中"
          onClick={() => {
            const scroller = scrollerRef.current;
            if (!scroller) return;
            scroller.scrollTo({ left: scroller.scrollWidth, behavior: "smooth" });
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-light text-ink/35 ring-1 ring-dashed ring-ink/15 hover:bg-cream"
        >
          +
        </button>
      </div>

      {/* 窄屏：六个小点指示 */}
      <div className="mt-2.5 flex justify-center gap-1.5 sm:hidden" aria-hidden>
        {TUNO_ROSTER.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => scrollToFriend(f.id)}
            className={`h-1.5 rounded-full transition-all ${
              activeId === f.id ? "w-4 bg-ink" : "w-1.5 bg-ink/20"
            }`}
            aria-label={f.name}
          />
        ))}
      </div>
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
        {onReplay ? (
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
        ) : (
          <div
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
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConsultPage() {
  const presets = trpc.agent.presets.useQuery();
  const location = useLocation();
  const navigate = useNavigate();
  const prefill = (location.state ?? {}) as { prefillMessage?: string; userState?: UserState };
  const [message, setMessage] = useState(prefill.prefillMessage ?? "");
  const [state, setState] = useState<UserState>(prefill.userState ?? defaultState());
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** compose 输入 · live SSE 渐进呈现（分析 / 气泡 / 结果边到边出） */
  const [view, setView] = useState<"compose" | "live">("compose");
  const [liveMessages, setLiveMessages] = useState<AgentMessage[]>([]);
  const [liveAnalysis, setLiveAnalysis] = useState<IntentAnalysis | null>(null);
  const [liveLabel, setLiveLabel] = useState<string | null>(null);
  const [result, setResult] = useState<ConsultResult | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const decisionRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const llmConfig = useLLMConfig();

  useEffect(() => {
    if (view !== "live" || liveMessages.length === 0) return;
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [liveMessages.length, view]);

  useEffect(() => {
    if (!result || view !== "live") return;
    window.setTimeout(() => {
      decisionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 200);
  }, [result, view]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      stopGuidance();
    },
    [],
  );

  const resetLive = () => {
    setLiveMessages([]);
    setLiveAnalysis(null);
    setLiveLabel(null);
    setResult(null);
    setStreamError(null);
  };

  const backToCompose = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    resetLive();
    setView("compose");
  };

  const run = (override?: string) => {
    const text = (override ?? message).trim();
    if (!text) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    resetLive();
    setLiveLabel("正在连接会诊…");
    setStreaming(true);
    setView("live");

    void (async () => {
      try {
        const res = await streamConsult(
          {
            message: text,
            state,
            llm: llmConfig,
            memory: loadMemory(),
          },
          {
            signal: ac.signal,
            onEvent: (ev) => {
              if (ac.signal.aborted) return;
              if (ev.type === "phase") {
                setLiveLabel(ev.label?.trim() || null);
              } else if (ev.type === "message" && ev.message) {
                setLiveMessages((prev) => [...prev, ev.message!]);
              } else if (ev.type === "analysis" && ev.analysis) {
                setLiveAnalysis(ev.analysis);
              } else if (ev.type === "result" && ev.result) {
                setResult(ev.result);
                setLiveAnalysis((prev) => prev ?? ev.result!.analysis);
                setLiveMessages((prev) => (prev.length > 0 ? prev : ev.result!.transcript));
                setLiveLabel(null);
              } else if (ev.type === "error") {
                setStreamError(ev.error?.trim() || "会诊出错了");
                setLiveLabel(null);
              }
            },
          },
        );

        if (ac.signal.aborted) return;

        if (res) {
          applyServerMemory(res.memory);
          setResult(res);
          setLiveAnalysis((prev) => prev ?? res.analysis);
          setLiveMessages((prev) => (prev.length > 0 ? prev : res.transcript));
          setLiveLabel(null);
          recordConsult({
            at: new Date().toISOString(),
            goalId: res.goalId,
            planId: res.decision.planId,
            planName: res.decision.planName,
          });
        } else if (!ac.signal.aborted) {
          setStreamError((prev) => prev ?? "会诊未返回完整结果，请重试");
          setLiveLabel(null);
        }
      } catch (err) {
        if (ac.signal.aborted) return;
        const msg = err instanceof Error ? err.message : "会诊请求出错了";
        setStreamError(msg);
        setLiveLabel(null);
      } finally {
        if (abortRef.current === ac) {
          setStreaming(false);
          abortRef.current = null;
        }
      }
    })();
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

  const inventedWinner = result?.proposals.find(
    (p) => p.planId === "invented" && p.invented && result.decision.planId === "invented",
  )?.invented;

  const analysis = liveAnalysis ?? result?.analysis ?? null;
  const streamPending = streaming && !result && !streamError;

  if (settingsOpen) {
    return (
      <ConsultSettingsScreen
        state={state}
        onChange={setState}
        onBack={() => setSettingsOpen(false)}
      />
    );
  }

  /* —— 全屏：SSE 渐进 live —— */
  if (view === "live") {
    return (
      <div className={`${PHONE_BLEED} bg-cream`}>
        <div className={`relative z-10 flex min-h-0 flex-1 flex-col ${PHONE_SAFE_TOP}`}>
          <header className="flex shrink-0 items-center gap-2 px-5 pb-3">
            <button
              type="button"
              onClick={backToCompose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-[0_8px_20px_-12px_rgba(17,17,17,0.28)] ring-1 ring-ink/5"
              aria-label="返回"
            >
              <IconArrow direction="left" className="h-[18px] w-[18px]" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-ink/40">Tuno &amp; Friends</p>
              <h1 className="font-display text-[1.25rem] font-extrabold text-ink">
                {result ? "定制方案" : "会诊进行中"}
              </h1>
            </div>
          </header>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 pb-6">
            <p className="rounded-[20px] bg-white px-4 py-3 text-[14px] leading-relaxed text-ink/70 shadow-[0_10px_28px_-18px_rgba(17,17,17,0.2)]">
              {message.trim() || "（未填写诉求）"}
            </p>

            {streamError ? (
              <div className="rounded-[24px] border border-clay/25 bg-[#faf0e8] p-5 text-left text-[14px] leading-relaxed text-clay">
                <p className="font-semibold">会诊请求出错了</p>
                <p className="mt-2 text-[13px]">
                  {streamError}
                  {llmConfig
                    ? " 请检查 API Key / Base URL；也可切回规则引擎。"
                    : " 可能是服务冷启动，稍后再试。"}
                </p>
                <button type="button" className="nf-btn-primary mt-4 w-full !py-3" onClick={() => run()}>
                  重试
                </button>
                <button
                  type="button"
                  className="mt-2 w-full py-2.5 text-[13px] text-ink/45"
                  onClick={backToCompose}
                >
                  返回修改诉求
                </button>
              </div>
            ) : (
              <>
                {analysis ? (
                  <AnalysisCard analysis={analysis} catalogCount={presets.data?.plans.length} />
                ) : streamPending ? (
                  <AgentThinkingRail
                    className="w-full"
                    title="Tuno & Friends"
                    liveLabel={liveLabel ?? "加载中…"}
                  />
                ) : null}

                {(liveMessages.length > 0 || (streamPending && !!analysis) || !!result) && (
                  <div className="rounded-[24px] bg-white p-5 shadow-[0_10px_28px_-18px_rgba(17,17,17,0.2)]">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="label-caps">会诊记录 · {liveMessages.length} 条消息</span>
                      <span className="text-[10px] text-ink/35">语音暂关 · 仅文字</span>
                    </div>
                    <div className="mt-5 max-h-[min(420px,48vh)] space-y-4 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {liveMessages.map((m) => (
                        <TranscriptBubble key={m.id} m={m} />
                      ))}
                      {streamPending ? (
                        <AgentThinkingRail
                          className="w-full"
                          title="会诊进行中"
                          liveLabel={liveLabel ?? "加载中…"}
                        />
                      ) : null}
                      <div ref={transcriptEndRef} />
                    </div>
                  </div>
                )}

                {result && (
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
                          {result.engine === "rule" ? "规则引擎" : `LLM:${result.engine}`}
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
    );
  }

  /* —— 默认：输入 + Friends 阵容 —— */
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
              disabled={streaming || !message.trim()}
              className="nf-btn-primary mt-3 w-full !py-4"
            >
              <span className="inline-flex items-center justify-center gap-2">
                让 Tuno &amp; Friends 定制
                <IconArrow direction="right" className="h-4 w-4" />
              </span>
            </button>
            <p className="mt-2 text-center text-[11px] text-ink/30">⌘/Ctrl + Enter 也可发起</p>
          </section>

          <div className="mt-5">
            <FriendsRoster />
          </div>
        </div>
      </div>
    </div>
  );
}
