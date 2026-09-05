/**
 * 专家 Agent 基类。
 *
 * 每个专家 = persona(领域视角,未来作为 LLM system prompt)
 *          + lens(领域过滤:如何从疗法目录中选出自己支持的方案)
 *          + customize(领域延展:参数怎么调、理由怎么说)
 *
 * 每位专家都会拿到完整的现有疗法目录,提案必须先对照目录再延展。
 * LLM 接入路径:propose() 先尝试 llm.propose(),返回 null 时
 * 自动降级为模板提案 —— 专家永远能出声,LLM 只是让它说得更好。
 */
import type {
  ExpertProposal,
  Goal,
  ScoredPlan,
  TrainingPlan,
  UserState,
} from "@contracts/agents";
import { getLLMProvider, type LLMProvider } from "../llm/provider";
import { buildTherapyCatalog, compactCatalog, type TherapyCatalogItem } from "../data/therapy-catalog";

export interface ExpertContext {
  goal: Goal;
  state: UserState;
  scored: ScoredPlan[]; // 匹配引擎对全部计划的评分
  /** 完整疗法目录(含阶段/禁忌/可调参数),与 scored 对齐 */
  catalog: TherapyCatalogItem[];
  /** 本次会诊使用的 LLM(可能是用户自带 key 的按请求实例) */
  llm?: LLMProvider;
  /** 用户记忆摘要(训练/会诊历史),可为空 */
  memoryText?: string;
  /** 用户本次会诊的原话(对话式编排时由 Tuno 传入) */
  userMessage?: string;
  /** Tuno 分配给这位专家的具体分工 */
  task?: string;
  /** Tuno 判断需要即兴创作新练习时,允许专家交出 invented 方案 */
  allowInvent?: boolean;
}

function catalogAnchor(rationale: string, fromName: string): string {
  if (rationale.includes("对照疗法目录")) return rationale;
  return `对照疗法目录,我从「${fromName}」出发延展。${rationale}`;
}

export abstract class BaseExpert {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly domain: string;
  /** 领域人格:接入 LLM 时作为 system prompt */
  abstract readonly persona: string;
  /** 本专家倾向支持的计划 —— 透镜,不是盲区:目录里其他疗法仍然可见 */
  protected abstract preferredPlanIds: string[];
  /** 是否具备即兴创作新练习的能力(艺术/创作型专家开启) */
  protected readonly supportsInvention: boolean = false;

  /**
   * 领域视角下的方案选择。
   * 先看完整目录的客观分,若自己倾向的疗法落后不超过 12 分,仍走领域透镜;
   * 否则跟目录证据走,并在理由里说明为什么跨出偏好。
   */
  protected pick(ctx: ExpertContext): ScoredPlan | null {
    if (ctx.scored.length === 0) return null;
    const top = [...ctx.scored].sort((a, b) => b.score - a.score)[0];
    const preferred = ctx.scored.filter((s) => this.preferredPlanIds.includes(s.plan.id));
    if (preferred.length === 0) return top;
    const bestPref = [...preferred].sort((a, b) => b.score - a.score)[0];
    return top.score - bestPref.score <= 12 ? bestPref : top;
  }

  /** 领域延展:调整参数 + 给出专业理由。子类必须实现。 */
  protected abstract customize(
    plan: TrainingPlan,
    ctx: ExpertContext,
  ): { params: ExpertProposal["params"]; rationale: string; confidence: number };

  /**
   * 规则通道的即兴创作(LLM 不可用时兜底):
   * 必须从目录里最近的一项延展,而不是凭空发明。
   */
  protected ruleInvention(ctx: ExpertContext): ExpertProposal {
    const nearest = this.pick(ctx);
    const { state, goal } = ctx;
    const woundUp = state.arousal >= 65;
    const drained = state.sleepHours < 6;
    const name = woundUp
      ? "退潮练习"
      : drained
        ? "微光守夜"
        : "拾星漫步";
    const scene = woundUp
      ? "想象自己站在黄昏的礁石上,每一次呼气都是一波退潮,把身体里的紧绷带回海里。"
      : drained
        ? "想象自己是深夜里一盏不必照亮的灯,只需要安静地亮着,什么都不用做。"
        : "想象在一条安静的林间小路上慢行,每走几步就拾起一颗发光的石子,放进心里。";
    const phases = woundUp
      ? [
          { name: "落地", minutes: 2, instruction: "双脚踩实,感受身体被地面托住,什么都不用调整。" },
          { name: "退潮", minutes: 4, instruction: "吸气自然,呼气放慢拉长,想象紧绷随呼气退下去。" },
          { name: "停留", minutes: 3, instruction: "停在退潮后的沙滩上,只是呼吸,只是存在。" },
        ]
      : [
          { name: "安顿", minutes: 2, instruction: "找个舒服的姿势,允许自己先不投入,只是待着。" },
          { name: "微光", minutes: 4, instruction: "把注意力放在身体里最安静的一个角落,守着它。" },
          { name: "合眼", minutes: 3, instruction: "让眼皮慢慢变沉,交还给身体自己。" },
        ];
    const durationMin = phases.reduce((s, p) => s + p.minutes, 0);
    const fromName = nearest?.plan.name ?? "现有呼吸/意象类疗法";
    return {
      agentId: this.id,
      agentName: this.name,
      domain: this.domain,
      planId: "invented",
      invented: {
        name,
        scene,
        durationMin,
        phases,
        breathPattern: woundUp ? "4-6(免屏息)" : undefined,
        musicType: goal.id === "sleep" ? "delta-pad" : woundUp ? "ambient-descend" : "brown-noise",
        guidanceLevel: "light",
      },
      params: { durationMin, guidanceLevel: "light" },
      rationale:
        `我对照了现有疗法目录。最接近的是「${fromName}」,但这一刻的纹理还是对不上,` +
        `所以从它延展出「${name}」:结构仍是安顿→深入→收尾,时长 ${durationMin} 分钟,针对${goal.label}。`,
      confidence: 0.72,
      matchScore: nearest?.score ?? 55,
    };
  }

  async propose(ctx: ExpertContext): Promise<ExpertProposal | null> {
    const catalog = ctx.catalog.length > 0 ? ctx.catalog : buildTherapyCatalog(ctx.scored);
    const llm = ctx.llm ?? getLLMProvider();
    const llmProposal = await llm.propose({
      expertId: this.id,
      expertName: this.name,
      domain: this.domain,
      persona: this.persona,
      goalId: ctx.goal.id,
      state: ctx.state,
      candidatePlans: ctx.scored.map((s) => ({
        planId: s.plan.id,
        name: s.plan.name,
        matchScore: s.score,
      })),
      catalog: compactCatalog(catalog),
      memory: ctx.memoryText,
      userMessage: ctx.userMessage,
      task: ctx.task,
      allowInvent: false,
    });
    if (llmProposal && llmProposal.planId !== "invented") {
      const fromName =
        catalog.find((c) => c.planId === llmProposal.planId)?.name ?? llmProposal.planId;
      return { ...llmProposal, rationale: catalogAnchor(llmProposal.rationale, fromName) };
    }

    const picked = this.pick(ctx);
    if (!picked) return null;
    const { params, rationale, confidence } = this.customize(picked.plan, ctx);
    const anchored =
      `对照疗法目录,我从「${picked.plan.name}」出发延展。` + rationale;
    return {
      agentId: this.id,
      agentName: this.name,
      domain: this.domain,
      planId: picked.plan.id,
      params,
      rationale: anchored,
      confidence,
      matchScore: picked.score,
    };
  }
}
