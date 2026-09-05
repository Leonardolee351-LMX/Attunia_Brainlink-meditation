/**
 * 从 Markdown 登记表读取 LLM / TTS 配置。
 *
 * 文件约定见 config/llm-apis.md。
 * 优先级: 环境变量 > llm-apis.local.md > llm-apis.md。
 * 密钥文件不进 git。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type LlmKind = "llm" | "tts";

export interface LlmEndpoint {
  id: string;
  kind: LlmKind | string;
  protocol?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  apiKey?: string;
  groupId?: string;
  voiceId?: string;
  extra: Record<string, string>;
}

export interface LlmApiRegistry {
  defaultProvider: "kimi" | "qwen" | "minimax" | "rule";
  endpoints: Record<string, LlmEndpoint>;
}

function repoRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../..");
}

function parseBlocks(markdown: string): Record<string, Record<string, string>> {
  const blocks: Record<string, Record<string, string>> = {};
  let current: string | null = null;
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("# ")) continue;
    const heading = line.match(/^##\s+(\S+)/);
    if (heading) {
      current = heading[1];
      blocks[current] = {};
      continue;
    }
    if (!current || line.startsWith("#") || line.startsWith(">")) continue;
    const kv = line.match(/^([A-Za-z][\w-]*)\s*:\s*(.*)$/);
    if (!kv) continue;
    const value = kv[2].trim();
    if (!value) continue;
    blocks[current][kv[1]] = value;
  }
  return blocks;
}

function toEndpoint(id: string, fields: Record<string, string>): LlmEndpoint {
  const extra = { ...fields };
  const take = (k: string) => {
    const v = extra[k];
    delete extra[k];
    return v;
  };
  const temperatureRaw = take("temperature");
  return {
    id,
    kind: take("kind") ?? "llm",
    protocol: take("protocol"),
    baseUrl: take("baseUrl"),
    model: take("model"),
    temperature: temperatureRaw ? Number(temperatureRaw) : undefined,
    apiKey: take("apiKey"),
    groupId: take("groupId"),
    voiceId: take("voiceId"),
    extra,
  };
}

function merge(
  base: Record<string, Record<string, string>>,
  over: Record<string, Record<string, string>>,
): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = { ...base };
  for (const [id, fields] of Object.entries(over)) {
    out[id] = { ...(out[id] ?? {}), ...fields };
  }
  return out;
}

function readIfExists(file: string): string {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

let cached: LlmApiRegistry | null = null;

export function loadLlmApiRegistry(root = repoRoot()): LlmApiRegistry {
  if (cached) return cached;
  const dir = path.join(root, "config");
  const blocks = merge(
    parseBlocks(readIfExists(path.join(dir, "llm-apis.md"))),
    parseBlocks(readIfExists(path.join(dir, "llm-apis.local.md"))),
  );

  const defaultRaw = (blocks.default?.provider ?? "rule").toLowerCase();
  const defaultProvider = (
    ["kimi", "qwen", "minimax", "rule"].includes(defaultRaw) ? defaultRaw : "rule"
  ) as LlmApiRegistry["defaultProvider"];

  const endpoints: Record<string, LlmEndpoint> = {};
  for (const [id, fields] of Object.entries(blocks)) {
    if (id === "default") continue;
    endpoints[id] = toEndpoint(id, fields);
  }

  // env 覆盖语言 LLM
  if (process.env.LLM_API_KEY) {
    const id = (process.env.LLM_PROVIDER ?? defaultProvider) as string;
    if (id && id !== "rule") {
      endpoints[id] = {
        ...(endpoints[id] ?? { id, kind: "llm", extra: {} }),
        apiKey: process.env.LLM_API_KEY,
        baseUrl: process.env.LLM_BASE_URL ?? endpoints[id]?.baseUrl,
        model: process.env.LLM_MODEL ?? endpoints[id]?.model,
      };
    }
  }
  if (process.env.MINIMAX_API_KEY && endpoints.minimax) {
    endpoints.minimax = { ...endpoints.minimax, apiKey: process.env.MINIMAX_API_KEY };
  }
  if (process.env.MINIMAX_GROUP_ID) {
    const tts = endpoints["minimax-tts"] ?? { id: "minimax-tts", kind: "tts", extra: {} };
    endpoints["minimax-tts"] = { ...tts, groupId: process.env.MINIMAX_GROUP_ID };
  }

  cached = { defaultProvider, endpoints };
  return cached;
}

/** 测试时可清缓存 */
export function resetLlmApiRegistry(): void {
  cached = null;
}

export function llmEndpoint(id: string): LlmEndpoint | undefined {
  return loadLlmApiRegistry().endpoints[id];
}
