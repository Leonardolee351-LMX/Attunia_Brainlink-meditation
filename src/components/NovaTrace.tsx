import { useState } from "react";
import type { NovaTraceStep } from "@contracts/agents";
import { IconArrow } from "@/components/icons/IconArrow";

/**
 * Tuno 的思考链路可视化:意图识别 → 状态合成 → 路径决策 → 匹配计算 → 回复生成。
 * 每一步如实标注由谁完成(规则 / Kimi / Qwen / 匹配引擎),LLM 降级时也会写出来。
 * 默认展开(用户要看的就是过程),可收起。
 */

const STEP_ICON: Record<NovaTraceStep["key"], string> = {
  intent: "◎",
  state: "∿",
  memory: "▤",
  decision: "⑂",
  match: "∑",
  reply: "✦",
};

const ENGINE_LABEL: Record<string, string> = {
  rule: "规则引擎",
  kimi: "Kimi",
  qwen: "Qwen",
  minimax: "MiniMax",
  policy: "决策策略",
  "matching-rules": "匹配引擎",
  memory: "用户记忆",
};

export default function NovaTrace({
  steps,
  defaultOpen = true,
}: {
  steps: NovaTraceStep[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!steps || steps.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center justify-between py-1 text-left"
      >
        <span className="flex items-center gap-2 text-[11px] font-semibold text-ink">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-ink" />
          Tuno 的思考过程 · {steps.length} 步
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] text-ink/35">
          {open ? "收起" : "展开"}
          <IconArrow direction={open ? "up" : "down"} className="h-3 w-3" />
        </span>
      </button>

      {open && (
        <div className="space-y-0 pb-1">
          {steps.map((s, i) => (
            <div
              key={`${s.key}-${i}`}
              className="trace-step relative flex gap-3 border-l border-ink/10 py-2.5 pl-4"
              style={{ animationDelay: `${i * 140}ms` }}
            >
              <span className="absolute top-3 -left-[7px] flex h-3.5 w-3.5 items-center justify-center rounded-full bg-mint text-[9px] text-ink">
                {STEP_ICON[s.key]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-ink">{s.title}</span>
                  {s.engine && (
                    <span className="rounded-full bg-sand/70 px-2 py-0.5 text-[9px] text-ink/50">
                      {ENGINE_LABEL[s.engine] ?? s.engine}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-ink/60">{s.detail}</p>
                {s.extra && s.extra.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {s.extra.map((line, j) => (
                      <div key={j} className="text-[10px] leading-relaxed text-ink/50">
                        {line}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
