/**
 * 工作态异常提醒落盘日志（本机 JSONL，不进 git）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { WorkNeedKind } from "./work-detect";

export interface WorkReminderRecord {
  id: string;
  at: string;
  need: WorkNeedKind;
  label: string;
  sceneId: string | null;
  planId: string | null;
  source: "demo" | "live" | "studio";
  line: string;
}

function dataDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../data");
}

function logPath(): string {
  return path.join(dataDir(), "work-reminders.jsonl");
}

export function recordWorkReminder(
  input: Omit<WorkReminderRecord, "id" | "at"> & { at?: string },
): WorkReminderRecord {
  const record: WorkReminderRecord = {
    id: `wr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: input.at ?? new Date().toISOString(),
    need: input.need,
    label: input.label,
    sceneId: input.sceneId,
    planId: input.planId,
    source: input.source,
    line: input.line,
  };
  const dir = dataDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(logPath(), `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

export function listWorkReminders(limit = 50): WorkReminderRecord[] {
  const file = logPath();
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean);
  const rows = lines.map((l) => JSON.parse(l) as WorkReminderRecord);
  return rows.slice(-Math.max(1, limit)).reverse();
}
