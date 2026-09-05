import type { GoalId } from "@contracts/agents";
import { WORK_SCENES, isWorkSceneId, type WorkSceneId } from "@/lib/scenes";

const PLAN_TO_SCENE: Record<string, WorkSceneId> = {
  "breath-box": "clock-in",
  "breath-478": "post-meet",
  "coffee-nap": "lunch-tide",
  "grounding-54321": "overload",
  "ripple-tap": "drift-back",
  "ritual-offwork": "clock-out",
};

export function sceneIdForSession(
  planId: string | undefined,
  explicit?: string | null,
  goalHint?: GoalId | null,
): WorkSceneId {
  if (isWorkSceneId(explicit ?? undefined)) return explicit as WorkSceneId;
  if (planId && PLAN_TO_SCENE[planId]) return PLAN_TO_SCENE[planId];
  if (planId) {
    const owning = WORK_SCENES.find((s) => s.relatedPlanIds.includes(planId));
    if (owning) return owning.id;
  }
  if (WORK_SCENES.some((s) => s.id === planId)) return planId as WorkSceneId;
  if (goalHint === "focus") return "clock-in";
  if (goalHint === "sleep") return "clock-out";
  return "overload";
}

export function sceneBgmSrc(sceneId: WorkSceneId): string {
  return `/audio/scenes/${sceneId}.wav`;
}
