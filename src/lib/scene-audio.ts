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

/** 有器乐床轨用 mp3；午憩与摸鱼暂留程序化 wav。清单：docs/agent-lab/mood/scene-bgm-manifest.json */
const SCENE_BGM_SRC: Record<WorkSceneId, string> = {
  "clock-in": "/audio/scenes/clock-in.mp3",
  "post-meet": "/audio/scenes/post-meet.mp3",
  "lunch-tide": "/audio/scenes/lunch-tide.wav",
  overload: "/audio/scenes/overload.mp3",
  "drift-back": "/audio/scenes/drift-back.wav",
  "clock-out": "/audio/scenes/clock-out.mp3",
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
  return SCENE_BGM_SRC[sceneId];
}
