import type { TrainingPlan } from "@contracts/agents";

export const CATEGORY_LABEL: Record<string, string> = {
  breathwork: "呼吸调节",
  body_scan: "身体扫描",
  soundscape: "音景疗愈",
  guided_imagery: "引导意象",
  yoga_nidra: "瑜伽休息术",
};

/** 卡片只露出封面的一块；展开后看全图。crop 是 object-position。 */
export const PLAN_COVER: Record<string, { crop: string }> = {
  "breath-478": { crop: "30% 78%" },
  "breath-box": { crop: "70% 30%" },
  "scan-progressive": { crop: "50% 20%" },
  "nidra-restore": { crop: "50% 55%" },
  "imagery-safeplace": { crop: "22% 45%" },
  "drift-stars": { crop: "80% 15%" },
  "breath-bloom": { crop: "50% 40%" },
  "sound-downshift": { crop: "50% 85%" },
  "sound-morning": { crop: "40% 18%" },
  "ritual-offwork": { crop: "50% 88%" },
  "ripple-tap": { crop: "65% 60%" },
  "pmr-release": { crop: "25% 50%" },
  "grounding-54321": { crop: "50% 90%" },
  "loving-kindness": { crop: "50% 35%" },
  "coffee-nap": { crop: "48% 70%" },
  "morning-prime": { crop: "50% 10%" },
  "walk-mindful": { crop: "50% 80%" },
};

export function planCoverSrc(planId: string) {
  return `/plans/${planId}.jpg`;
}

export function planCrop(planId: string) {
  return PLAN_COVER[planId]?.crop ?? "50% 40%";
}

export function planPhasesLine(plan: TrainingPlan) {
  return plan.phases.map((p) => `${p.name} ${p.minutes}′`).join(" → ");
}
