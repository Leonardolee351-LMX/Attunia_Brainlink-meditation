/**
 * Client-side rule-engine chat for GitHub Pages (no /api).
 * Keeps dialogue → recommendation → /session/:planId walkable offline.
 */
import type {
  ChatAgentReply,
  ChatTurn,
  GoalId,
  ScoredPlan,
  TrainingPlan,
  UserState,
} from "@contracts/agents";
import { GOALS, PLANS } from "../../api/agents/data/presets";

function pickGoal(text: string): GoalId | null {
  const lower = text.toLowerCase();
  let best: { id: GoalId; n: number } | null = null;
  for (const g of GOALS) {
    let n = 0;
    for (const kw of g.keywords) {
      if (lower.includes(kw.toLowerCase())) n += 1;
    }
    if (n && (!best || n > best.n)) best = { id: g.id, n };
  }
  return best?.id ?? null;
}

function minutesFrom(text: string): number | null {
  const m = text.match(/(\d{1,2})\s*(分钟|min|mins|minute)/i);
  if (m) return Math.min(30, Math.max(3, Number(m[1])));
  if (/短一点|很快|五分钟|5\s*分/.test(text)) return 5;
  if (/十分钟|10\s*分/.test(text)) return 10;
  return null;
}

function scorePlans(goalId: GoalId, minutes: number | null): ScoredPlan[] {
  const scored = PLANS.map((plan) => {
    const aff = plan.goalAffinity?.[goalId] ?? 0.5;
    const dur = minutes
      ? 1 - Math.min(1, Math.abs(plan.durationMin - minutes) / 12)
      : 0.75;
    const score = Math.round(100 * (0.62 * aff + 0.38 * dur));
    const why = [
      `目标亲和：${goalId}`,
      minutes ? `时长接近 ${minutes} 分钟` : "未限定时长，按模块默认时长",
      plan.tagline,
    ];
    return {
      plan,
      score,
      breakdown: { goalAffinity: Math.round(aff * 100), stateFit: 70, durationFit: Math.round(dur * 100) },
      why,
    } satisfies ScoredPlan;
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, 2);
}

export function offlineRuleChat(
  message: string,
  _history: ChatTurn[],
  _state?: UserState,
): ChatAgentReply {
  const goalId = pickGoal(message) ?? "calm";
  const minutes = minutesFrom(message);
  const recommendations = scorePlans(goalId, minutes);
  const top = recommendations[0]!;
  const goalLabel = GOALS.find((g) => g.id === goalId)?.label ?? goalId;
  const reply =
    `我按规则引擎读了你的话（GitHub Pages 静态站无法调用线上 API，因此走离线规则）。` +
    `此刻更贴近「${goalLabel}」。` +
    `推荐先做「${top.plan.name}」约 ${top.plan.durationMin} 分钟——点下方卡片即可进入训练。` +
    (recommendations[1] ? `若想换一条，也可以看「${recommendations[1].plan.name}」。` : "");

  return {
    reply,
    intent: {
      goalId,
      goalIds: [goalId],
      availableMinutes: minutes,
      stateHints: [],
      confidence: 0.72,
    },
    recommendations,
    combo: null,
    followUpQuestion: null,
    engine: "rule",
    trace: [
      {
        key: "intent",
        title: "意图识别（离线规则）",
        detail: `关键词映射 → ${goalLabel}`,
        engine: "rule",
      },
      {
        key: "decision",
        title: "路径决策",
        detail: "静态 Pages 无 Agent API，使用内置疗法目录匹配",
        engine: "rule",
      },
      {
        key: "match",
        title: "匹配计算",
        detail: `Top：${top.plan.name}（${top.score}）`,
        engine: "matching-rules",
      },
      {
        key: "reply",
        title: "回复生成",
        detail: "模板回复 + 可进入训练",
        engine: "rule",
      },
    ],
  };
}
