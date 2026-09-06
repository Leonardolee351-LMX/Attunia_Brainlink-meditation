import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import StatePanel from "@/components/StatePanel";
import PlanMiniCard from "@/components/PlanMiniCard";
import LLMSettings, { useLLMConfig } from "@/components/LLMSettings";
import NovaTrace from "@/components/NovaTrace";
import { trpc } from "@/providers/trpc";
import type { ChatAgentReply, ChatTurn, ComboRecommendation, UserState } from "@contracts/agents";
import { loadBaseline } from "@/lib/baseline";
import { getLiveSnapshot, isLiveHardware } from "@/lib/live-device";
import { applyServerMemory, loadMemory } from "@/lib/memory";
import { loadUserName } from "@/lib/user";
import { CrisisResourceCard, detectCrisis } from "@/components/ComplianceNote";
import type { HomeIntentState } from "@/lib/intent-route";
import { stopGuidance } from "@/lib/tts";
import ChatAgentBackdrop from "@/components/ChatAgentBackdrop";
import AgentThinkingRail from "@/components/AgentThinkingRail";
import ChatBioStatus, { type ChatBioSnapshot } from "@/components/ChatBioStatus";
import { IconArrow } from "@/components/icons/IconArrow";
import { PHONE_BLEED, PHONE_SAFE_TOP } from "@/lib/onboarding-layout";
import { compileHomeGreeting, markHomeVisit } from "@/lib/eeg-pulse";

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

const QUICK_PROMPTS = [
  "刚开完会很累，可是接下来还要工作",
  "好困，但是准备上班了",
  "我感觉我的脑子停不下来",
  "开完会静不下来，有十五分钟",
];

interface Msg extends ChatTurn {
  payload?: ChatAgentReply;
  error?: boolean;
  crisis?: boolean;
  /** 回复生成时的三通道快照，展示在 Tuno 名头与正文之间 */
  bio?: ChatBioSnapshot;
}

function snapBioFromState(state: UserState): ChatBioSnapshot {
  const live = getLiveSnapshot().last;
  if (isLiveHardware() && live) {
    return {
      arousal: Math.round(live.arousal),
      focus: Math.round(live.focus),
      calm: Math.round(live.calm),
      live: true,
    };
  }
  return {
    arousal: Math.round(state.arousal),
    focus: Math.round(state.focus),
    calm: Math.round(state.calm),
    live: false,
  };
}

function comboHeadline(title: string) {
  return title.replace(/\s*·\s*组合方案$/, "");
}

function VoiceIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <rect x="4" y="9" width="2.2" height="6" rx="1.1" />
      <rect x="8.6" y="6" width="2.2" height="12" rx="1.1" />
      <rect x="13.2" y="8" width="2.2" height="8" rx="1.1" />
      <rect x="17.8" y="10" width="2.2" height="4" rx="1.1" />
    </svg>
  );
}

function SendIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M5 12h12" strokeLinecap="round" />
      <path d="M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChatComposer({
  value,
  onChange,
  onSend,
  pending,
  dark,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  pending: boolean;
  dark?: boolean;
}) {
  const hasText = value.trim().length > 0;
  return (
    <div
      className={`flex items-center gap-2 rounded-full px-2 py-1.5 pl-4 ${
        dark
          ? "bg-white/10 ring-1 ring-white/15 backdrop-blur-md"
          : "bg-white shadow-[0_10px_28px_-16px_rgba(17,17,17,0.35)] ring-1 ring-ink/5"
      }`}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSend()}
        placeholder={dark ? "Ask anything…" : "说说你现在的状态或目标…"}
        className={`min-w-0 flex-1 bg-transparent py-2.5 text-[14px] outline-none ${
          dark ? "text-white placeholder:text-white/35" : "text-ink placeholder:text-ink/30"
        }`}
      />
      <button
        type="button"
        disabled={pending || (hasText && !value.trim())}
        onClick={() => {
          if (hasText) onSend();
          /* 语音输入占位：空输入时展示波形 icon，后续再接 ASR */
        }}
        aria-label={hasText ? "发送" : "语音输入"}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-[0.96] ${
          hasText
            ? dark
              ? "bg-white text-ink"
              : "bg-ink text-white"
            : dark
              ? "bg-white/10 text-white/80"
              : "bg-ink/6 text-ink/55"
        }`}
      >
        {hasText ? <SendIcon className="h-5 w-5" /> : <VoiceIcon className="h-5 w-5" />}
      </button>
    </div>
  );
}

function ComboSuggestion({
  combo,
  onStart,
  onConsult,
}: {
  combo: ComboRecommendation;
  onStart: () => void;
  onConsult: () => void;
}) {
  return (
    <div className="mt-4 border-t border-ink/10 pt-4">
      <p className="text-[11px] font-semibold tracking-wide text-ink/40">
        组合方案 · 共 {combo.totalMin} 分钟
      </p>
      <h4 className="font-display mt-1 text-[1.25rem] leading-snug font-bold text-ink">
        {comboHeadline(combo.title)}
      </h4>
      <ol className="mt-3">
        {combo.steps.map((s, i) => (
          <li key={s.planId} className="relative flex gap-3 pb-4 last:pb-0">
            {i < combo.steps.length - 1 && (
              <span className="absolute top-8 left-[13px] h-[calc(100%-18px)] w-px bg-ink/12" aria-hidden />
            )}
            <span className="relative z-[1] mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mint text-[11px] font-bold text-ink">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-display text-[15px] leading-snug font-bold text-ink">{s.name}</span>
                <span className="shrink-0 text-[12px] tabular-nums text-ink/40">{s.minutes} min</span>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" onClick={onStart} className="nf-btn-primary mt-2 inline-flex w-full items-center justify-center gap-2">
        从第一步开始
        <IconArrow direction="right" className="h-4 w-4" />
      </button>
      <button type="button" onClick={onConsult} className="mt-1 min-h-11 w-full text-[13px] font-semibold text-ink/45">
        ✦ 想更定制，交给 Tuno & Friends
      </button>
      <details className="mt-1">
        <summary className="cursor-pointer py-2 text-[11px] text-ink/35 hover:text-ink">为什么这样组合</summary>
        <p className="pb-1 text-[12px] leading-relaxed text-ink/55">{combo.rationale}</p>
      </details>
    </div>
  );
}

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

/** Conversation 设置整页：适配机框高度，顶部返回 */
function ChatSettingsScreen({
  state,
  onChange,
  onBack,
}: {
  state: UserState;
  onChange: (s: UserState) => void;
  onBack: () => void;
}) {
  return (
    <div className={`${PHONE_BLEED} bg-cream`}>
      <div className={`relative z-10 flex min-h-0 flex-1 flex-col px-5 pb-4 ${PHONE_SAFE_TOP}`}>
        <header className="flex shrink-0 items-center gap-2 pb-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-[0_8px_20px_-12px_rgba(17,17,17,0.28)] ring-1 ring-ink/5"
            aria-label="返回对话"
          >
            <IconArrow direction="left" className="h-[18px] w-[18px]" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg font-bold text-ink">对话设置</h1>
            <p className="text-[11px] text-ink/40">LLM 与 NeuroBand 模拟状态</p>
          </div>
        </header>

        <div className="nf-scroll-hide min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pb-2">
          <section className="rounded-[22px] bg-white p-4 shadow-[0_10px_28px_-18px_rgba(17,17,17,0.22)]">
            <LLMSettings bare forceOpen />
          </section>
          <section className="rounded-[22px] bg-white p-4 shadow-[0_10px_28px_-18px_rgba(17,17,17,0.22)]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="label-caps">NeuroBand · 模拟状态</span>
              <span className="flex items-center gap-1.5 text-[10px] text-ink/45">
                <span className="h-1.5 w-1.5 rounded-full bg-ink" />
                本机
              </span>
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
          返回对话
        </button>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [state, setState] = useState<UserState>(defaultState);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [opening, setOpening] = useState(() => {
    const live = getLiveSnapshot().last;
    const bio =
      isLiveHardware() && live
        ? { arousal: live.arousal, focus: live.focus, calm: live.calm }
        : null;
    return compileHomeGreeting(bio).greeting;
  });
  const chat = trpc.agent.chat.useMutation();
  const latestReplyRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const llmConfig = useLLMConfig();
  const userName = loadUserName() || "朋友";

  useEffect(() => () => stopGuidance(), []);

  /** 每次重新进入 Homepage：按当下情绪重编开屏语；第一次用默认问句 */
  useEffect(() => {
    const live = getLiveSnapshot().last;
    const bio =
      isLiveHardware() && live
        ? { arousal: live.arousal, focus: live.focus, calm: live.calm }
        : { arousal: state.arousal, focus: state.focus, calm: state.calm };
    const entryKey = location.key || "home";
    const { greeting } = compileHomeGreeting(bio);
    setOpening(greeting);
    markHomeVisit(entryKey);
    // 只在进入本页时刷新，不跟脑电实时跳字
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const scrollToLatestReply = () => {
    window.setTimeout(() => {
      latestReplyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const send = (text: string) => {
    const msg = text.trim();
    if (!msg || chat.isPending) return;
    const bioSnap = snapBioFromState(state);
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setInput("");
    if (detectCrisis(msg)) {
      setMessages((m) => [...m, { role: "assistant", content: "", crisis: true, bio: bioSnap }]);
      scrollToLatestReply();
      return;
    }
    const history = messages.map(({ role, content }) => ({ role, content }));
    chat.mutate(
      { message: msg, history, state, llm: llmConfig, memory: loadMemory() },
      {
        onSuccess: (reply) => {
          applyServerMemory(reply.memory);
          setMessages((m) => [
            ...m,
            { role: "assistant", content: reply.reply, payload: reply, bio: bioSnap },
          ]);
          scrollToLatestReply();
        },
        onError: (err) => {
          setMessages((m) => [
            ...m,
            {
              role: "assistant",
              content:
                `这一轮处理出错了:${err.message}。` +
                (llmConfig
                  ? "如果你刚填了 API Key,请检查 Key、Base URL 与模型名是否正确;也可以切回「规则引擎」先用着。"
                  : "可能是服务正在冷启动,稍等几秒再发一次试试。"),
              error: true,
              bio: bioSnap,
            },
          ]);
          scrollToLatestReply();
        },
      },
    );
  };

  useEffect(() => {
    const nav = (location.state ?? {}) as HomeIntentState;
    const text = nav.prefillMessage?.trim();
    if (!nav.autoStart || !text) return;
    const timer = window.setTimeout(() => {
      send(text);
      navigate(".", { replace: true, state: {} });
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goConsult = (_goalId: string | null) => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content;
    navigate("/consult", {
      state: { prefillMessage: lastUserMsg ?? "", userState: state },
    });
  };

  const hasStarted = messages.some((m) => m.role === "user");
  const lastAssistantIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return i;
    }
    return -1;
  })();

  if (settingsOpen) {
    return (
      <ChatSettingsScreen
        state={state}
        onChange={setState}
        onBack={() => setSettingsOpen(false)}
      />
    );
  }

  /* —— 首句之前：白底智能体背景顶满机框 —— */
  if (!hasStarted) {
    return (
      <div className={`${PHONE_BLEED} bg-cream`}>
        <ChatAgentBackdrop />
        <div className={`relative z-10 flex min-h-0 flex-1 flex-col px-5 pb-5 ${PHONE_SAFE_TOP}`}>
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13px] text-ink/45">Hello {userName}</p>
              <h1 className="font-display mt-2 max-w-[14ch] text-left text-[1.75rem] leading-snug font-bold text-ink">
                {opening}
              </h1>
              <p className="mt-2 max-w-[30ch] text-left text-[12px] leading-relaxed text-ink/40">
                不知道从哪开口也没关系——点下面一句，或者说说此刻的工作状态。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink/40 transition hover:bg-white/70 hover:text-ink/65"
              aria-label="设置"
              title="设置"
            >
              <SettingsGearIcon className="h-[18px] w-[18px]" />
            </button>
          </div>

          <div className="min-h-0 flex-1" aria-hidden />

          <div className="shrink-0 space-y-3">
            <div className="flex flex-col gap-2">
              {QUICK_PROMPTS.slice(0, 3).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="rounded-[18px] bg-white/90 px-4 py-2.5 text-left text-[12px] leading-snug text-ink/65 shadow-[0_6px_18px_-12px_rgba(17,17,17,0.28)] transition hover:bg-mint"
                >
                  「{q}」
                </button>
              ))}
            </div>
            <ChatComposer
              value={input}
              onChange={setInput}
              onSend={() => send(input)}
              pending={chat.isPending}
            />
          </div>
        </div>
      </div>
    );
  }

  /* —— 对话已开始：同样封顶出血 —— */
  return (
    <div className={`${PHONE_BLEED} bg-cream`}>
      <div className={`relative z-10 flex min-h-0 flex-1 flex-col ${PHONE_SAFE_TOP}`}>
        <header className="flex shrink-0 items-center justify-between px-5 pb-2">
          <p className="text-[13px] font-semibold text-ink">Home</p>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink/40 transition hover:bg-white hover:text-ink/65"
            aria-label="设置"
            title="设置"
          >
            <SettingsGearIcon className="h-[18px] w-[18px]" />
          </button>
        </header>

        <div className="nf-scroll-hide min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 pb-3">
          {messages.map((m, i) => {
            const isLatestAssistant = m.role === "assistant" && i === lastAssistantIdx;
            return (
              <div
                key={i}
                ref={isLatestAssistant ? latestReplyRef : undefined}
                className={m.role === "user" ? "flex justify-end scroll-mt-3" : "scroll-mt-3"}
              >
                <div className={m.role === "user" ? "max-w-[82%]" : "w-full"}>
                  {m.role === "assistant" && (
                    <div className="mb-2 flex items-center gap-1.5">
                      <span className={m.error ? "text-clay" : "text-ink"}>✦</span>
                      <span className={`text-[13px] font-semibold ${m.error ? "text-clay" : "text-ink"}`}>
                        Tuno
                      </span>
                      {m.payload && (
                        <span className="text-[11px] text-ink/35">
                          {m.payload.engine === "rule" ? "规则引擎" : m.payload.engine}
                        </span>
                      )}
                    </div>
                  )}

                  {m.role === "assistant" && m.bio && !m.crisis && <ChatBioStatus bio={m.bio} />}

                  {m.crisis ? (
                    <CrisisResourceCard />
                  ) : (
                    <p
                      className={
                        m.role === "user"
                          ? "rounded-[22px] rounded-br-md bg-ink px-4 py-3 text-[14px] leading-relaxed text-white"
                          : m.error
                            ? "text-[14px] leading-relaxed text-clay"
                            : "text-[14px] leading-[1.65] text-ink"
                      }
                    >
                      {m.content}
                    </p>
                  )}

                  {m.payload?.trace && (
                    <div className="mt-3 border-y border-ink/10 py-1">
                      <NovaTrace steps={m.payload.trace} defaultOpen={false} />
                    </div>
                  )}

                  {m.payload && m.payload.recommendations.length > 0 && (
                    <div className="mt-1">
                      <div className="divide-y divide-ink/10">
                        {m.payload.recommendations.map((r, ri) => (
                          <PlanMiniCard key={r.plan.id} plan={r.plan} rank={ri} variant="strip" />
                        ))}
                      </div>
                      <div className="flex flex-col pt-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/session/${m.payload!.recommendations[0].plan.id}`)}
                          className="nf-btn-primary inline-flex w-full items-center justify-center gap-2"
                        >
                          进入训练 · {m.payload.recommendations[0].plan.name}
                          <IconArrow direction="right" className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => goConsult(m.payload!.intent.goalId)}
                          className="min-h-11 text-[13px] font-semibold text-ink/45"
                        >
                          ✦ 想更定制，交给 Tuno & Friends
                        </button>
                      </div>
                      <details>
                        <summary className="cursor-pointer py-2 text-[11px] text-ink/35 hover:text-ink">
                          为什么推荐这几个
                        </summary>
                        <ul className="space-y-2 pb-1">
                          {m.payload.recommendations.map((r) => (
                            <li key={r.plan.id} className="text-[12px] leading-relaxed text-ink/55">
                              <span className="font-semibold text-ink">{r.plan.name}</span>
                              {r.why[0] ? ` · ${r.why[0]}` : ""}
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  )}

                  {m.payload?.combo && (
                    <ComboSuggestion
                      combo={m.payload.combo}
                      onStart={() => navigate(`/session/${m.payload!.combo!.steps[0].planId}`)}
                      onConsult={() => goConsult(m.payload!.intent.goalId)}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {chat.isPending && (
            <AgentThinkingRail title="Tuno 正在想" className="mt-1" />
          )}
        </div>

        <div className="shrink-0 border-t border-ink/6 bg-cream/95 px-5 pt-3 pb-2 backdrop-blur-sm">
          <ChatComposer
            value={input}
            onChange={setInput}
            onSend={() => send(input)}
            pending={chat.isPending}
          />
        </div>
      </div>
    </div>
  );
}
