import { useEffect, useState } from "react";
import type { LLMConfig } from "@contracts/agents";

/**
 * LLM 接入设置。
 * 奇绩（qiji）为产品内置通道，开箱即用；Kimi / MiniMax / Qwen 需用户自备 Key。
 * 用户自填密钥只保存在浏览器 localStorage，随请求转发，服务器不落盘。
 */

const STORAGE_KEY = "nf-llm-config";
const CHANGE_EVENT = "nf-llm-change";

const DEFAULTS: Record<
  "qiji" | "kimi" | "qwen" | "minimax",
  { baseUrl: string; model: string; hint: string }
> = {
  qiji: {
    baseUrl: "https://api.openai-next.com/v1",
    model: "gpt-5.6-sol",
    hint: "产品内置，可留空",
  },
  kimi: {
    baseUrl: "https://api.moonshot.cn/v1",
    model: "kimi-k3",
    hint: "需自备 Moonshot Key",
  },
  minimax: {
    baseUrl: "https://api.minimaxi.com/v1",
    model: "MiniMax-M2",
    hint: "需自备 MiniMax Key",
  },
  qwen: {
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
    hint: "需自备阿里云百炼 Key",
  },
};

/** 系统内置了 Key 的 provider:选中即可用,不用填 */
const BUILTIN_PROVIDERS = ["qiji"] as const;

const PROVIDER_LABEL: Record<string, string> = {
  rule: "规则引擎",
  qiji: "奇绩",
  kimi: "Kimi",
  minimax: "MiniMax",
  qwen: "Qwen",
};

function load(): LLMConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as LLMConfig;
  } catch {
    /* ignore */
  }
  // 从未做过任何选择时:默认使用产品内置奇绩
  return {
    provider: "qiji",
    baseUrl: DEFAULTS.qiji.baseUrl,
    model: DEFAULTS.qiji.model,
  };
}

/** 读取当前生效的 LLM 配置(供请求携带);rule 或无 key 时返回 undefined */
export function useLLMConfig(): LLMConfig | undefined {
  const [cfg, setCfg] = useState<LLMConfig>({ provider: "qiji" });
  useEffect(() => {
    const sync = () => setCfg(load());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  // 显式选择规则引擎时也把 rule 传给服务器,避免被服务端内置默认覆盖
  if (cfg.provider === "rule") return { provider: "rule" };
  const builtin = (BUILTIN_PROVIDERS as readonly string[]).includes(cfg.provider);
  if (!cfg.apiKey && !builtin) return undefined;
  return cfg;
}

export default function LLMSettings({
  defaultOpen = false,
  bare = false,
  forceOpen = false,
}: {
  defaultOpen?: boolean;
  /** Profile 等已拆盒的页面：不要再套一层白卡 */
  bare?: boolean;
  /** 设置整页：默认展开表单，不再套一层折叠 */
  forceOpen?: boolean;
}) {
  const [cfg, setCfg] = useState<LLMConfig>({ provider: "qiji" });
  const [open, setOpen] = useState(defaultOpen || forceOpen);

  useEffect(() => {
    setCfg(load());
  }, []);

  const save = (next: LLMConfig) => {
    setCfg(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  const builtin = (BUILTIN_PROVIDERS as readonly string[]).includes(cfg.provider);
  const active = cfg.provider !== "rule" && (Boolean(cfg.apiKey) || builtin);
  const statusLabel =
    cfg.provider === "rule"
      ? "规则引擎"
      : active
        ? `${PROVIDER_LABEL[cfg.provider]} ${cfg.apiKey ? "已启用" : "(内置)"}`
        : `${PROVIDER_LABEL[cfg.provider]} 待填 Key`;

  const form = (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
        {(
          [
            ["rule", "规则引擎"],
            ["qiji", "奇绩"],
            ["kimi", "Kimi"],
            ["minimax", "MiniMax"],
            ["qwen", "Qwen"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() =>
              save({
                provider: v,
                apiKey: cfg.apiKey,
                ...(v === "rule"
                  ? {}
                  : { baseUrl: DEFAULTS[v].baseUrl, model: DEFAULTS[v].model }),
              })
            }
            className={`rounded-full px-2 py-2 text-xs transition ${
              cfg.provider === v
                ? "bg-ink font-semibold text-white"
                : "bg-cream text-ink/55 hover:bg-mint"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {cfg.provider !== "rule" && (
        <>
          <input
            type="password"
            value={cfg.apiKey ?? ""}
            onChange={(e) => save({ ...cfg, apiKey: e.target.value.trim() })}
            placeholder={`粘贴 API Key(${DEFAULTS[cfg.provider].hint})`}
            className="w-full rounded-xl bg-cream px-3 py-2.5 text-xs outline-none placeholder:text-ink/30 focus:ring-2 focus:ring-ink/15"
          />
          <input
            value={cfg.baseUrl ?? ""}
            onChange={(e) => save({ ...cfg, baseUrl: e.target.value.trim() })}
            placeholder="Base URL"
            className="w-full rounded-xl bg-cream px-3 py-2.5 text-xs outline-none placeholder:text-ink/30 focus:ring-2 focus:ring-ink/15"
          />
          <input
            value={cfg.model ?? ""}
            onChange={(e) => save({ ...cfg, model: e.target.value.trim() })}
            placeholder="模型名"
            className="w-full rounded-xl bg-cream px-3 py-2.5 text-xs outline-none placeholder:text-ink/30 focus:ring-2 focus:ring-ink/15"
          />
        </>
      )}

      <p className="text-[10px] leading-relaxed text-ink/40">
        {active
          ? "意图识别、回复生成、专家提案与仲裁理由将改由 LLM 完成;失败时自动降级回规则引擎,并在思考链路中如实标注。"
          : cfg.provider === "rule"
            ? "内置关键词 + 模板引擎,离线可用。默认推荐「奇绩」(产品内置 Key)。其它厂商需自行填 Key。"
            : builtin
              ? "奇绩通道已内置系统 Key,直接可用;填入自己的 Key 可覆盖(只存在你的浏览器里)。"
              : "填入 API Key 后生效。密钥只存在你的浏览器里,随请求转发,服务器不保存。"}
      </p>
    </div>
  );

  if (forceOpen) {
    return (
      <div className={bare ? "" : "nf-card p-5"}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="label-caps">LLM 接入</span>
          <span
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] ${
              active ? "bg-mint text-ink" : "bg-cream text-ink/45"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-ink" : "bg-ink/25"}`} />
            {statusLabel}
          </span>
        </div>
        {form}
      </div>
    );
  }

  return (
    <div className={bare ? "" : "nf-card p-5"}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between"
      >
        <span className="label-caps">LLM 接入</span>
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] ${
            active ? "bg-mint text-ink" : "bg-cream text-ink/45"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-ink" : "bg-ink/25"}`} />
          {statusLabel}
        </span>
      </button>

      {open && <div className="mt-4">{form}</div>}
    </div>
  );
}
