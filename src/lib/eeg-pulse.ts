/**
 * 对话首页开屏语：
 * - 第一次进入：轮换默认问句（如「现在的状态怎么样？」）
 * - 之后每次再进 Homepage：按当下情绪，主动诱导说工作状态（≤8 字，不含标点）
 */

export type PulseBio = { arousal: number; focus: number; calm: number };

const VISIT_KEY = "nf-chat-home-visits";
const LAST_GREET_KEY = "nf-chat-home-last-greet";

/** 首次打开：默认开屏问句（字数按汉字计，标点不计入） */
export const FIRST_VISIT_GREETINGS = [
  "现在的状态怎么样？",
  "今天感觉如何？",
  "身体还好吗？",
  "想聊聊此刻吗？",
  "现在想说点什么？",
] as const;

/** 再访：按情绪诱导工作状态（≤8 字） */
const WORK_STATE_POOL: { test: (b: PulseBio) => boolean; lines: string[] }[] = [
  { test: (b) => b.arousal >= 78 && b.focus < 45, lines: ["会上还紧着？", "会后静不下来？", "还挂着班吗？"] },
  { test: (b) => b.arousal >= 72, lines: ["工作挂高档？", "还绷着班吗？", "工位上还紧？"] },
  { test: (b) => b.focus >= 75 && b.calm >= 55, lines: ["工作还顺吗？", "正干得起劲？", "专注还在线？"] },
  { test: (b) => b.focus < 40 && b.calm >= 55, lines: ["工作飘了吗？", "工位有点空？", "做事收不住？"] },
  { test: (b) => b.arousal < 42 && b.calm > 50, lines: ["开工有点困？", "上班提不起？", "还困着班吗？"] },
  { test: (b) => b.focus < 42 && b.arousal > 60, lines: ["脑子转不停？", "事太多了吗？", "工作停不下来？"] },
  { test: (b) => b.calm >= 72, lines: ["想收工了吗？", "工作可以放了？", "还要接着干？"] },
];

const WORK_FALLBACK = ["工作还好吗？", "班上怎样了？", "此刻在忙吗？", "想说说工作？"];

/** 旧版分钟推送兼容（≤10 字状态映照） */
const PULSE_POOL: { test: (b: PulseBio) => boolean; lines: string[] }[] = [
  { test: (b) => b.arousal >= 78 && b.focus < 45, lines: ["有点飘着", "心还很快", "先缓一口气"] },
  { test: (b) => b.arousal >= 72, lines: ["还挂着高档", "身体偏醒", "可以落一点"] },
  { test: (b) => b.focus >= 75 && b.calm >= 55, lines: ["注意力在线", "状态挺清", "适合做事"] },
  { test: (b) => b.focus < 40 && b.calm >= 60, lines: ["软软地漂着", "有点放空", "轻轻收一下"] },
  { test: (b) => b.calm >= 72, lines: ["挺安静的", "内里偏软", "可以歇歇"] },
  { test: (b) => b.focus < 42, lines: ["有点散开", "思绪在游", "慢慢拢回来"] },
  { test: (b) => b.arousal < 40 && b.calm > 55, lines: ["偏低能量", "有点困困", "先暖暖身"] },
];
const PULSE_FALLBACK = ["此刻还好", "轻轻在场", "呼吸就好", "不着急呀"];

function hanLen(s: string): number {
  return [...s.replace(/[？?！!。，、\s]/g, "")].length;
}

function clampGreet(s: string, maxHan = 8): string {
  if (hanLen(s) <= maxHan) return s;
  const chars = [...s];
  let n = 0;
  let out = "";
  for (const ch of chars) {
    if (/[？?！!。，、\s]/.test(ch)) {
      out += ch;
      continue;
    }
    if (n >= maxHan) break;
    out += ch;
    n++;
  }
  return out.endsWith("？") || out.endsWith("?") ? out : `${out}？`;
}

function pickLine(lines: readonly string[], salt: number): string {
  return lines[Math.abs(salt) % lines.length]!;
}

function readVisits(): number {
  try {
    const n = Number(localStorage.getItem(VISIT_KEY) ?? "0");
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeVisits(n: number) {
  try {
    localStorage.setItem(VISIT_KEY, String(n));
  } catch {
    /* ignore */
  }
}

export function isFirstHomeVisit(): boolean {
  return readVisits() === 0;
}

/** 记一次进入 Homepage；同一 location.key 只计一次（防 StrictMode 双记） */
const markedEntryKeys = new Set<string>();

export function markHomeVisit(entryKey = "default"): number {
  if (markedEntryKeys.has(entryKey)) return readVisits();
  markedEntryKeys.add(entryKey);
  const next = readVisits() + 1;
  writeVisits(next);
  return next;
}

function compileWorkStatePrompt(bio: PulseBio, salt: number): string {
  const hit = WORK_STATE_POOL.find((p) => p.test(bio));
  const pool = hit?.lines ?? WORK_FALLBACK;
  return clampGreet(pickLine(pool, salt + Math.round(bio.arousal + bio.focus)));
}

function compileFirstPrompt(salt: number): string {
  return clampGreet(pickLine(FIRST_VISIT_GREETINGS, salt), 10);
}

/**
 * 每次进入 Homepage 编译开屏语。
 * firstVisit → 默认问句；否则按脑电诱导工作状态（≤8 字）。
 */
export function compileHomeGreeting(
  bio: PulseBio | null,
  opts?: { visitIndex?: number; forceFirst?: boolean },
): { greeting: string; firstVisit: boolean } {
  const b = bio ?? { arousal: 58, focus: 52, calm: 50 };
  const visitsBefore = opts?.visitIndex ?? readVisits();
  const firstVisit = opts?.forceFirst ?? visitsBefore === 0;
  const salt = Date.now() + Math.round(b.arousal * 3 + b.focus * 5 + b.calm);
  const greeting = firstVisit ? compileFirstPrompt(salt) : compileWorkStatePrompt(b, salt);
  try {
    localStorage.setItem(LAST_GREET_KEY, greeting);
  } catch {
    /* ignore */
  }
  return { greeting, firstVisit };
}

/** @deprecated 分钟推送短句；开屏改用 compileHomeGreeting */
export function compileEegPulse(bio: PulseBio | null, minuteBucket: number): string {
  const b = bio ?? { arousal: 58, focus: 52, calm: 50 };
  const hit = PULSE_POOL.find((p) => p.test(b));
  const pool = hit?.lines ?? PULSE_FALLBACK;
  const line = pickLine(pool, minuteBucket + Math.round(b.arousal + b.focus));
  return line.length > 10 ? line.slice(0, 10) : line;
}
