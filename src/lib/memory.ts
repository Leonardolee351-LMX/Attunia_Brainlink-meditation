/**
 * Tuno 的用户记忆(脚手架阶段存浏览器 localStorage,真实产品应入用户档案)。
 *
 * 记录点:
 * - 训练完成(SessionPage)→ recordSession
 * - A2A 会诊出结论(ConsultPage)→ recordConsult
 *
 * 使用点:每次 chat / consult 请求随 body 带给后端,
 * Tuno 在思考链路里有一步「记忆读取」,并把摘要写进 LLM prompt 与仲裁理由。
 */
import type { ConsultRecord, SessionRecord, UserMemory } from "@contracts/agents";
import { EMPTY_MEMORY } from "@contracts/agents";

const MEMORY_KEY = "nf2-memory";
/** 最多保留的记录条数(防 localStorage 膨胀,最近的记忆也最相关) */
const MAX_SESSIONS = 30;
const MAX_CONSULTS = 10;

export function loadMemory(): UserMemory {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (raw) {
      const m = JSON.parse(raw) as UserMemory;
      return {
        sessions: Array.isArray(m.sessions) ? m.sessions : [],
        consults: Array.isArray(m.consults) ? m.consults : [],
      };
    }
  } catch {
    /* ignore */
  }
  return { ...EMPTY_MEMORY };
}

function save(m: UserMemory) {
  localStorage.setItem(MEMORY_KEY, JSON.stringify(m));
}

export function recordSession(rec: SessionRecord) {
  const m = loadMemory();
  m.sessions = [...m.sessions, rec].slice(-MAX_SESSIONS);
  save(m);
}

export function recordConsult(rec: ConsultRecord) {
  const m = loadMemory();
  m.consults = [...m.consults, rec].slice(-MAX_CONSULTS);
  save(m);
}

export function resetMemory() {
  localStorage.removeItem(MEMORY_KEY);
}
