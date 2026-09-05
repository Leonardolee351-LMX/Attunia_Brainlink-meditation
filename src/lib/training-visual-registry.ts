/** 超载四模块 · 前端本地 visual.kind（不改 contracts） */
export type OverloadVisualKind =
  | "ground-stairs"
  | "tense-release-discs"
  | "exhale-triangle"
  | "safe-portal";

export const OVERLOAD_VISUAL: Record<string, OverloadVisualKind> = {
  "grounding-54321": "ground-stairs",
  "pmr-release": "tense-release-discs",
  "breath-478": "exhale-triangle",
  "imagery-safeplace": "safe-portal",
};

export function overloadVisualKind(planId: string | undefined): OverloadVisualKind | null {
  if (!planId) return null;
  return OVERLOAD_VISUAL[planId] ?? null;
}

export const OVERLOAD_CLAY = "#FF6B4A";
export const OVERLOAD_SAGE = "#A8BFB0";
export const OVERLOAD_SAND = "#E8DCC8";
export const OVERLOAD_CREAM = "#F5EDE0";
export const OVERLOAD_INK = "#0c0c0e";
