/**
 * 单 Agent(对话式推荐)—— 本地 Agent 脚手架。
 *
 * 流程:对话 → 意图抽取(LLMProvider.extractIntent)
 *      → 上下文合成(对话线索修正模拟状态)
 *      → 匹配引擎(matchPlans)→ 模板/LLM 回复
 *
 * 设计要点:
 * - 低置信度时追问,而不是瞎猜(可解释 > 显得聪明)
 * - 状态来自"模拟 NeuroBand",对话中的状态线索只修正不覆盖
 * - 与 A2A 共用同一个匹配引擎,保证两条路径结论一致
 */
import type {
  ChatAgentReply,
  ChatTurn,
  ComboRecommendation,
  ExtractedIntent,
  GoalId,
  LLMConfig,
  NovaTraceStep,
  UserMemory,
  UserState,
} from "@contracts/agents";
import { getGoal, GOALS, PLANS } from "./data/presets";
import { matchPlans } from "./matching/engine";
import { getLLMProvider, OpenAICompatibleProvider } from "./llm/provider";
import { memoryToText, recentPlanIds, summarizeMemory } from "@contracts/agents";
import { assessState } from "./state-assessment";
import { detectCrisis } from "./crisis";

/** 脚手架阶段:模拟 NeuroBand 读数。接硬件后替换为真实数据流。 */
export const DEFAULT_STATE: UserState = {
  arousal: 72,
  focus: 58,
  calm: 54,
  sleepHours: 6.2,
  availableMinutes: 15,
};

/** 对话线索 → 状态修正(简单规则,LLM 接入后可做更细的情感分析) */
function applyStateHints(base: UserState, intent: ExtractedIntent): UserState {
  const s = { ...base };
  if (intent.stateHints.includes("高唤醒")) s.arousal = Math.min(100, s.arousal + 10);
  if (intent.stateHints.includes("低精力")) s.sleepHours = Math.max(4, s.sleepHours - 0.8);
  if (intent.stateHints.includes("低专注")) s.focus = Math.max(20, s.focus - 12);
  if (intent.availableMinutes) s.availableMinutes = intent.availableMinutes;
  return s;
}

const FOLLOW_UPS: Record<string, string> = {
  no_goal:
    "想先听听你现在的状态——你是感觉紧绷焦虑想平复下来,注意力涣散需要专注,还是疲惫想为睡眠恢复做准备?",
  no_time: "明白,目标是{goal}。你大概有几分钟可以用来练习?我好控制方案的剂量。",
};

export class SingleAgent {
  readonly id = "tuno_solo";
  readonly name = "Tuno";

  async chat(
    message: string,
    history: ChatTurn[],
    state?: UserState,
    llmOverride?: LLMConfig,
    memory?: UserMemory,
  ): Promise<ChatAgentReply> {
    const llm = getLLMProvider(llmOverride);
    const trace: NovaTraceStep[] = [];

    // ── Step 0: 危机识别(合规硬性要求,先于一切推荐逻辑) ──
    if (detectCrisis(message)) {
      trace.push({
        key: "intent",
        title: "危机识别",
        detail: "检测到需要真人支持的信号,已中断常规推荐",
        engine: "policy",
      });
      return {
        reply:
          "听到你这么说,我很在意你。我只是一个陪伴练习的小助手,这种情况下,你值得被更专业的人好好接住——" +
          "全国 24 小时心理援助热线 400-161-9995,生命热线 400-821-1215,情况紧急时请直接拨打 120。你不是一个人。",
        intent: { goalId: null, goalIds: [], availableMinutes: null, stateHints: [], confidence: 1 },
        recommendations: [],
        combo: null,
        followUpQuestion: null,
        trace,
        engine: "policy",
      };
    }

    // ── Step 1: 意图识别 ──
    const intent = await llm.extractIntent(message, history);
    const intentFallback =
      llm instanceof OpenAICompatibleProvider && llm.lastFallback === "extractIntent";
    trace.push(this.traceIntent(message, intent, llm.name, intentFallback));

    // 历史回填:用户上一轮已说过目标,本轮只答了时长
    if (!intent.goalId) {
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].role !== "user") continue;
        const past = await llm.extractIntent(history[i].content, []);
        if (past.goalId) {
          intent.goalId = past.goalId;
          intent.confidence = Math.max(intent.confidence, past.confidence - 0.1);
          trace.push({
            key: "intent",
            title: "上下文回填",
            detail: `本轮没有识别到目标,从上一轮对话继承了「${getGoal(past.goalId)!.label}」。`,
            engine: llm.name,
          });
          break;
        }
      }
    }

    // ── Step 2: 状态合成 ──
    const baseState = state ?? DEFAULT_STATE;
    const mergedState = applyStateHints(baseState, intent);
    trace.push(this.traceState(baseState, mergedState, intent));

    // ── Step 2.5: 记忆读取(Tuno 记得这个用户) ──
    const memText = memory ? memoryToText(memory) : "";
    const memSummary = memory ? summarizeMemory(memory) : null;
    const prefText =
      memSummary && memSummary.totalSessions > 0
        ? [
            memSummary.favoriteGoal
              ? `最常练「${getGoal(memSummary.favoriteGoal)!.label}」`
              : null,
            memSummary.avgDurationMin ? `平均每次 ${memSummary.avgDurationMin} 分钟` : null,
            memSummary.improveRate !== null
              ? `${Math.round(memSummary.improveRate * 100)}% 的训练后唤醒下降`
              : null,
          ]
            .filter(Boolean)
            .join(",")
        : "";
    trace.push({
      key: "memory",
      title: "记忆读取",
      detail: memText
        ? `记得这个用户:${memText}。偏好:${prefText || "尚未形成"}.`
        : "还没有这个用户的训练记忆,本次按新用户对待。",
      engine: "memory",
    });

    // ── Step 2.6: 状态评测(数值 → 被命名的当下,辅助 Tuno 判断语气与方向) ──
    const assessment = assessState(mergedState);
    trace.push({
      key: "state",
      title: "状态评测",
      detail: `「${assessment.name}」——${assessment.depiction}。此刻需要:${assessment.need}。`,
      engine: "policy",
    });

    /** 回复生成的全量上下文(追问与推荐共用) */
    const replyCtx = {
      message,
      historyTail: history.slice(-4).map((t) => `${t.role === "user" ? "用户" : "Tuno"}:${t.content}`),
      intent,
      goalLabel: intent.goalId ? (getGoal(intent.goalId)?.label ?? null) : null,
      memory: memText || undefined,
      preferences: prefText || undefined,
      stateName: assessment.name,
      stateDepiction: assessment.depiction,
      stateNeed: assessment.need,
    };

    // ── 低置信度:追问,不推荐 ──
    if (!intent.goalId) {
      const followUp = await llm.composeReply({
        ...replyCtx,
        topPlanNames: [],
        topPlanWhy: [],
        followUpQuestion: FOLLOW_UPS.no_goal,
      });
      trace.push({
        key: "decision",
        title: "路径决策:追问",
        detail: "没有识别到明确目标。宁可追问也不瞎猜——错误的推荐比多问一句更伤信任。",
        engine: "policy",
      });
      trace.push(this.traceReply(llm));
      return {
        reply: followUp,
        intent,
        recommendations: [],
        combo: null,
        followUpQuestion: followUp,
        engine: llm.name,
        trace,
      };
    }
    if (intent.confidence < 0.6 && !intent.availableMinutes) {
      const goal = getGoal(intent.goalId)!;
      const followUp = await llm.composeReply({
        ...replyCtx,
        topPlanNames: [],
        topPlanWhy: [],
        followUpQuestion: FOLLOW_UPS.no_time.replace("{goal}", `「${goal.label}」`),
      });
      trace.push({
        key: "decision",
        title: "路径决策:追问时长",
        detail: `目标「${goal.label}」置信度 ${Math.round(intent.confidence * 100)}%,但不知道你有多少时间——剂量定不下来,先问清楚。`,
        engine: "policy",
      });
      trace.push(this.traceReply(llm));
      return {
        reply: followUp,
        intent,
        recommendations: [],
        combo: null,
        followUpQuestion: followUp,
        engine: llm.name,
        trace,
      };
    }

    // ── 多目标:组合方案(先 A 后 B 的序贯训练) ──
    if (intent.goalIds.length >= 2) {
      const combo = this.buildCombo(intent.goalIds.slice(0, 2), mergedState);
      trace.push({
        key: "decision",
        title: "路径决策:组合方案",
        detail:
          `识别到两个目标(${intent.goalIds.map((g) => getGoal(g)!.label).join(" → ")}),` +
          `拆成序贯组合:神经系统的下行和上行各有通道,顺序不能反。`,
        engine: "policy",
        extra: combo.steps.map((s, i) => `第 ${i + 1} 步:「${s.name}」 ${s.minutes} 分钟`),
      });
      const stepNames = combo.steps.map((s) => `「${s.name}」`).join(" → ");
      const comboReply = await llm.composeReply({
        ...replyCtx,
        goalLabel: combo.goalIds.map((g) => getGoal(g)!.label).join(" → "),
        topPlanNames: combo.steps.map((s) => s.name),
        topPlanWhy: [
          `这是一个序贯组合:先${getGoal(combo.goalIds[0])!.label}、再${getGoal(combo.goalIds[1])!.label},共 ${combo.totalMin} 分钟,顺序不能反`,
        ],
        followUpQuestion: null,
      });
      trace.push(this.traceReply(llm));
      return {
        reply:
          llm instanceof OpenAICompatibleProvider && llm.lastFallback === "composeReply"
            ? `你提到了两层需求,我把它拆成一个序贯组合:` +
              `先${getGoal(combo.goalIds[0])!.label},再${getGoal(combo.goalIds[1])!.label}。` +
              `组合:${stepNames},共 ${combo.totalMin} 分钟。`
            : comboReply,
        intent,
        recommendations: [],
        combo,
        followUpQuestion: null,
        engine: llm.name,
        trace,
      };
    }

    // ── 单目标:匹配引擎出 top3 ──
    const goal = getGoal(intent.goalId as GoalId)!;
    trace.push({
      key: "decision",
      title: "路径决策:单目标推荐",
      detail: `目标明确(「${goal.label}」),交给匹配引擎对 ${PLANS.length} 个训练模块逐一打分,取前三。`,
      engine: "policy",
    });
    const recommendations = matchPlans(goal, mergedState, PLANS, 3, recentPlanIds(memory));
    trace.push({
      key: "match",
      title: "匹配计算",
      detail: `得分 = 目标亲和 ×50 + 状态适配 ×30 + 时长适配 ×20。`,
      engine: "matching-rules",
      extra: recommendations.map(
        (r, i) =>
          `${i + 1}. 「${r.plan.name}」 ${r.score} 分(亲和 ${r.breakdown.goalAffinity} / 状态 ${r.breakdown.stateFit} / 时长 ${r.breakdown.durationFit})`,
      ),
    });

    // ── Step 5: 回复生成 ──
    const reply = await llm.composeReply({
      ...replyCtx,
      topPlanNames: recommendations.map((r) => r.plan.name),
      topPlanWhy: recommendations[0]?.why ?? [],
      followUpQuestion: null,
    });
    trace.push(this.traceReply(llm));

    return {
      reply,
      intent,
      recommendations,
      combo: null,
      followUpQuestion: null,
      engine: llm.name,
      trace,
    };
  }

  /** 思考链路 · 回复生成这一步(含降级如实标注),追问与推荐共用 */
  private traceReply(llm: ReturnType<typeof getLLMProvider>) {
    const fellBack =
      llm instanceof OpenAICompatibleProvider && llm.lastFallback === "composeReply";
    return {
      key: "reply" as const,
      title: "回复生成",
      detail: fellBack
        ? `LLM(${llm.name})生成失败,已自动降级为模板回复。`
        : llm.name === "rule"
          ? "模板回复(接入 LLM 后此步由模型生成更自然的表达)。"
          : `由 ${llm.name} 以「温和引导者」人格生成,上下文含:原话/记忆/偏好/状态评测/推荐理由。`,
      engine: fellBack ? "rule" : llm.name,
    };
  }

  /** 思考链路 · Step 1:意图识别(命中了哪些线索,如实呈现) */
  private traceIntent(
    message: string,
    intent: ExtractedIntent,
    engine: string,
    fellBack: boolean,
  ): NovaTraceStep {
    const lower = message.toLowerCase();
    const hitDetail = GOALS.map((g) => {
      const hits = g.keywords.filter((k) => lower.includes(k.toLowerCase()));
      return hits.length > 0 ? `「${g.label}」命中:${hits.join("、")}` : null;
    }).filter(Boolean) as string[];

    const parts: string[] = [];
    if (intent.goalId) {
      parts.push(
        `识别到目标「${getGoal(intent.goalId)!.label}」(置信度 ${Math.round(intent.confidence * 100)}%)`,
      );
    } else {
      parts.push("没有识别到明确目标");
    }
    if (intent.goalIds.length >= 2) {
      parts.push(`次目标「${getGoal(intent.goalIds[1])!.label}」同时命中 → 触发组合`);
    }
    if (intent.availableMinutes) parts.push(`时长:${intent.availableMinutes} 分钟`);
    if (intent.stateHints.length > 0) parts.push(`状态线索:${intent.stateHints.join("、")}`);

    return {
      key: "intent",
      title: "意图识别",
      detail:
        parts.join(";") +
        "。" +
        (fellBack
          ? `LLM(${engine})抽取失败,已自动降级为关键词规则。`
          : engine === "rule"
            ? "由关键词规则引擎完成(接入 LLM 后此步由模型理解)。"
            : `由 ${engine} 完成语义理解。`),
      engine: fellBack ? "rule" : engine,
      extra: hitDetail.length > 0 ? hitDetail : undefined,
    };
  }

  /** 思考链路 · Step 2:状态合成(对话线索如何修正 NeuroBand 读数) */
  private traceState(
    base: UserState,
    merged: UserState,
    intent: ExtractedIntent,
  ): NovaTraceStep {
    const changes: string[] = [];
    if (merged.arousal !== base.arousal) changes.push(`Arousal ${base.arousal}→${merged.arousal}`);
    if (merged.focus !== base.focus) changes.push(`Focus ${base.focus}→${merged.focus}`);
    if (merged.sleepHours !== base.sleepHours)
      changes.push(`睡眠 ${base.sleepHours}h→${merged.sleepHours}h`);
    if (merged.availableMinutes !== base.availableMinutes)
      changes.push(`可用时长 ${base.availableMinutes}→${merged.availableMinutes} 分钟`);

    return {
      key: "state",
      title: "状态合成",
      detail:
        changes.length > 0
          ? `对话线索修正了 NeuroBand 读数:${changes.join(";")}。`
          : intent.stateHints.length > 0
            ? "读到了状态线索,但当前读数已反映,无需修正。"
            : "对话中没有状态线索,直接使用 NeuroBand 当前读数。",
      engine: "policy",
    };
  }

  /** 组合方案:每个目标取匹配分最高的计划,按目标顺序串联 */
  private buildCombo(goalIds: GoalId[], state: UserState): ComboRecommendation {
    const steps = goalIds.map((gid) => {
      const goal = getGoal(gid)!;
      const top = matchPlans(goal, state, PLANS, 1)[0];
      return {
        planId: top.plan.id,
        name: top.plan.name,
        minutes: top.plan.durationMin,
        plan: top.plan,
      };
    });
    const totalMin = steps.reduce((s, x) => s + x.minutes, 0);
    const labels = goalIds.map((g) => getGoal(g)!.label).join(" → ");
    return {
      title: `${labels} · 组合方案`,
      goalIds,
      steps,
      totalMin,
      rationale:
        `第一步先处理当前最急迫的状态(${getGoal(goalIds[0])!.label}),` +
        `为第二步(${getGoal(goalIds[1])!.label})创造生理条件。` +
        `若总时长超出预算,可只做第一步,或发起 A2A 会诊压缩参数。`,
    };
  }
}
