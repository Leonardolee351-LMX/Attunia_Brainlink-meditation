/**
 * 评测集加载。当前指向哪一版，只看仓库根目录 eval/CURRENT.json。
 * 换集：改 CURRENT.json 的 dir，不要改跑分代码。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface EvalPointer {
  id: string;
  dir: string;
  note?: string;
}

export function repoRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..");
}

export function loadEvalPointer(root = repoRoot()): EvalPointer {
  const file = path.join(root, "eval", "CURRENT.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as EvalPointer;
  if (!raw?.dir) throw new Error(`eval/CURRENT.json missing dir`);
  return raw;
}

export function evalDir(root = repoRoot()): string {
  const pointer = loadEvalPointer(root);
  return path.resolve(root, "eval", pointer.dir);
}

export function loadJSONL<T = Record<string, unknown>>(filepath: string): T[] {
  const text = fs.readFileSync(filepath, "utf8").trim();
  if (!text) return [];
  return text.split("\n").map((line, i) => {
    try {
      return JSON.parse(line) as T;
    } catch {
      throw new Error(`JSONL parse failed ${filepath}:${i + 1}`);
    }
  });
}

export function loadTimeseries(dir: string): Record<string, unknown>[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
}
