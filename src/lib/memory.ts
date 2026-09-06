/**
 * Tuno 的用户记忆：浏览器热缓存 + 服务端 data/user-memory 落盘。
 *
 * 记录点:
 * - 训练完成(SessionPage)→ recordSession → syncMemoryToServer
 * - A2A 会诊出结论(ConsultPage)→ recordConsult → syncMemoryToServer
 * - chat / consult 响应里的 memory 字段 → applyServerMemory
 *
 * 使用点:每次 chat / consult 请求随 body 带给后端；
 * 后端合并磁盘习惯画像与压缩对话，反作用于推荐与思考链路。
 */
import type { ConsultRecord, SessionRecord, UserMemory } from "@contracts/agents";
import { EMPTY_MEMORY, rebuildHabits } from "@contracts/agents";
import { trpcClient } from "@/providers/trpc";

const MEMORY_KEY = "nf2-memory";
const MAX_SESSIONS = 80;
const MAX_CONSULTS = 30;
const MAX_DIGESTS = 40;

export function loadMemory(): UserMemory {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (raw) {
      const m = JSON.parse(raw) as UserMemory;
      return {
        sessions: Array.isArray(m.sessions) ? m.sessions : [],
        consults: Array.isArray(m.consults) ? m.consults : [],
        habits: m.habits,
        chatDigests: Array.isArray(m.chatDigests) ? m.chatDigests : [],
      };
    }
  } catch {
    /* ignore */
  }
  return { ...EMPTY_MEMORY, chatDigests: [] };
}

function save(m: UserMemory) {
  const next: UserMemory = {
    ...m,
    sessions: m.sessions.slice(-MAX_SESSIONS),
    consults: m.consults.slice(-MAX_CONSULTS),
    chatDigests: (m.chatDigests ?? []).slice(-MAX_DIGESTS),
    habits: m.habits ?? (m.sessions.length ? rebuildHabits(m) : undefined),
  };
  localStorage.setItem(MEMORY_KEY, JSON.stringify(next));
}

/** 用服务端合并结果覆盖本地（含习惯 / 压缩对话） */
export function applyServerMemory(m: UserMemory | undefined | null) {
  if (!m) return;
  save({
    sessions: m.sessions ?? [],
    consults: m.consults ?? [],
    habits: m.habits,
    chatDigests: m.chatDigests ?? [],
  });
}

/** 异步落到 data/user-memory/；失败不影响本地体验 */
export async function syncMemoryToServer(memory?: UserMemory) {
  try {
    const merged = await trpcClient.agent.syncMemory.mutate({
      memory: memory ?? loadMemory(),
    });
    applyServerMemory(merged);
    return merged;
  } catch (err) {
    console.warn("[memory] sync failed", err);
    return null;
  }
}

export function recordSession(rec: SessionRecord) {
  const m = loadMemory();
  m.sessions = [...m.sessions, rec].slice(-MAX_SESSIONS);
  m.habits = rebuildHabits(m);
  save(m);
  void syncMemoryToServer(m);
}

export function recordConsult(rec: ConsultRecord) {
  const m = loadMemory();
  m.consults = [...m.consults, rec].slice(-MAX_CONSULTS);
  m.habits = rebuildHabits(m);
  save(m);
  void syncMemoryToServer(m);
}

export function resetMemory() {
  localStorage.removeItem(MEMORY_KEY);
}
