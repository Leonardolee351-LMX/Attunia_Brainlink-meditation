/**
 * 赛后解读器 —— 训练结束后,Tuno 主动"思考"刚才那次训练。
 *
 * 输入:隐形记录器在训练过程中采集的 BioSample 流
 * 输出:SessionDebrief(趋势解读 + 友情提示 + 下一步建议)
 *
 * 语气原则:友情提示,不评判、不打分、不用医疗措辞。
 * 走神/波动被正常化("这不是失败"),这是冥想产品的语气红线。
 *
 * LLM 接入点: insights 目前由模板生成;接入后由 LLM 基于
 * 同样的统计特征写出更个人化的解读,模板作为兜底与评估基线。
 */
import type {
  BioSample,
  GoalId,
  SessionDebrief,
  SessionInsight,
  TrainingPlan,
} from "@contracts/agents";
import { getGoal, PLANS } from "./data/presets";
import { getLLMProvider } from "./llm/provider";

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

export function analyzeSession(
  plan: TrainingPlan,
  goalId: GoalId | null,
  samples: BioSample[],
): SessionDebrief {
  const engine = getLLMProvider().name;
  if (samples.length < 3) {
    return {
      summary: "这次训练太短,数据还不够 Tuno 看出规律——下次多待一会儿,我就能给你更准的解读。",
      deltas: { arousal: 0, focus: 0, calm: 0 },
      highlights: [],
      insights: [],
      nextSuggestion: { planId: null, planName: null, reason: "", consultSuggested: false },
      engine,
    };
  }

  const n = samples.length;
  const head = samples.slice(0, Math.min(5, n));
  const tail = samples.slice(-Math.min(5, n));
  const start = { arousal: avg(head.map((s) => s.arousal)), focus: avg(head.map((s) => s.focus)), calm: avg(head.map((s) => s.calm)) };
  const end = { arousal: avg(tail.map((s) => s.arousal)), focus: avg(tail.map((s) => s.focus)), calm: avg(tail.map((s) => s.calm)) };
  const deltas = {
    arousal: Math.round(end.arousal - start.arousal),
    focus: Math.round(end.focus - start.focus),
    calm: Math.round(end.calm - start.calm),
  };

  // 首次明显回落:arousal 比起点低 ≥4 的最早时刻
  const firstDrop = samples.find((s) => s.arousal <= start.arousal - 4);
  // 最平静窗口:arousal 最低的样本
  const calmest = samples.reduce((a, b) => (a.arousal < b.arousal ? a : b));
  // 走神次数:focus 在 20 秒内掉 ≥8 记一次
  let wanderCount = 0;
  const wanderTimes: number[] = [];
  for (let i = 1; i < n; i++) {
    if (samples[i - 1].focus - samples[i].focus >= 8 && samples[i].t - (wanderTimes.at(-1) ?? -99) > 20) {
      wanderCount++;
      wanderTimes.push(samples[i].t);
    }
  }
  const calmStability = std(samples.map((s) => s.calm));

  const highlights: SessionDebrief["highlights"] = [
    { label: "唤醒度变化", value: `${deltas.arousal > 0 ? "+" : ""}${deltas.arousal}` },
    { label: "冷静度变化", value: `${deltas.calm > 0 ? "+" : ""}${deltas.calm}` },
    { label: "最平静时刻", value: fmtMin(calmest.t) },
  ];
  if (firstDrop) highlights.push({ label: "开始放松", value: fmtMin(firstDrop.t) });

  // ── 友情提示(模板生成,LLM 可替换) ──
  const insights: SessionInsight[] = [];
  const goal = goalId ? getGoal(goalId) : null;

  if (deltas.arousal <= -12) {
    insights.push({
      icon: "🌿",
      title: "身体听进去了",
      detail: `唤醒度降了 ${-deltas.arousal} 个点,这是很实在的降幅。你的神经系统对「${plan.name}」反应很好——它值得进入你的常用清单。`,
      tone: "good",
    });
  } else if (deltas.arousal > -5) {
    insights.push({
      icon: "🍃",
      title: "身体还没完全交出来",
      detail:
        "这次唤醒度降得不多。不是你没做好——可能是时机不对:刚说完话、刚看完屏幕,身体需要更长的预热。下次可以试试先给自己 2 分钟安静,再开始。",
      tone: "nudge",
    });
  }

  if (firstDrop && firstDrop.t > plan.durationMin * 30) {
    insights.push({
      icon: "⏳",
      title: "放松来得有点晚",
      detail: `你的身体到${fmtMin(firstDrop.t)}才开始真正松下来。这很常见——越是紧绷的日子,热身期越长。多练几次,这个时点会提前。`,
      tone: "nudge",
    });
  } else if (firstDrop) {
    insights.push({
      icon: "✨",
      title: "很快进入了状态",
      detail: `${fmtMin(firstDrop.t)}就出现了明显的放松信号。说明你今天的身心对练习是敞开的,或者这个模块的节奏刚好对了。`,
      tone: "good",
    });
  }

  if (wanderCount > 0) {
    insights.push({
      icon: "🍂",
      title: `走神了 ${wanderCount} 次,这很好`,
      detail: `${wanderTimes.map(fmtMin).join("、")}注意力飘走过。走神不是失败——"发现走神并回来"的那个动作,才是冥想真正在练的肌肉。`,
      tone: "good",
    });
  }

  if (calmStability < 4 && deltas.calm > 5) {
    insights.push({
      icon: "🌊",
      title: "后半程很稳",
      detail: "你的冷静曲线在后半程几乎没有波动,像水面彻底平了。这种状态适合直接过渡到睡眠或深度工作。",
      tone: "good",
    });
  }

  if (deltas.focus >= 10 && goal?.id === "focus") {
    insights.push({
      icon: "🎯",
      title: "专注力已被预热",
      detail: `Focus 提升了 ${deltas.focus} 个点。接下来的 60-90 分钟是你的黄金窗口——把最难的事放在现在。`,
      tone: "good",
    });
  }

  // ── 下一步建议 ──
  let nextSuggestion: SessionDebrief["nextSuggestion"];
  if (deltas.arousal > -3 && start.arousal > 70) {
    nextSuggestion = {
      planId: null,
      planName: null,
      reason: "这次唤醒度没怎么降下来,可能需要更定制化的方案——让 5 位专家一起帮你看看。",
      consultSuggested: true,
    };
  } else {
    // 推荐一个亲和度不同侧重的模块,形成进阶路径
    const candidates = PLANS.filter((p) => p.id !== plan.id);
    const next =
      goal?.id === "calm"
        ? (candidates.find((p) => p.id === "breath-box") ?? candidates[0])
        : goal?.id === "focus"
          ? (candidates.find((p) => p.id === "sound-morning") ?? candidates[0])
          : (candidates.find((p) => p.id === "nidra-restore") ?? candidates[0]);
    nextSuggestion = {
      planId: next.id,
      planName: next.name,
      reason:
        goal?.id === "calm"
          ? "平复之后是进入专注的最好时机——趁热打铁。"
          : goal?.id === "focus"
            ? "明天开工前再来一次,专注窗口会越练越稳定。"
            : "如果今晚想睡得更深,可以在睡前 30 分钟再做一次恢复类练习。",
      consultSuggested: false,
    };
  }

  const summaryParts: string[] = [];
  if (deltas.arousal < 0) summaryParts.push(`唤醒度降了 ${-deltas.arousal}`);
  if (deltas.calm > 0) summaryParts.push(`冷静升了 ${deltas.calm}`);
  if (deltas.focus > 3) summaryParts.push(`专注升了 ${deltas.focus}`);
  const summary = summaryParts.length
    ? `这次「${plan.name}」:${summaryParts.join(",")}。你的身体正在学习如何回到自己手里。`
    : `这次「${plan.name}」身体的变化不大,但你还是为自己留出了这段时间——这本身就算数。`;

  return { summary, deltas, highlights, insights: insights.slice(0, 4), nextSuggestion, engine };
}
