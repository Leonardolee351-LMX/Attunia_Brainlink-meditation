import type { WorkSceneId } from "@/lib/scenes";

/** 场景内训练路径：顺序 + 「何时用」——对齐训练咨询师超载文案。 */
export type ScenePathStep = {
  planId: string;
  role: string;
  when: string;
  /** 主入口 / 建议第一步 */
  primary?: boolean;
};

export const SCENE_PATHS: Partial<Record<WorkSceneId, ScenePathStep[]>> = {
  overload: [
    {
      planId: "grounding-54321",
      role: "先落地",
      when: "脑子开太多窗口、坐不住",
      primary: true,
    },
    {
      planId: "pmr-release",
      role: "松身体",
      when: "身体比脑子更紧",
    },
    {
      planId: "breath-478",
      role: "慢心跳",
      when: "心口热、呼吸浅",
    },
    {
      planId: "imagery-safeplace",
      role: "换通道",
      when: "念头停不下来、需要一个可回的地方",
    },
  ],
  "clock-in": [
    { planId: "breath-box", role: "开始信号", when: "还没坐下做事，需要收拢注意", primary: true },
    { planId: "walk-mindful", role: "边走边热身", when: "人在路上，不适合盯屏" },
    { planId: "breath-bloom", role: "手眼同步", when: "想用按压跟上呼吸" },
  ],
  "clock-out": [
    { planId: "ritual-offwork", role: "切模式", when: "工位和下班之间需要一条线", primary: true },
    { planId: "sound-downshift", role: "降速", when: "脑子还在加班节奏" },
    { planId: "pmr-release", role: "卸紧绷", when: "肩颈还端着" },
    { planId: "scan-progressive", role: "全身交还", when: "想把身体一点点放回自己" },
  ],
};

export function pathForScene(sceneId: WorkSceneId): ScenePathStep[] | null {
  return SCENE_PATHS[sceneId] ?? null;
}

export function pathStepForPlan(sceneId: WorkSceneId, planId: string): ScenePathStep | null {
  const path = pathForScene(sceneId);
  if (!path) return null;
  return path.find((s) => s.planId === planId) ?? null;
}
