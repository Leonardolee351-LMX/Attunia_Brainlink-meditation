import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { CATEGORY_LABEL, planCoverSrc, planPhasesLine } from "@/lib/plan-covers";
import { ComplianceDisclosure } from "@/components/ComplianceNote";
import { IconArrow } from "@/components/icons/IconArrow";
import { usePlanPreview } from "@/providers/plan-preview";

const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const MS = 520;

/**
 * 训练模块单元页：一屏内完整呈现（封面 + 文案 + 进入），不依赖上下滚动。
 * 免责用 ⓘ 渐进披露，不阻断进入训练。
 */
export default function PlanFlipLayer() {
  const { preview, closePlan } = usePlanPreview();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showCopy, setShowCopy] = useState(false);

  const collapse = useCallback(() => {
    setShowCopy(false);
    setOpen(false);
    window.setTimeout(() => closePlan(), MS);
  }, [closePlan]);

  useEffect(() => {
    if (!preview) {
      setOpen(false);
      setShowCopy(false);
      return;
    }
    setOpen(false);
    setShowCopy(false);
    const a = requestAnimationFrame(() => {
      requestAnimationFrame(() => setOpen(true));
    });
    const b = window.setTimeout(() => setShowCopy(true), 280);
    return () => {
      cancelAnimationFrame(a);
      window.clearTimeout(b);
    };
  }, [preview]);

  useEffect(() => {
    if (!preview) return;
    const scroller = document.querySelector<HTMLElement>("[data-phone-scroll]");
    if (scroller) scroller.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") collapse();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      if (scroller) scroller.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [preview, collapse]);

  if (!preview) return null;
  const { plan, origin } = preview;
  const src = planCoverSrc(plan.id);

  return (
    <div
      className="absolute inset-0 z-[70] flex flex-col overflow-hidden"
      style={{ perspective: 1100 }}
      role="dialog"
      aria-modal
      aria-label={plan.name}
    >
      <div
        className="absolute inset-0 bg-ink/45"
        style={{
          opacity: open ? 1 : 0,
          transition: `opacity ${MS}ms ${EASE}`,
        }}
        onClick={collapse}
      />

      <button
        type="button"
        aria-label="返回"
        onClick={collapse}
        className="absolute top-[max(14px,env(safe-area-inset-top))] left-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-ink shadow-[0_8px_24px_-14px_rgba(17,17,17,0.45)] sm:top-[52px]"
        style={{
          opacity: showCopy ? 1 : 0,
          transition: `opacity 320ms ${EASE}`,
        }}
      >
        <IconArrow direction="left" />
      </button>

      {/* 上半封面：固定约 42% 高度，保证下半文案一屏装下 */}
      <button
        type="button"
        aria-label="收起封面"
        onClick={collapse}
        className="absolute overflow-hidden bg-ink shadow-[0_24px_60px_-24px_rgba(0,0,0,0.55)]"
        style={{
          left: open ? 0 : origin.x,
          top: open ? 0 : origin.y,
          width: open ? "100%" : origin.w,
          height: open ? "42%" : origin.h,
          borderRadius: open ? 0 : origin.radius,
          transform: open ? "rotateY(0deg)" : "rotateY(-16deg)",
          transformOrigin: "left center",
          transition: `left ${MS}ms ${EASE}, top ${MS}ms ${EASE}, width ${MS}ms ${EASE}, height ${MS}ms ${EASE}, border-radius ${MS}ms ${EASE}, transform ${MS}ms ${EASE}`,
        }}
      >
        <img src={src} alt="" className="h-full w-full object-cover object-[50%_42%]" />
      </button>

      {/* 下半信息区：flex 压进剩余高度，禁止滚动 */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 flex flex-col overflow-hidden rounded-t-[28px] bg-cream px-5 pt-4"
        style={{
          top: "40%",
          paddingBottom: "max(14px, env(safe-area-inset-bottom))",
          opacity: showCopy ? 1 : 0,
          transform: showCopy ? "translateY(0)" : "translateY(18px)",
          transition: `opacity 420ms ${EASE}, transform 420ms ${EASE}`,
          pointerEvents: showCopy ? "auto" : "none",
        }}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2">
            <span className="w-fit rounded-full bg-mint px-2.5 py-0.5 text-[10px] font-semibold text-ink">
              {CATEGORY_LABEL[plan.category] ?? plan.category}
            </span>
            <ComplianceDisclosure tone="light" />
          </div>
          <h2 className="font-display mt-2 shrink-0 text-[1.4rem] leading-[1.12] font-extrabold text-ink">
            {plan.name}
          </h2>
          <p className="mt-1.5 shrink-0 text-[13px] leading-snug text-ink/60 line-clamp-2">{plan.subtitle}</p>
          <p className="mt-1 shrink-0 text-[12px] leading-snug text-ink/45 line-clamp-2">{plan.tagline}</p>
          <p className="mt-2 shrink-0 text-[11px] leading-snug text-ink/40 line-clamp-2">
            {planPhasesLine(plan)}
          </p>
          <div className="mt-2 flex shrink-0 flex-wrap gap-1.5">
            {plan.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-ink/55 shadow-[0_6px_16px_-12px_rgba(17,17,17,0.35)]"
              >
                {t}
              </span>
            ))}
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-ink/55">
              {plan.durationMin} 分钟
            </span>
          </div>
        </div>

        <button
          type="button"
          className="nf-btn-primary mt-3 w-full shrink-0 !py-3.5"
          onClick={() => {
            const sceneId = preview.sceneId;
            closePlan();
            navigate(`/session/${plan.id}`, sceneId ? { state: { sceneId } } : undefined);
          }}
        >
          进入训练
        </button>
      </div>
    </div>
  );
}
