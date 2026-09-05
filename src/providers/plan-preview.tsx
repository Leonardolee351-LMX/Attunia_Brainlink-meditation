import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { TrainingPlan } from "@contracts/agents";

export type OriginRect = { x: number; y: number; w: number; h: number; radius: number };

export type PlanPreview = {
  plan: TrainingPlan;
  origin: OriginRect;
  sceneId?: string;
};

type Ctx = {
  preview: PlanPreview | null;
  openPlan: (plan: TrainingPlan, el: HTMLElement, sceneId?: string) => void;
  closePlan: () => void;
};

const PlanPreviewContext = createContext<Ctx | null>(null);

export function PlanPreviewProvider({ children }: { children: ReactNode }) {
  const [preview, setPreview] = useState<PlanPreview | null>(null);

  const openPlan = useCallback((plan: TrainingPlan, el: HTMLElement, sceneId?: string) => {
    const frame = el.closest("[data-phone-frame]") ?? document.body;
    const fr = frame.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setPreview({
      plan,
      sceneId,
      origin: {
        x: r.left - fr.left,
        y: r.top - fr.top,
        w: r.width,
        h: r.height,
        radius: 24,
      },
    });
  }, []);

  const closePlan = useCallback(() => setPreview(null), []);

  const value = useMemo(() => ({ preview, openPlan, closePlan }), [preview, openPlan, closePlan]);
  return <PlanPreviewContext.Provider value={value}>{children}</PlanPreviewContext.Provider>;
}

export function usePlanPreview() {
  const ctx = useContext(PlanPreviewContext);
  if (!ctx) throw new Error("usePlanPreview must be inside PlanPreviewProvider");
  return ctx;
}
