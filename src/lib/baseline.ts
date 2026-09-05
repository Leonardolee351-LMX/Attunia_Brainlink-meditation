/**
 * 校准基线与启动流程状态(localStorage)。
 * 真实产品中基线存在用户档案里;脚手架阶段存浏览器。
 */

export interface Baseline {
  arousal: number;
  focus: number;
  calm: number;
  calibratedAt: string; // ISO
}

// v2:旧版本遗留的 nf-* 标记会让老用户跳过启动流程,换命名空间使其失效
const BASELINE_KEY = "nf2-baseline";
const ONBOARDED_KEY = "nf2-onboarded";

export function loadBaseline(): Baseline | null {
  try {
    const raw = localStorage.getItem(BASELINE_KEY);
    if (raw) return JSON.parse(raw) as Baseline;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveBaseline(b: Baseline) {
  localStorage.setItem(BASELINE_KEY, JSON.stringify(b));
}

export function isOnboarded(): boolean {
  return localStorage.getItem(ONBOARDED_KEY) === "1";
}

export function markOnboarded() {
  localStorage.setItem(ONBOARDED_KEY, "1");
}

/** 重置启动流程(首页「返回启动界面」时用不到,仅供调试) */
export function resetOnboarding() {
  localStorage.removeItem(ONBOARDED_KEY);
  localStorage.removeItem(BASELINE_KEY);
}
