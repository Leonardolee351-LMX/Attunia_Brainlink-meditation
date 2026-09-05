import type { ScoredPlan } from "@contracts/agents";

const CATEGORY_LABEL: Record<string, string> = {
  breathwork: "呼吸调节",
  body_scan: "身体扫描",
  soundscape: "音景疗愈",
  guided_imagery: "引导意象",
  yoga_nidra: "瑜伽休息术",
};

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-[11px] text-ink/50">{label}</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand">
        <div className="h-full rounded-full bg-ink" style={{ width: `${value}%` }} />
      </div>
      <span className="w-8 text-right text-[11px] font-medium text-ink">{value}</span>
    </div>
  );
}

export default function PlanCard({ scored, rank }: { scored: ScoredPlan; rank: number }) {
  const { plan, score, breakdown, why } = scored;
  return (
    <div className="nf-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-medium text-ink">
              {CATEGORY_LABEL[plan.category] ?? plan.category}
            </span>
            <span className="text-[11px] text-ink/40">{plan.durationMin} 分钟</span>
          </div>
          <h4 className="font-display text-lg font-medium text-ink">
            {rank === 0 && <span className="mr-1.5 text-ink">✦</span>}
            {plan.name}
          </h4>
          <p className="mt-0.5 text-xs leading-relaxed text-ink/55">{plan.tagline}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-2xl font-bold text-ink">{score}</div>
          <div className="text-[10px] tracking-wider text-ink/40 uppercase">匹配分</div>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <Bar label="目标亲和" value={breakdown.goalAffinity} />
        <Bar label="状态适配" value={breakdown.stateFit} />
        <Bar label="时长适配" value={breakdown.durationFit} />
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-xs font-semibold text-ink hover:opacity-70">
          推荐理由({why.length} 条)
        </summary>
        <ul className="mt-2 space-y-1 border-l-2 border-mint pl-3">
          {why.map((w, i) => (
            <li key={i} className="text-xs leading-relaxed text-ink/60">{w}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
