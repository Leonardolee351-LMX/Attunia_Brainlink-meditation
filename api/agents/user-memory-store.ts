/**
 * 用户训练史 + 压缩记忆落盘。
 * 目录: data/user-memory/
 * - memory.json        合并后的 UserMemory（含 habits）
 * - sessions/*.jsonl   每次训练追加一行
 * - chat-digest.jsonl  压缩对话追加
 *
 * 不含原始脑电波形；仅计划摘要与对话压缩句。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ChatDigestEntry, SessionRecord, UserMemory } from "@contracts/agents";
import { EMPTY_MEMORY, rebuildHabits } from "@contracts/agents";

const MAX_SESSIONS = 80;
const MAX_CONSULTS = 30;
const MAX_DIGESTS = 40;

function rootDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../data/user-memory");
}

function ensureDirs() {
  const root = rootDir();
  fs.mkdirSync(path.join(root, "sessions"), { recursive: true });
  return root;
}

function sessionKey(s: SessionRecord): string {
  return `${s.at}|${s.planId}|${s.durationMin}`;
}

export function readDiskMemory(): UserMemory {
  const root = ensureDirs();
  const file = path.join(root, "memory.json");
  if (!fs.existsSync(file)) return { ...EMPTY_MEMORY, chatDigests: [] };
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as UserMemory;
    return {
      sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
      consults: Array.isArray(raw.consults) ? raw.consults : [],
      habits: raw.habits,
      chatDigests: Array.isArray(raw.chatDigests) ? raw.chatDigests : [],
    };
  } catch {
    return { ...EMPTY_MEMORY, chatDigests: [] };
  }
}

function writeMemory(m: UserMemory) {
  const root = ensureDirs();
  const withHabits: UserMemory = {
    ...m,
    sessions: m.sessions.slice(-MAX_SESSIONS),
    consults: m.consults.slice(-MAX_CONSULTS),
    chatDigests: (m.chatDigests ?? []).slice(-MAX_DIGESTS),
    habits: rebuildHabits(m),
  };
  fs.writeFileSync(path.join(root, "memory.json"), JSON.stringify(withHabits, null, 2), "utf8");
  return withHabits;
}

function appendSessionLine(rec: SessionRecord) {
  const root = ensureDirs();
  const day = rec.at.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const file = path.join(root, "sessions", `${day}.jsonl`);
  fs.appendFileSync(file, `${JSON.stringify(rec)}\n`, "utf8");
}

function appendDigestLine(entry: ChatDigestEntry) {
  const root = ensureDirs();
  const file = path.join(root, "chat-digest.jsonl");
  fs.appendFileSync(file, `${JSON.stringify(entry)}\n`, "utf8");
}

/** 合并浏览器热缓存与磁盘真相，重算习惯并落盘 */
export function mergeAndPersistMemory(client?: UserMemory | null): UserMemory {
  const disk = readDiskMemory();
  const incoming = client ?? EMPTY_MEMORY;

  const sessionMap = new Map<string, SessionRecord>();
  for (const s of disk.sessions) sessionMap.set(sessionKey(s), s);
  for (const s of incoming.sessions ?? []) sessionMap.set(sessionKey(s), s);
  const sessions = [...sessionMap.values()].sort((a, b) => a.at.localeCompare(b.at));

  const consultMap = new Map<string, (typeof disk.consults)[0]>();
  for (const c of disk.consults) consultMap.set(`${c.at}|${c.planId}`, c);
  for (const c of incoming.consults ?? []) consultMap.set(`${c.at}|${c.planId}`, c);
  const consults = [...consultMap.values()].sort((a, b) => a.at.localeCompare(b.at));

  const digestMap = new Map<string, ChatDigestEntry>();
  for (const d of disk.chatDigests ?? []) digestMap.set(`${d.at}|${d.summary}`, d);
  for (const d of incoming.chatDigests ?? []) digestMap.set(`${d.at}|${d.summary}`, d);
  const chatDigests = [...digestMap.values()].sort((a, b) => a.at.localeCompare(b.at));

  // 追加新 sessions 到按日 jsonl
  const diskKeys = new Set(disk.sessions.map(sessionKey));
  for (const s of sessions) {
    if (!diskKeys.has(sessionKey(s))) appendSessionLine(s);
  }

  return writeMemory({ sessions, consults, chatDigests });
}

/** 追加一条压缩对话，并写回 memory.json */
export function appendChatDigest(entry: ChatDigestEntry, client?: UserMemory | null): UserMemory {
  const merged = mergeAndPersistMemory(client);
  const next: ChatDigestEntry = {
    ...entry,
    summary: entry.summary.slice(0, 160),
  };
  appendDigestLine(next);
  const chatDigests = [...(merged.chatDigests ?? []), next].slice(-MAX_DIGESTS);
  return writeMemory({ ...merged, chatDigests });
}

/** 规则压缩：用户原话 + 推荐结果 → 短记忆（不送原始脑电） */
export function compressChatTurn(input: {
  userMessage: string;
  goalId: string | null;
  planId: string | null;
  planName: string | null;
}): ChatDigestEntry {
  const msg = input.userMessage.replace(/\s+/g, " ").trim().slice(0, 48);
  const goal = input.goalId ? `目标=${input.goalId}` : "目标未定";
  const plan = input.planName || input.planId || "未推荐模块";
  return {
    at: new Date().toISOString(),
    summary: `用户说「${msg}」→ ${goal} → 倾向「${plan}」`,
    goalId: (input.goalId as ChatDigestEntry["goalId"]) ?? null,
    planId: input.planId,
  };
}
