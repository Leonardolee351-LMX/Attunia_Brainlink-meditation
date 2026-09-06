/**
 * 匹配引擎 —— 本项目的核心任务:【用户目标 × 当下可提供的训练计划】的 match。
 *
 * 评分公式(总分 100):
 *   goalAffinity(目标亲和度)  权重 50  —— 这个计划先天适合这个目标吗
 *   stateFit(状态适配度)      权重 30  —— 以用户当下 arousal/calm 衡量
 *   durationFit(时长适配度)   权重 20  —— 用户可用时长能否容纳
 *
 * 设计意图:规则评分永远可解释(breakdown + why),
 * LLM 接入后负责"读懂模糊需求"和"润色理由",但不替代客观分,
 * 保证推荐质量可回归、可评估(AI PM 视角的评估基线)。
 */
import type {
  Goal,
  ScoredPlan,
  TrainingPlan,
  UserState,
} from "@contracts/agents";

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function scoreStateFit(plan: TrainingPlan, state: UserState): { fit: number; why: string[] } {
  const why: string[] = [];
  const [lo, hi] = plan.stateFit.arousalRange;
  let fit: number;

  if (state.arousal >= lo && state.arousal <= hi) {
    // 在适配区间内:越靠近区间中点越好
    const mid = (lo + hi) / 2;
    const halfRange = (hi - lo) / 2 || 1;
    fit = 0.75 + 0.25 * (1 - Math.abs(state.arousal - mid) / halfRange);
    why.push(`当前唤醒度 ${state.arousal} 落在该计划的适配区间 [${lo}, ${hi}]`);
  } else {
    // 超出区间:按距离衰减,再乘计划自带惩罚系数
    const dist = state.arousal < lo ? lo - state.arousal : state.arousal - hi;
    fit = clamp01(1 - dist / 50) * plan.stateFit.outOfRangePenalty;
    why.push(
      state.arousal > hi
        ? `当前唤醒度 ${state.arousal} 偏高,超出该计划适配区间,效果可能打折`
        : `当前唤醒度 ${state.arousal} 偏低,该计划更适合高唤醒状态`,
    );
  }

  if (plan.stateFit.minCalm !== undefined && state.calm < plan.stateFit.minCalm) {
    fit *= 0.6;
    why.push(`冷静基线 ${state.calm} 低于该计划要求的 ${plan.stateFit.minCalm},建议先做降级练习`);
  }

  if (state.sleepHours < 6.5) {
    // 睡眠债:偏恢复类的计划加分、偏激发类的计划由亲和度自然区分
    why.push(`睡眠 ${state.sleepHours}h 存在睡眠债,神经恢复能力受限`);
  }

  return { fit: clamp01(fit), why };
}

function scoreDurationFit(plan: TrainingPlan, state: UserState): { fit: number; why: string[] } {
  const why: string[] = [];
  const avail = state.availableMinutes;

  if (plan.durationMin <= avail) {
    // 计划能完整做完:时长越贴近可用时间利用率越高
    const utilization = plan.durationMin / avail;
    const fit = 0.7 + 0.3 * Math.min(utilization * 1.4, 1);
    why.push(`${plan.durationMin} 分钟可在 ${avail} 分钟窗口内完整完成`);
    return { fit, why };
  }
  // 做不完:按可压缩比例给分,超过 1.5 倍直接不及格
  const ratio = plan.durationMin / avail;
  const fit = ratio > 1.5 ? 0.1 : clamp01(1.2 - ratio * 0.5);
  why.push(`计划需 ${plan.durationMin} 分钟,超出可用 ${avail} 分钟,需压缩或改期`);
  return { fit, why };
}

export function matchPlans(
  goal: Goal,
  state: UserState,
  plans: TrainingPlan[],
  topN = 3,
  /** 最近练过的计划 id:命中则降权,避免反复推荐同一个方法 */
  recentPlanIds?: string[],
  /** 习惯偏好计划 id:轻度加分，让推荐贴合用户 Work-Life 节律习惯 */
  preferredPlanIds?: string[],
): ScoredPlan[] {
  const recent = new Set(recentPlanIds ?? []);
  const preferred = new Set(preferredPlanIds ?? []);
  const scored: ScoredPlan[] = plans.map((plan) => {
    const goalAffinity = plan.goalAffinity[goal.id];
    const { fit: stateFitRaw, why: stateWhy } = scoreStateFit(plan, state);
    const { fit: durationFitRaw, why: durWhy } = scoreDurationFit(plan, state);

    const breakdown = {
      goalAffinity: Math.round(goalAffinity * 100),
      stateFit: Math.round(stateFitRaw * 100),
      durationFit: Math.round(durationFitRaw * 100),
    };
    // 多样性惩罚:最近练过的计划降到 75%,让方法库真正轮转起来
    const repeatPenalty = recent.has(plan.id) ? 0.75 : 1;
    // 习惯加分：长期偏好模块 +8%（与最近降权可叠加，仍可换新）
    const habitBoost = preferred.has(plan.id) ? 1.08 : 1;
    const score = Math.round(
      (goalAffinity * 50 + stateFitRaw * 30 + durationFitRaw * 20) * repeatPenalty * habitBoost,
    );

    const why: string[] = [
      `与目标「${goal.label}」的亲和度 ${breakdown.goalAffinity}%`,
      ...stateWhy,
      ...durWhy,
      ...(repeatPenalty < 1 ? ["最近练过这个模块,本次适度降权,优先尝试新方法"] : []),
      ...(habitBoost > 1 ? ["符合你的训练习惯,轻度优先"] : []),
    ];

    return { plan, score, breakdown, why };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, topN);
}
