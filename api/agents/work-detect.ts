/**
 * 工作态 10 分钟窗检测：超载 → 冥想/减压；走神 → 专注回笼。
 *
 * 不以秒级瞬时跳变触发，只看最近 WINDOW_SEC（默认 600s）内的聚合条件。
 * 规格与边界见 docs/agent-lab/work-detect.md。
 */
import type { BioSample, GoalId } from "@contracts/agents";

export const WORK_DETECT_WINDOW_SEC = 600;
/** 至少要有这么多有效秒才敢报「需要训练」；更短只给 insufficient */
export const WORK_DETECT_MIN_SEC = 120;
/** 两次主动提醒之间的冷静期（秒） */
export const WORK_DETECT_COOLDOWN_SEC = 30 * 60;

export type WorkNeedKind = "none" | "rest" | "focus" | "insufficient";

export type WorkDetectSceneId = "overload" | "drift-back" | "lunch-tide";

export interface WorkDetectSample {
  /** 相对窗口起点的秒；也可用绝对时间差由调用方折算 */
  t: number;
  arousal: number;
  focus: number;
  calm: number;
  /** ThinkGear 信号质量；缺省视为可用 */
  signal?: number;
}

export interface WorkDetectFeatures {
  sampleCount: number;
  spanSec: number;
  coverageRatio: number;
  meanArousal: number;
  meanFocus: number;
  meanCalm: number;
  fracLowFocus: number;
  fracHighFocus: number;
  fracLowCalm: number;
  fracHighArousal: number;
  focusCv: number;
}

export interface WorkDetectResult {
  need: WorkNeedKind;
  /** 给人看的状态名 */
  label: string;
  /** 建议目标：rest→calm，focus→focus */
  goalId: GoalId | null;
  sceneId: WorkDetectSceneId | null;
  planId: string | null;
  reason: string;
  confidence: number;
  windowSec: number;
  features: WorkDetectFeatures;
  /** 是否应弹出提醒（含冷静期与 insufficient 抑制） */
  shouldNotify: boolean;
}

export interface WorkDetectOptions {
  windowSec?: number;
  minSec?: number;
  /** 距上次提醒的秒数；小于冷静期则 shouldNotify=false */
  sinceLastNotifySec?: number;
  cooldownSec?: number;
  /** 工作语境；非工作时段更克制 */
  atWork?: boolean;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function mean(xs: number[]) {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function std(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

/** 只保留窗口内样本，并按 t 排序 */
export function sliceWindow(
  samples: WorkDetectSample[],
  windowSec = WORK_DETECT_WINDOW_SEC,
): WorkDetectSample[] {
  if (samples.length === 0) return [];
  const sorted = [...samples].sort((a, b) => a.t - b.t);
  const end = sorted[sorted.length - 1].t;
  const start = end - windowSec;
  return sorted.filter((s) => s.t >= start);
}

export function computeWorkFeatures(samples: WorkDetectSample[]): WorkDetectFeatures {
  const focus = samples.map((s) => s.focus);
  const calm = samples.map((s) => s.calm);
  const arousal = samples.map((s) => s.arousal);
  const t0 = samples[0]?.t ?? 0;
  const t1 = samples[samples.length - 1]?.t ?? 0;
  const spanSec = Math.max(0, t1 - t0);
  const mFocus = mean(focus);
  return {
    sampleCount: samples.length,
    spanSec,
    coverageRatio: spanSec > 0 ? samples.length / Math.max(spanSec, 1) : 0,
    meanArousal: mean(arousal),
    meanFocus: mFocus,
    meanCalm: mean(calm),
    fracLowFocus: focus.filter((x) => x < 45).length / Math.max(focus.length, 1),
    fracHighFocus: focus.filter((x) => x >= 65).length / Math.max(focus.length, 1),
    fracLowCalm: calm.filter((x) => x < 40).length / Math.max(calm.length, 1),
    fracHighArousal: arousal.filter((x) => x >= 68).length / Math.max(arousal.length, 1),
    focusCv: mFocus > 1e-6 ? std(focus) / mFocus : 0,
  };
}

/**
 * 核心判定（来自 eval/user_data 标签窗经验阈值）：
 * - rest（冥想/减压）：超载——注意力仍在线，但平静偏低、唤醒抬高
 * - focus（专注回笼）：走神——长时间低专注，且不像「困到关机」
 * - none：深度专注带，或证据不足
 */
export function classifyWorkNeed(f: WorkDetectFeatures): {
  need: Exclude<WorkNeedKind, "insufficient">;
  label: string;
  goalId: GoalId | null;
  sceneId: WorkDetectSceneId | null;
  planId: string | null;
  reason: string;
  confidence: number;
} {
  const overloadScore =
    (f.meanArousal >= 60 ? 1 : 0) +
    (f.fracLowCalm >= 0.3 ? 1 : 0) +
    (f.meanFocus >= 45 && f.meanFocus < 62 ? 1 : 0) +
    (f.fracHighArousal >= 0.2 ? 1 : 0) +
    (f.meanFocus >= 48 && f.meanFocus < 60 && f.fracLowCalm >= 0.35 ? 1 : 0) +
    (f.fracHighFocus < 0.4 ? 1 : 0);

  const wanderScore =
    (f.fracLowFocus >= 0.7 ? 2 : f.fracLowFocus >= 0.55 ? 1 : 0) +
    (f.meanFocus < 40 ? 1 : 0) +
    (f.meanFocus < 32 ? 1 : 0) +
    (f.fracHighFocus < 0.15 ? 1 : 0);

  const drowsyScore =
    (f.meanFocus < 25 ? 2 : f.meanFocus < 30 ? 1 : 0) +
    (f.meanCalm >= 60 ? 2 : f.meanCalm >= 55 ? 1 : 0) +
    (f.meanArousal < 48 ? 1 : 0) +
    (f.fracLowFocus >= 0.9 && f.meanCalm >= 50 ? 1 : 0);

  // 深度专注：高专注占比够，即使平静略低也不当成超载打断
  const focusedOk =
    f.meanFocus >= 58 && f.fracHighFocus >= 0.4 && f.fracLowFocus < 0.35;

  if (focusedOk) {
    return {
      need: "none",
      label: "深度专注带",
      goalId: null,
      sceneId: null,
      planId: null,
      reason: "近窗内注意力大多落在专注带，不必打断。",
      confidence: 0.84,
    };
  }

  // 超载：仍在用力，但未进入稳定专注带；平静塌陷
  if (overloadScore >= 4 && f.meanFocus >= 42 && (f.fracHighFocus < 0.45 || f.fracLowCalm >= 0.5)) {
    return {
      need: "rest",
      label: "认知超负荷",
      goalId: "calm",
      sceneId: "overload",
      planId: "grounding-54321",
      reason:
        `近 ${Math.round(f.spanSec / 60)} 分钟唤醒偏高、平静偏低，注意力却还在硬撑——更适合先做减压冥想，而不是再加专注任务。`,
      confidence: clamp(0.55 + overloadScore * 0.07, 0.55, 0.92),
    };
  }

  // 困倦：低专注 + 高平静（或明显低唤醒）
  if (drowsyScore >= 4 && f.meanFocus < 28) {
    return {
      need: "rest",
      label: "困倦走低",
      goalId: "calm",
      sceneId: "lunch-tide",
      planId: "coffee-nap",
      reason: "近窗内注意力持续很低，并伴随困倦型平静/低唤醒，建议短恢复而不是硬拉专注。",
      confidence: clamp(0.5 + drowsyScore * 0.07, 0.5, 0.88),
    };
  }

  if (wanderScore >= 3) {
    return {
      need: "focus",
      label: "工作走神",
      goalId: "focus",
      sceneId: "drift-back",
      planId: "ripple-tap",
      reason:
        `近 ${Math.round(f.spanSec / 60)} 分钟注意力大量落在低专注区，像在工位上漂着——适合一段轻量回笼练习。`,
      confidence: clamp(0.52 + wanderScore * 0.07, 0.52, 0.9),
    };
  }

  return {
    need: "none",
    label: "暂无明确干预",
    goalId: null,
    sceneId: null,
    planId: null,
    reason: "近窗指标未达到超载或走神的持续条件。",
    confidence: 0.45,
  };
}

export function detectWorkNeed(
  samples: WorkDetectSample[],
  opts: WorkDetectOptions = {},
): WorkDetectResult {
  const windowSec = opts.windowSec ?? WORK_DETECT_WINDOW_SEC;
  const minSec = opts.minSec ?? WORK_DETECT_MIN_SEC;
  const cooldownSec = opts.cooldownSec ?? WORK_DETECT_COOLDOWN_SEC;
  const atWork = opts.atWork ?? true;

  const window = sliceWindow(samples, windowSec);
  // 信号极差时剔除（ThinkGear poor >150 常见；缺省保留）
  const usable = window.filter((s) => s.signal == null || s.signal < 150);

  if (usable.length < 30) {
    const features = computeWorkFeatures(usable.length ? usable : window);
    return {
      need: "insufficient",
      label: "样本不足",
      goalId: null,
      sceneId: null,
      planId: null,
      reason: "近窗可用脑电点太少，无法按 10 分钟机制判定。",
      confidence: 0,
      windowSec,
      features,
      shouldNotify: false,
    };
  }

  const features = computeWorkFeatures(usable);
  if (features.spanSec < minSec) {
    return {
      need: "insufficient",
      label: "窗口过短",
      goalId: null,
      sceneId: null,
      planId: null,
      reason: `有效跨度约 ${Math.round(features.spanSec)} 秒，未满 ${minSec} 秒的最低观察窗。`,
      confidence: 0.1,
      windowSec,
      features,
      shouldNotify: false,
    };
  }

  let classified = classifyWorkNeed(features);
  if (!atWork && classified.need !== "none") {
    // 非工位语境：只保留较强超载，抑制走神打扰
    if (classified.need === "focus" || classified.confidence < 0.7) {
      classified = {
        need: "none",
        label: "非工作语境·暂不提醒",
        goalId: null,
        sceneId: null,
        planId: null,
        reason: "当前不在工作语境，且证据未强到需要主动打断。",
        confidence: classified.confidence * 0.5,
      };
    }
  }

  const cooling =
    typeof opts.sinceLastNotifySec === "number" && opts.sinceLastNotifySec < cooldownSec;
  const shouldNotify =
    classified.need !== "none" && classified.need !== "insufficient" && !cooling;

  return {
    ...classified,
    windowSec,
    features,
    shouldNotify,
    reason: cooling
      ? `${classified.reason}（冷静期内，不重复弹窗）`
      : classified.reason,
  };
}

/** 把契约 BioSample 转成检测样本 */
export function bioToWorkSamples(samples: BioSample[]): WorkDetectSample[] {
  return samples.map((s) => ({
    t: s.t,
    arousal: s.arousal,
    focus: s.focus,
    calm: s.calm,
  }));
}
