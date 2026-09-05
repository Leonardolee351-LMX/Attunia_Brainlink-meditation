/** 首页输入框：默认进 Conversation；提到新疗法 / 新鲜感 / 高度定制则进 Tuno 会诊。 */

export type HomeIntentRoute = "chat" | "consult";

export type HomeIntentState = {
  prefillMessage?: string;
  autoStart?: boolean;
  intentId?: string;
};

const CUSTOM_CONSULT_MARKERS = [
  "新的疗法",
  "新疗法",
  "新的疗愈",
  "新疗愈",
  "新的练习",
  "新练习",
  "新的方法",
  "新方法",
  "新鲜感",
  "新鲜的",
  "高度定制",
  "定制感",
  "定制方案",
  "量身定制",
  "量身定做",
  "为我量身",
  "专门为我",
  "专属",
  "私人订制",
  "私人定制",
  "个性化",
  "更新奇",
  "更适配",
  "更适合我",
  "新奇",
  "新颖",
  "即兴",
  "没试过",
  "从未试过",
  "试过都没用",
  "多专家",
  "会诊",
  "专家们",
  "创造一个",
  "创作一个",
  "发明一个",
  "特别一点",
  "不一样的",
  "换一种",
];

/** 文案是否在求新鲜感、高度定制或新疗法 → 走 Tuno Multi-Agent 会诊。 */
export function wantsCustomConsult(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return CUSTOM_CONSULT_MARKERS.some((k) => t.includes(k));
}

export function routeHomeIntent(text: string): HomeIntentRoute {
  return wantsCustomConsult(text) ? "consult" : "chat";
}

const consumedIntentIds = new Set<string>();

/** 消费一次首页跳转意图，避免 React Strict Mode 或回退导致重复自动发送。 */
export function takeHomeIntent(state: unknown): string | null {
  const nav = (state ?? {}) as HomeIntentState;
  if (!nav.autoStart) return null;
  const text = nav.prefillMessage?.trim();
  if (!text) return null;
  const id = nav.intentId ?? `msg:${text}`;
  if (consumedIntentIds.has(id)) return null;
  consumedIntentIds.add(id);
  return text;
}

export function makeHomeIntentState(text: string): HomeIntentState {
  return {
    prefillMessage: text.trim(),
    autoStart: true,
    intentId: crypto.randomUUID(),
  };
}
