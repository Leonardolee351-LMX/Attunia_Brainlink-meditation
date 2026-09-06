/**
 * 工作室演示时钟：覆盖「此刻」小时（支持小数），驱动首页问候与场景推荐。
 * null = 跟真实本地时间。
 * 现阶段时间轴只覆盖上班→下班（不含起床 / 深夜睡觉）。
 */

type Listener = (hour: number, overridden: boolean) => void;

/** 时间轴起止：开工 → 下班 */
export const DEMO_CLOCK_HOUR_MIN = 8;
export const DEMO_CLOCK_HOUR_MAX = 18;

let overrideHour: number | null = null;
const listeners = new Set<Listener>();

function realHour(): number {
  return new Date().getHours();
}

/** 钳在工时内，保留小数（拖动时首页可跟高斯峰即时跳推荐） */
export function clampDemoWorkHour(hour: number): number {
  return Math.min(DEMO_CLOCK_HOUR_MAX, Math.max(DEMO_CLOCK_HOUR_MIN, hour));
}

export function getDemoHour(): number {
  return overrideHour ?? realHour();
}

export function isDemoHourOverridden(): boolean {
  return overrideHour !== null;
}

export function setDemoHour(hour: number | null) {
  if (hour === null) {
    if (overrideHour === null) return;
    overrideHour = null;
  } else {
    const next = Math.round(clampDemoWorkHour(hour) * 20) / 20; // 3 分钟一格，跟手且够细
    if (overrideHour !== null && Math.abs(overrideHour - next) < 0.001) return;
    overrideHour = next;
  }
  const published = getDemoHour();
  listeners.forEach((cb) => cb(published, overrideHour !== null));
}

export function subscribeDemoHour(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** 上班→下班节点（演讲点这些；起床 / 深夜本阶段不做） */
export const DEMO_CLOCK_MARKS: { hour: number; label: string; sceneHint: string }[] = [
  { hour: 8, label: "开工", sceneHint: "上班前" },
  { hour: 11, label: "会后", sceneHint: "开完会" },
  { hour: 12, label: "午间", sceneHint: "午休准备" },
  { hour: 15, label: "过载", sceneHint: "脑子过载" },
  { hour: 16, label: "走神", sceneHint: "走神偷懒" },
  { hour: 18, label: "下班", sceneHint: "下班后" },
];

export function demoHourToTrackRatio(hour: number): number {
  const span = DEMO_CLOCK_HOUR_MAX - DEMO_CLOCK_HOUR_MIN;
  return (clampDemoWorkHour(hour) - DEMO_CLOCK_HOUR_MIN) / span;
}

export function trackRatioToDemoHour(t: number): number {
  const span = DEMO_CLOCK_HOUR_MAX - DEMO_CLOCK_HOUR_MIN;
  const clamped = Math.max(0, Math.min(1, t));
  return clampDemoWorkHour(DEMO_CLOCK_HOUR_MIN + clamped * span);
}

export function formatDemoClock(hour: number): string {
  const h = Math.floor(hour) % 24;
  const m = Math.round((hour - Math.floor(hour)) * 60) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
