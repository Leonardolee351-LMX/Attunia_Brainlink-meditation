import type { TrainingPlan } from "@contracts/agents";
import { CATEGORY_LABEL, planCoverSrc, planCrop } from "@/lib/plan-covers";
import { usePlanPreview } from "@/providers/plan-preview";

/**
 * 快速训练卡：封面只露出局部。点击后同一张图 flip 展开，再选时长进训。
 * strip 用在对话建议里，避免海报卡再套进白盒。
 */
export default function PlanMiniCard({
  plan,
  rank,
  sceneId,
  variant = "poster",
}: {
  plan: TrainingPlan;
  rank?: number;
  sceneId?: string;
  variant?: "poster" | "strip";
}) {
  const { preview, openPlan } = usePlanPreview();
  const lifted = preview?.plan.id === plan.id;

  if (variant === "strip") {
    return (
      <button
        type="button"
        onClick={(e) => openPlan(plan, e.currentTarget, sceneId)}
        className="flex w-full items-center gap-3 py-2 text-left active:scale-[0.99]"
      >
        <span
          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[16px] bg-ink"
          style={{ visibility: lifted ? "hidden" : "visible" }}
        >
          <img
            src={planCoverSrc(plan.id)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: planCrop(plan.id), transform: "scale(1.28)", transformOrigin: planCrop(plan.id) }}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[15px] leading-snug font-bold text-ink">
            {rank === 0 && <span className="mr-1">✦</span>}
            {plan.name}
          </span>
          <span className="mt-0.5 block text-[12px] text-ink/45">
            {CATEGORY_LABEL[plan.category] ?? plan.category} · {plan.durationMin} min
          </span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => openPlan(plan, e.currentTarget, sceneId)}
      className="group block w-full overflow-hidden rounded-[24px] bg-ink text-left shadow-[0_12px_40px_-18px_rgba(17,17,17,0.28)] transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.99]"
    >
      <div className="relative aspect-[3/4] w-full" style={{ visibility: lifted ? "hidden" : "visible" }}>
        <img
          src={planCoverSrc(plan.id)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            objectPosition: planCrop(plan.id),
            transform: "scale(1.48)",
            transformOrigin: planCrop(plan.id),
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/15" />
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <span className="rounded-full bg-white/18 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur-sm">
            {CATEGORY_LABEL[plan.category] ?? plan.category}
          </span>
          {plan.interactive && (
            <span className="text-[14px] leading-none text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)]" title="交互训练" aria-label="交互训练">
              ⭐
            </span>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 p-3.5">
          <h4 className="font-display text-[15px] leading-snug font-bold text-white">
            {rank === 0 && <span className="mr-1">✦</span>}
            {plan.name}
          </h4>
          <p className="mt-1.5 text-[11px] font-medium text-white/55">{plan.durationMin} min</p>
        </div>
      </div>
    </button>
  );
}
