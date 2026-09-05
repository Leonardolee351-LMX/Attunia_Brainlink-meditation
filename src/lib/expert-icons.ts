/** 会诊专家领域 → 图标。长键优先，避免「艺术」抢掉「艺术与创作」。 */
export const DOMAIN_ICON: Record<string, string> = {
  脑科学: "◉",
  认知科学: "◈",
  心流体验: "◎",
  心理咨询: "◐",
  艺术与创作: "❋",
  艺术: "❋",
  创作: "❋",
};

export const EXPERT_ICON: Record<string, string> = {
  expert_neuro: "◉",
  expert_cogsci: "◈",
  expert_flow: "◎",
  expert_counsel: "◐",
  expert_art: "❋",
};

export function iconForExpert(opts: { expertId?: string; domain?: string; reason?: string }): string {
  if (opts.expertId && EXPERT_ICON[opts.expertId]) return EXPERT_ICON[opts.expertId];
  if (opts.domain && DOMAIN_ICON[opts.domain]) return DOMAIN_ICON[opts.domain];
  if (opts.reason) {
    const keys = Object.keys(DOMAIN_ICON).sort((a, b) => b.length - a.length);
    for (const d of keys) if (opts.reason.includes(d)) return DOMAIN_ICON[d];
  }
  return "◍";
}
