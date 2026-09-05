import type { RefObject } from "react";
import type { LiveBio } from "@/lib/live-device";
import type { OverloadVisualKind } from "@/lib/training-visual-registry";

export type TrainingVisualProps = {
  kind: OverloadVisualKind;
  phaseIndex: number;
  /** 当前阶段已走过的秒数（墙钟） */
  phaseElapsedSec: number;
  /** 会话总秒数（墙钟） */
  sessionElapsedSec: number;
  running: boolean;
  liveRef: RefObject<Pick<LiveBio, "arousal" | "focus" | "calm"> | null | undefined>;
};

export function useReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function bioNorm(live: Pick<LiveBio, "arousal" | "focus" | "calm"> | null | undefined) {
  const a = (live?.arousal ?? 60) / 100;
  const f = (live?.focus ?? 55) / 100;
  const c = (live?.calm ?? 50) / 100;
  return { arousal: clamp01(a), focus: clamp01(f), calm: clamp01(c) };
}
