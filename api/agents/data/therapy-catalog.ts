/**
 * 现有疗法目录 —— 专家 Agent 的共享知识库。
 *
 * 会诊时每位专家都拿到完整目录(不只是匹配引擎截断后的 top N),
 * 提案必须先对照目录再延展:调参数、改剂量、或在目录不够贴时即兴。
 */
import type { ScoredPlan, TrainingPlan } from "@contracts/agents";
import { PLANS } from "./presets";

export interface TherapyCatalogItem {
  planId: string;
  name: string;
  category: TrainingPlan["category"];
  subtitle: string;
  tagline: string;
  durationMin: number;
  intensity: TrainingPlan["intensity"];
  tags: string[];
  phases: { name: string; minutes: number }[];
  contraindications: string[];
  tunable: TrainingPlan["tunableParams"];
  /** 客观匹配分;未打分时为 null */
  matchScore: number | null;
}

export function catalogItemFromPlan(plan: TrainingPlan, matchScore: number | null = null): TherapyCatalogItem {
  return {
    planId: plan.id,
    name: plan.name,
    category: plan.category,
    subtitle: plan.subtitle,
    tagline: plan.tagline,
    durationMin: plan.durationMin,
    intensity: plan.intensity,
    tags: plan.tags,
    phases: plan.phases.map((p) => ({ name: p.name, minutes: p.minutes })),
    contraindications: plan.contraindications,
    tunable: plan.tunableParams,
    matchScore,
  };
}

/** 完整疗法目录。有 scored 时带上匹配分,没有则按预设顺序。 */
export function buildTherapyCatalog(scored?: ScoredPlan[]): TherapyCatalogItem[] {
  if (scored && scored.length > 0) {
    const byId = new Map(scored.map((s) => [s.plan.id, s]));
    return PLANS.map((plan) => catalogItemFromPlan(plan, byId.get(plan.id)?.score ?? null));
  }
  return PLANS.map((plan) => catalogItemFromPlan(plan));
}

/** 给 LLM / 规则通道共用的压缩目录(控制 prompt 体积) */
export function compactCatalog(items: TherapyCatalogItem[]) {
  return items.map((t) => ({
    planId: t.planId,
    name: t.name,
    category: t.category,
    durationMin: t.durationMin,
    intensity: t.intensity,
    tagline: t.tagline,
    phases: t.phases.map((p) => `${p.name}${p.minutes}′`).join("→"),
    tags: t.tags,
    contraindications: t.contraindications,
    tunable: t.tunable,
    matchScore: t.matchScore,
  }));
}
