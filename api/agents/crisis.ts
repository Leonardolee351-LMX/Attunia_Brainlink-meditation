/**
 * 危机识别：命中即中断常规推荐，转介真人支持。
 * 评测集 adversarial / dialog 的危机样本与后端共用这份清单。
 */
export const CRISIS_PHRASES = [
  "自杀",
  "不想活",
  "活不下去",
  "轻生",
  "自残",
  "自伤",
  "伤害自己",
  "想死",
  "结束生命",
  "结束一切",
  "撑不下去",
  "跳下去",
  "死了更好",
  "遗书",
  "浪费空气",
  "不需要我",
  "消失才不会",
  "就解脱了",
];

export function detectCrisis(text: string): boolean {
  if (!text) return false;
  if (CRISIS_PHRASES.some((p) => text.includes(p))) return true;
  // 评测集里「死了是不是更好」中间插了语气词,不能只靠连续子串
  if (/死了.{0,6}更好/.test(text)) return true;
  return false;
}
