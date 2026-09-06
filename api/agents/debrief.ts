/**
 * 赛后解读器 —— 训练结束后,Tuno 主动"思考"刚才那次训练。
 *
 * 输入:隐形记录器在训练过程中采集的 BioSample 流
 * 输出:SessionDebrief(趋势解读 + 友情提示 + 下一步建议)
 *
 * 语气:INFP 气质——柔软、看见、不评判；模板兜底，有 LLM 时再个人化深挖。
 */
import type {
  BioSample,
  GoalId,
  SessionDebrief,
  SessionDebriefStats,
  SessionInsight,
  TrainingPlan,
} from "@contracts/agents";
import { getGoal, PLANS } from "./data/presets";
import { getLLMProvider, type LLMProvider } from "./llm/provider";

function avg(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
}

function std(xs: number[]): number {
  const m = avg(xs);
  return Math.sqrt(avg(xs.map((x) => (x - m) ** 2)));
}

function fmtMin(tSec: number): string {
  const m = Math.floor(tSec / 60);
  return m < 1 ? "第 1 分钟" : `第 ${m} 分钟前后`;
}

function buildStats(
  plan: TrainingPlan,
  goalId: GoalId | null,
  samples: BioSample[],
): {
  stats: SessionDebriefStats;
  deltas: SessionDebrief["deltas"];
  highlights: SessionDebrief["highlights"];
  firstDrop: BioSample | undefined;
  wanderCount: number;
  wanderTimes: number[];
  calmStability: number;
  start: { arousal: number; focus: number; calm: number };
} {
  const n = samples.length;
  const head = samples.slice(0, Math.min(5, n));
  const tail = samples.slice(-Math.min(5, n));
  const start = {
    arousal: avg(head.map((s) => s.arousal)),
    focus: avg(head.map((s) => s.focus)),
    calm: avg(head.map((s) => s.calm)),
  };
  const end = {
    arousal: avg(tail.map((s) => s.arousal)),
    focus: avg(tail.map((s) => s.focus)),
    calm: avg(tail.map((s) => s.calm)),
  };
  const deltas = {
    arousal: Math.round(end.arousal - start.arousal),
    focus: Math.round(end.focus - start.focus),
    calm: Math.round(end.calm - start.calm),
  };

  const firstDrop = samples.find((s) => s.arousal <= start.arousal - 4);
  const calmest = samples.reduce((a, b) => (a.arousal < b.arousal ? a : b));
  let wanderCount = 0;
  const wanderTimes: number[] = [];
  for (let i = 1; i < n; i++) {
    if (
      samples[i - 1].focus - samples[i].focus >= 8 &&
      samples[i].t - (wanderTimes.at(-1) ?? -99) > 20
    ) {
      wanderCount++;
      wanderTimes.push(samples[i].t);
    }
  }
  const calmStability = std(samples.map((s) => s.calm));

  const highlights: SessionDebrief["highlights"] = [
    { label: "唤醒轻轻变了", value: `${deltas.arousal > 0 ? "+" : ""}${deltas.arousal}` },
    { label: "平静轻轻变了", value: `${deltas.calm > 0 ? "+" : ""}${deltas.calm}` },
    { label: "最软的一刻", value: fmtMin(calmest.t) },
  ];
  if (firstDrop) highlights.push({ label: "开始松下来", value: fmtMin(firstDrop.t) });

  const stats: SessionDebriefStats = {
    planName: plan.name,
    durationMin: plan.durationMin,
    goalId,
    sampleCount: n,
    start: {
      arousal: Math.round(start.arousal),
      focus: Math.round(start.focus),
      calm: Math.round(start.calm),
    },
    end: {
      arousal: Math.round(end.arousal),
      focus: Math.round(end.focus),
      calm: Math.round(end.calm),
    },
    deltas,
    calmestMinLabel: fmtMin(calmest.t),
    firstDropMinLabel: firstDrop ? fmtMin(firstDrop.t) : null,
    wanderCount,
    calmStability: Math.round(calmStability * 10) / 10,
  };

  return { stats, deltas, highlights, firstDrop, wanderCount, wanderTimes, calmStability, start };
}

function templateInsights(
  plan: TrainingPlan,
  goalId: GoalId | null,
  deltas: SessionDebrief["deltas"],
  firstDrop: BioSample | undefined,
  wanderCount: number,
  wanderTimes: number[],
  calmStability: number,
): SessionInsight[] {
  const insights: SessionInsight[] = [];
  const goal = goalId ? getGoal(goalId) : null;

  if (deltas.arousal <= -12) {
    insights.push({
      icon: "🌿",
      title: "身体听进去了呀",
      detail: `唤醒悄悄落了 ${-deltas.arousal}。不是你「做对了」，是身体愿意被「${plan.name}」轻轻接住——下次累的时候，可以再来找它。`,
      tone: "good",
    });
  } else if (deltas.arousal > -5) {
    insights.push({
      icon: "🍃",
      title: "今天还在门口张望",
      detail:
        "唤醒没降很多也没关系。也许刚说完话、刚盯过屏幕——身体还需要一点暖场。下次可以先静坐两分钟，再开始，不催自己。",
      tone: "nudge",
    });
  }

  if (firstDrop && firstDrop.t > plan.durationMin * 30) {
    insights.push({
      icon: "⏳",
      title: "放松来得有点晚，很可爱",
      detail: `到${fmtMin(firstDrop.t)}才真正松下来。紧绷的日子里，热身会长一点——多陪几次，它会记得捷径的。`,
      tone: "nudge",
    });
  } else if (firstDrop) {
    insights.push({
      icon: "✨",
      title: "很快就交出去了",
      detail: `${fmtMin(firstDrop.t)}就有放松的信号。今天的你，对练习是敞开的——或者这段节奏刚好贴着你。`,
      tone: "good",
    });
  }

  if (wanderCount > 0) {
    insights.push({
      icon: "🍂",
      title: `走神了 ${wanderCount} 次，挺好的`,
      detail: `${wanderTimes.map(fmtMin).join("、")}飘走过。走神不是翻车——「咦，我又飘了」然后轻轻回来，那一下才是在练的肌肉。`,
      tone: "good",
    });
  }

  if (calmStability < 4 && deltas.calm > 5) {
    insights.push({
      icon: "🌊",
      title: "后半程像一潭静水",
      detail: "平静曲线后半段几乎不晃。适合接着去睡，或去干一件真正想干的事。",
      tone: "good",
    });
  }

  if (deltas.focus >= 10 && goal?.id === "focus") {
    insights.push({
      icon: "🎯",
      title: "注意力被轻轻预热了",
      detail: `专注抬了 ${deltas.focus}。接下来一小会儿，是你的柔软窗口——把难的事轻轻放进去就好。`,
      tone: "good",
    });
  }

  return insights.slice(0, 4);
}

function templateNext(
  deltas: SessionDebrief["deltas"],
  start: { arousal: number },
  plan: TrainingPlan,
  goalId: GoalId | null,
): SessionDebrief["nextSuggestion"] {
  const goal = goalId ? getGoal(goalId) : null;
  if (deltas.arousal > -3 && start.arousal > 70) {
    return {
      planId: null,
      planName: null,
      reason: "这次身体还挂得有点高。要不要让 Tuno & Friends 一起看看，帮你换个更贴的组合？",
      consultSuggested: true,
    };
  }
  const candidates = PLANS.filter((p) => p.id !== plan.id);
  const next =
    goal?.id === "calm"
      ? (candidates.find((p) => p.id === "breath-box") ?? candidates[0])
      : goal?.id === "focus"
        ? (candidates.find((p) => p.id === "sound-morning") ?? candidates[0])
        : (candidates.find((p) => p.id === "nidra-restore") ?? candidates[0]);
  return {
    planId: next.id,
    planName: next.name,
    reason:
      goal?.id === "calm"
        ? "平复之后，专注会更好说话——想的话可以轻轻衔上下一段。"
        : goal?.id === "focus"
          ? "明天开工前再来一次，窗口会越来越稳、也越来越软。"
          : "今晚若想睡得更深，睡前半小时可以再做一段恢复。",
    consultSuggested: false,
  };
}

function templateSummary(plan: TrainingPlan, deltas: SessionDebrief["deltas"]): string {
  const parts: string[] = [];
  if (deltas.arousal < 0) parts.push(`唤醒轻轻落了 ${-deltas.arousal}`);
  if (deltas.calm > 0) parts.push(`平静多了 ${deltas.calm}`);
  if (deltas.focus > 3) parts.push(`专注暖了 ${deltas.focus}`);
  if (parts.length) {
    return `「${plan.name}」这一小段：${parts.join("，")}。你的身体在学一件温柔的事——把自己轻轻交还给自己。`;
  }
  return `「${plan.name}」曲线变化不大，但你还是为自己留了这段空白。这就够可爱了，也够算数。`;
}

function templateDiscovery(stats: SessionDebriefStats): string {
  if (stats.wanderCount > 0) {
    return "有意思的是：走神的那些秒，往往也是你「重新看见自己」的瞬间——大脑并没有掉线，只是在换频道。";
  }
  if (stats.deltas.calm > 8 && stats.deltas.focus < 2) {
    return "平静升得多、专注几乎不动——像是先把身体安顿好，才肯谈效率。这是健康的顺序。";
  }
  if (stats.firstDropMinLabel) {
    return `真正松下来的转折大约在 ${stats.firstDropMinLabel}——可以把那一刻记成「你和练习对上暗号」的地方。`;
  }
  return "这次曲线偏平，像在轻轻试水温。重复几次后，起伏会自己长出来，不用催。";
}

/** 规则模板复盘（兜底） */
function analyzeSessionRules(
  plan: TrainingPlan,
  goalId: GoalId | null,
  samples: BioSample[],
  engine: string,
): SessionDebrief {
  if (samples.length < 3) {
    return {
      summary: "这次待得太短啦，数据还不够让我看清你——下次多陪一会儿，我就能说得更贴。",
      discovery: "短练习也算一次自我关照；下次拉长一点，秘密会多露一点点。",
      deltas: { arousal: 0, focus: 0, calm: 0 },
      highlights: [],
      insights: [],
      nextSuggestion: { planId: null, planName: null, reason: "", consultSuggested: false },
      engine,
    };
  }

  const { stats, deltas, highlights, firstDrop, wanderCount, wanderTimes, calmStability, start } =
    buildStats(plan, goalId, samples);

  return {
    summary: templateSummary(plan, deltas),
    discovery: templateDiscovery(stats),
    deltas,
    highlights,
    insights: templateInsights(
      plan,
      goalId,
      deltas,
      firstDrop,
      wanderCount,
      wanderTimes,
      calmStability,
    ),
    nextSuggestion: templateNext(deltas, start, plan, goalId),
    engine,
  };
}

async function enrichWithLlm(
  llm: LLMProvider,
  base: SessionDebrief,
  stats: SessionDebriefStats,
): Promise<SessionDebrief> {
  if (!llm.composeSessionDebrief) return base;
  const patch = await llm.composeSessionDebrief(stats);
  if (!patch) return base;
  return {
    ...base,
    summary: patch.summary?.trim() || base.summary,
    discovery: patch.discovery?.trim() || base.discovery,
    insights:
      Array.isArray(patch.insights) && patch.insights.length > 0
        ? patch.insights.slice(0, 4).map((ins) => ({
            icon: ins.icon || "✦",
            title: ins.title,
            detail: ins.detail,
            tone: ins.tone === "nudge" ? "nudge" : "good",
          }))
        : base.insights,
    nextSuggestion: {
      ...base.nextSuggestion,
      reason: patch.nextReason?.trim() || base.nextSuggestion.reason,
    },
    engine: llm.name,
  };
}

export async function analyzeSession(
  plan: TrainingPlan,
  goalId: GoalId | null,
  samples: BioSample[],
  llmOverride?: Parameters<typeof getLLMProvider>[0],
): Promise<SessionDebrief> {
  const llm = getLLMProvider(llmOverride);
  const base = analyzeSessionRules(plan, goalId, samples, llm.name);
  if (samples.length < 3) return base;

  try {
    const { stats } = buildStats(plan, goalId, samples);
    return await enrichWithLlm(llm, base, stats);
  } catch (e) {
    console.warn("[debrief] llm enrich failed:", e instanceof Error ? e.message : e);
    return base;
  }
}
