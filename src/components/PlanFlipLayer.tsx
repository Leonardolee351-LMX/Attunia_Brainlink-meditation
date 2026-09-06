import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { CATEGORY_LABEL, planCoverSrc, planPhasesLine } from "@/lib/plan-covers";
import { ComplianceDisclosure } from "@/components/ComplianceNote";
import DurationMinutePicker from "@/components/DurationMinutePicker";
import { IconArrow } from "@/components/icons/IconArrow";
import { usePlanPreview } from "@/providers/plan-preview";

const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const MS = 520;

/**
 * 快速训练单元页：一屏封面 + 文案；进入前先选时长，再进 Session。
 */
export default function PlanFlipLayer() {
  const { preview, closePlan } = usePlanPreview();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  const [pickingDuration, setPickingDuration] = useState(false);
  const [durationMin, setDurationMin] = useState(5);

  const collapse = useCallback(() => {
    setShowCopy(false);
    setOpen(false);
    setPickingDuration(false);
    window.setTimeout(() => closePlan(), MS);
  }, [closePlan]);

  useEffect(() => {
    if (!preview) {
      setOpen(false);
      setShowCopy(false);
      setPickingDuration(false);
      return;
    }
    setOpen(false);
    setShowCopy(false);
    setPickingDuration(false);
    setDurationMin(Math.min(30, Math.max(1, preview.plan.durationMin || 5)));
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
      if (e.key === "Escape") {
        if (pickingDuration) setPickingDuration(false);
        else collapse();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      if (scroller) scroller.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [preview, collapse, pickingDuration]);

  if (!preview) return null;
  const { plan, origin } = preview;
  const src = planCoverSrc(plan.id);

  const startSession = () => {
    const sceneId = preview.sceneId;
    const guidanceLevel =
      typeof plan.tunableParams.guidanceLevel === "string"
        ? plan.tunableParams.guidanceLevel
        : "light";
    closePlan();
    setPickingDuration(false);
    navigate(`/session/${plan.id}`, {
      state: {
        ...(sceneId ? { sceneId } : {}),
        customized: {
          durationMin,
          guidanceLevel,
          phases: plan.phases,
          ...(plan.tunableParams.breathPattern
            ? { breathPattern: plan.tunableParams.breathPattern }
            : {}),
          ...(plan.tunableParams.musicType ? { musicType: plan.tunableParams.musicType } : {}),
        },
      },
    });
  };

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
              推荐 {plan.durationMin} 分钟
            </span>
          </div>
        </div>

        <button
          type="button"
          className="nf-btn-primary mt-3 w-full shrink-0 !py-3.5"
          onClick={() => setPickingDuration(true)}
        >
          进入训练
        </button>
      </div>

      {/* 进训前：滑动选择分钟 */}
      {pickingDuration && (
        <div
          className="absolute inset-0 z-30 flex items-end justify-center bg-ink/50"
          role="dialog"
          aria-modal
          aria-label="选择训练时长"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="取消"
            onClick={() => setPickingDuration(false)}
          />
          <div
            className="relative z-10 w-full rounded-t-[28px] bg-cream px-5 pt-5 shadow-[0_-16px_48px_-24px_rgba(0,0,0,0.35)]"
            style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/15" />
            <h3 className="font-display text-center text-[1.15rem] font-extrabold text-ink">
              这次练多久？
            </h3>
            <p className="mt-1 text-center text-[12px] text-ink/45">
              上下滑动选择 · 推荐 {plan.durationMin} 分钟
            </p>
            <div className="mt-2">
              <DurationMinutePicker value={durationMin} onChange={setDurationMin} min={1} max={30} />
            </div>
            <button type="button" className="nf-btn-primary mt-4 w-full !py-3.5" onClick={startSession}>
              开始 {durationMin} 分钟
            </button>
            <button
              type="button"
              className="mt-2 w-full py-2.5 text-[13px] font-medium text-ink/45"
              onClick={() => setPickingDuration(false)}
            >
              返回
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
