import type { GoalId } from "@contracts/agents";

/** 上班族 work-life 六景。只做前端目录，底层训练仍走已有 planId。 */
export type WorkSceneId =
  | "clock-in"
  | "post-meet"
  | "lunch-tide"
  | "overload"
  | "drift-back"
  | "clock-out";

export type ShiftDir = "up" | "down" | "keep";

export interface WorkScene {
  id: WorkSceneId;
  name: string;
  occasion: string;
  hook: string;
  description: string;
  planId: string;
  relatedPlanIds: string[];
  goalHint: GoalId;
  desiredShift: { arousal: ShiftDir; focus: ShiftDir; calm: ShiftDir };
  art: string;
  accent: string;
  dark: boolean;
}

export interface BioHint {
  arousal: number;
  focus: number;
  calm: number;
}

export const WORK_SCENES: WorkScene[] = [
  {
    id: "clock-in",
    name: "开工前奏",
    occasion: "上班前",
    hook: "开工前给注意力热个身",
    description: "还没真正坐下做事。先把散落的注意力收成一个点，给大脑一个清晰的开始信号。",
    planId: "breath-box",
    relatedPlanIds: ["breath-box", "walk-mindful", "breath-bloom"],
    goalHint: "focus",
    desiredShift: { arousal: "keep", focus: "up", calm: "up" },
    art: "/scenes/clock-in.png",
    accent: "#F5E56B",
    dark: false,
  },
  {
    id: "post-meet",
    name: "会后留白",
    occasion: "开完会",
    hook: "先把心跳放下，再走进下一场",
    description: "从会议室走出来，心跳还停在刚才的节奏。先留一寸空白，再决定下一件事。",
    planId: "breath-478",
    relatedPlanIds: ["breath-478", "grounding-54321", "sound-downshift", "breath-bloom"],
    goalHint: "calm",
    desiredShift: { arousal: "down", focus: "keep", calm: "up" },
    art: "/scenes/post-meet.png",
    accent: "#B8F2C9",
    dark: false,
  },
  {
    id: "lunch-tide",
    name: "午憩航道",
    occasion: "午休准备",
    hook: "短短一段恢复，下午不掉线",
    description: "上午的惯性还在往前冲。用一段短恢复把下午的航道清出来，不必睡得很沉。",
    planId: "coffee-nap",
    relatedPlanIds: ["coffee-nap", "nidra-restore", "scan-progressive", "sound-downshift"],
    goalHint: "focus",
    desiredShift: { arousal: "down", focus: "keep", calm: "up" },
    art: "/scenes/lunch-tide.png",
    accent: "#F5E56B",
    dark: false,
  },
  {
    id: "overload",
    name: "超载减负",
    occasion: "脑子过载",
    hook: "脑子绷不住了？先落地",
    description: "太多窗口同时开着。先落地，回到此时此地——不用再上一层认知任务。",
    planId: "grounding-54321",
    relatedPlanIds: ["grounding-54321", "pmr-release", "breath-478", "imagery-safeplace"],
    goalHint: "calm",
    desiredShift: { arousal: "down", focus: "keep", calm: "up" },
    art: "/scenes/overload.png",
    accent: "#FF6B4A",
    dark: false,
  },
  {
    id: "drift-back",
    name: "摸鱼回笼",
    occasion: "走神偷懒",
    hook: "从走神里轻轻滑回工作",
    description: "允许自己漂一会儿。再从涣散里轻轻滑回工作，而不是对自己生气。",
    planId: "ripple-tap",
    relatedPlanIds: ["ripple-tap", "breath-bloom", "walk-mindful", "breath-box"],
    goalHint: "focus",
    desiredShift: { arousal: "keep", focus: "up", calm: "up" },
    art: "/scenes/drift-back.png",
    accent: "#B8F2C9",
    dark: false,
  },
  {
    id: "clock-out",
    name: "下工仪式",
    occasion: "下班后",
    hook: "把工作模式卸下来，切回自己",
    description: "工作模式关机，生活模式开机。给两个自己之间划一条线，而不是把工位带回家里。",
    planId: "ritual-offwork",
    relatedPlanIds: ["ritual-offwork", "sound-downshift", "pmr-release", "scan-progressive"],
    goalHint: "sleep",
    desiredShift: { arousal: "down", focus: "keep", calm: "up" },
    art: "/scenes/clock-out.png",
    accent: "#111111",
    dark: true,
  },
];

export const WORK_SCENE_BY_ID: Record<WorkSceneId, WorkScene> = Object.fromEntries(
  WORK_SCENES.map((s) => [s.id, s]),
) as Record<WorkSceneId, WorkScene>;

const WORK_SCENE_IDS = new Set<string>(WORK_SCENES.map((s) => s.id));

export function isWorkSceneId(value: string | undefined): value is WorkSceneId {
  return !!value && WORK_SCENE_IDS.has(value);
}

/** 旧三目标路由 → 六景，避免书签失效。 */
export const LEGACY_GOAL_TO_SCENE: Record<string, WorkSceneId> = {
  calm: "overload",
  focus: "clock-in",
  sleep: "clock-out",
};

export function resolveWorkSceneId(value: string | undefined): WorkSceneId | null {
  if (isWorkSceneId(value)) return value;
  if (value && LEGACY_GOAL_TO_SCENE[value]) return LEGACY_GOAL_TO_SCENE[value];
  return null;
}

function gaussian(x: number, mu: number, sigma: number) {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z);
}

/**
 * 按一日工作节律 + 可选三通道状态打分。
 * 节点与 DEMO_CLOCK_MARKS 对齐：8 开工 · 11 会后 · 12 午间 · 15 过载 · 16 走神 · 18 下班。
 */
export function recommendWorkScene(hour: number, bio?: BioHint | null): WorkSceneId {
  const scores: Record<WorkSceneId, number> = {
    "clock-in": gaussian(hour, 8.2, 0.95),
    "post-meet": gaussian(hour, 11.0, 0.75),
    "lunch-tide": gaussian(hour, 12.3, 0.7),
    overload: gaussian(hour, 15.0, 0.65),
    "drift-back": gaussian(hour, 16.0, 0.65),
    "clock-out": gaussian(hour, 18.2, 0.95),
  };

  // 软窗口：与时间轴标签一一对应，避免会后窗口吞掉下午过载/走神
  if (hour >= 7.5 && hour < 10) scores["clock-in"] += 0.4;
  if (hour >= 10 && hour < 11.6) scores["post-meet"] += 0.45;
  if (hour >= 11.6 && hour < 13.8) scores["lunch-tide"] += 0.5;
  if (hour >= 13.8 && hour < 15.55) scores.overload += 0.62;
  if (hour >= 15.55 && hour < 17.25) scores["drift-back"] += 0.62;
  if (hour >= 17.25 && hour < 22) scores["clock-out"] += 0.55;
  if (hour >= 22 || hour < 6) scores["clock-out"] += 0.42;

  if (bio) {
    if (bio.arousal >= 68 || (bio.arousal > 60 && bio.calm < 45)) {
      scores.overload += 1.15;
    }
    if (bio.focus <= 48 && hour >= 9 && hour < 18) {
      scores["drift-back"] += 0.85;
    }
    if (bio.arousal >= 62 && bio.focus >= 55 && hour >= 10 && hour < 12) {
      scores["post-meet"] += 0.35;
    }
    if (bio.focus < 55 && hour >= 7 && hour < 10.5) {
      scores["clock-in"] += 0.32;
    }
    if (bio.arousal < 48 && hour >= 11.5 && hour < 14) {
      scores["lunch-tide"] += 0.28;
    }
    if (bio.arousal > 55 && hour >= 17) {
      scores["clock-out"] += 0.38;
    }
  }

  let best: WorkSceneId = "clock-in";
  let bestScore = -1;
  for (const scene of WORK_SCENES) {
    if (scores[scene.id] > bestScore) {
      best = scene.id;
      bestScore = scores[scene.id];
    }
  }
  return best;
}

/** @deprecated 旧三目标封面，仅给尚未改完的调用方。 */
export const SCENE_VISUAL: Record<GoalId, { accent: string; dark: boolean; short: string; art: string }> = {
  calm: { accent: "#FF6B4A", dark: false, short: "减负", art: "/scenes/overload.png" },
  focus: { accent: "#F5E56B", dark: false, short: "开工", art: "/scenes/clock-in.png" },
  sleep: { accent: "#111111", dark: true, short: "下工", art: "/scenes/clock-out.png" },
};

export const SCENE_PLAN: Record<GoalId, string> = {
  calm: "grounding-54321",
  focus: "breath-box",
  sleep: "ritual-offwork",
};

export function isGoalId(value: string | undefined): value is GoalId {
  return value === "calm" || value === "focus" || value === "sleep";
}
