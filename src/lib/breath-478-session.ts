/** breath-478 前端会话覆写（API presets 仍可能是 6′，产品要 2′ 循环） */
export const BREATH_478_CYCLE_MIN = 2;
/** 引导词播完后，仅这段窗口内跟拍「吸气/屏住/呼气」 */
export const BREATH_478_CUE_WINDOW_MS = 20_000;

export const BREATH_478_CYCLE_SEC = 19;
export const BREATH_478_INHALE = 4;
export const BREATH_478_HOLD = 7;
export const BREATH_478_EXHALE = 8;

export type Breath478Seg = "inhale" | "hold" | "exhale";

export function breath478SegAt(phaseElapsedSec: number): Breath478Seg {
  const ct = ((phaseElapsedSec % BREATH_478_CYCLE_SEC) + BREATH_478_CYCLE_SEC) % BREATH_478_CYCLE_SEC;
  if (ct < BREATH_478_INHALE) return "inhale";
  if (ct < BREATH_478_INHALE + BREATH_478_HOLD) return "hold";
  return "exhale";
}

export function breath478CueText(seg: Breath478Seg): string {
  if (seg === "inhale") return "吸气";
  if (seg === "hold") return "屏住";
  return "呼气";
}

export function patchBreath478Phases<T extends { name: string; minutes: number }>(phases: T[]): T[] {
  return phases.map((p, i) => {
    if (i === 1 || /4-7-8|循环/.test(p.name)) {
      return { ...p, minutes: BREATH_478_CYCLE_MIN };
    }
    return p;
  });
}
