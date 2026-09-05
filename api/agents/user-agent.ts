/**
 * 用户 Agent(Tuno)—— Multi-Agent 会诊的编排者。
 *
 * 现行边界:docs/agent-lab/multi-agent-boundary.md
 * 1. 判定有序环节(最多两步)并按擅长派工;一人可领两步
 * 2. 专家只从已有疗法目录选模块,禁止 invented / 生图 / 作曲
 * 3. 按步拼接阶段引导词;不能互改时由 Tuno 整合
 */
import type {
  AgentConflict,
  AgentMessage,
  ConsultResult,
  ExpertProposal,
  GoalId,
  LLMConfig,
  UserMemory,
  UserProfile,
  UserState,
} from "@contracts/agents";
import { getGoal, getPlan, GOALS } from "./data/presets";
import { matchPlans } from "./matching/engine";
import { createExperts } from "./experts/experts";
import { getLLMProvider } from "./llm/provider";
import { memoryToText, recentPlanIds } from "@contracts/agents";
import { assessState } from "./state-assessment";
import { buildTherapyCatalog } from "./data/therapy-catalog";
import {
  buildStageAnalysis,
  ensureStageAnalysis,
  parseStageJobs,
  stagesFromAnalysis,
  stitchStageDecision,
  type StagePick,
} from "./consult-stages";

let msgSeq = 0;
function msg(partial: Omit<AgentMessage, "id">): AgentMessage {
  return { id: `m${++msgSeq}`, ...partial };
}

/** 需求配比里权重最高的目标 = 本次会诊的主目标 */
function dominantGoalId(weights: Record<GoalId, number>): GoalId {
  const entries = Object.entries(weights) as [GoalId, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? "calm";
}

export class UserAgent {
  readonly id = "tuno";
  readonly name = "Tuno";
  private profile: UserProfile;

  constructor(profile: UserProfile) {
    this.profile = profile;
  }

  /**
   * 对话式会诊:用户只说一句话,剩下全由 Agent 编排。
   */
  async consultMessage(
    message: string,
    state: UserState,
    llmOverride?: LLMConfig,
    memory?: UserMemory,
  ): Promise<ConsultResult> {
    msgSeq = 0;
    const llm = getLLMProvider(llmOverride);
    const memText = memory ? memoryToText(memory) : "";
    const assessed = assessState(state);
    const experts = createExperts();

    const transcript: AgentMessage[] = [];

    const roster = experts.map((e) => ({
      expertId: e.id,
      expertName: e.name,
      domain: e.domain,
      persona: e.persona,
    }));
    const analysis = ensureStageAnalysis(
      (await llm.analyze({
        message,
        historyTail: [],
        state,
        stateName: assessed.name,
        stateDepiction: assessed.depiction,
        memory: memText || undefined,
        experts: roster,
      })) ?? buildStageAnalysis(message, roster),
      message,
      roster,
    );
    const stages = stagesFromAnalysis(analysis, message);

    transcript.push(
      msg({
        from: this.id,
        fromName: this.name,
        to: "broadcast",
        role: "user_agent",
        kind: "note",
        content:
          `我听到的是:${analysis.summary}` +
          `请 ${analysis.selectedExperts.map((e) => e.expertName).join("、")} 按环节从现有疗法目录里选模块。` +
          `这一次不创作新练习,不生图,不作曲。`,
        payload: analysis,
      }),
    );

    const goalId = stages[0]?.goalId ?? dominantGoalId(analysis.weights);
    const allPlans = getAllPlans();
    const selectedIds = new Set(analysis.selectedExperts.map((e) => e.expertId));
    const called = experts.filter((e) => selectedIds.has(e.id));
    const calledExperts = called.length > 0 ? called : experts;

    for (const expert of calledExperts) {
      const assignment = analysis.selectedExperts.find((a) => a.expertId === expert.id);
      transcript.push(
        msg({
          from: this.id,
          fromName: this.name,
          to: expert.id,
          role: "user_agent",
          kind: "ask",
          content:
            `用户原话:「${message}」。` +
            `当下脑状态:Arousal ${state.arousal} / Calm ${state.calm} / Focus ${state.focus},` +
            `睡眠 ${state.sleepHours}h,可用 ${state.availableMinutes} 分钟。` +
            `状态评测:${assessed.name}——${assessed.depiction}。` +
            (memText ? `我记得他的历史:${memText}。` : `他还没有训练历史。`) +
            `你的分工:${assignment?.task ?? `从${expert.domain}角度给出建议`}。` +
            `现有疗法目录共 ${allPlans.length} 项。只对照目录选模块,禁止即兴、生图、作曲。`,
        }),
      );
    }

    const proposals: ExpertProposal[] = [];
    const picks: StagePick[] = [];
    for (const expert of calledExperts) {
      const assignment = analysis.selectedExperts.find((a) => a.expertId === expert.id);
      const jobs = parseStageJobs(assignment?.task ?? "");
      const work =
        jobs.length > 0
          ? jobs
          : [{ index: stages[0]?.index ?? 1, goalId, kind: "plan" as const }];
      let firstKept: ExpertProposal | null = null;
      for (const job of work) {
        const stageGoalId = job.kind === "overlay" ? (stages[stages.length - 1]?.goalId ?? goalId) : job.goalId;
        const stageGoal = getGoal(stageGoalId) ?? GOALS[0];
        const scored = matchPlans(stageGoal, state, allPlans, allPlans.length, recentPlanIds(memory));
        const catalog = buildTherapyCatalog(scored);
        const proposal = await expert.propose({
          goal: stageGoal,
          state,
          scored,
          catalog,
          llm,
          memoryText: memText || undefined,
          userMessage: message,
          task: assignment?.task,
          allowInvent: false,
        });
        if (!proposal || proposal.planId === "invented") continue;
        picks.push({
          stageIndex: job.kind === "overlay" ? (stages[stages.length - 1]?.index ?? 1) : job.index,
          goalId: stageGoalId,
          proposal,
          role: job.kind,
        });
        if (!firstKept) {
          firstKept = proposal;
          proposals.push(proposal);
        }
        transcript.push(
          msg({
            from: proposal.agentId,
            fromName: proposal.agentName,
            to: this.id,
            role: "expert",
            kind: "proposal",
            content:
              (job.kind === "overlay" ? "感官层(目录点选):" : `第${job.index}步:`) + proposal.rationale,
            payload: proposal,
          }),
        );
      }
    }

    const conflicts = this.detectStageConflicts(picks);
    for (const c of conflicts) {
      transcript.push(
        msg({
          from: this.id,
          fromName: this.name,
          to: "broadcast",
          role: "user_agent",
          kind: "challenge",
          content: `发现分歧【${c.topic}】:${c.agents.map((a) => `${a.agentName} 主张 ${a.position}`).join(";")}`,
          payload: c,
        }),
      );
    }

    for (const st of stages) {
      if (picks.some((p) => p.role === "plan" && p.stageIndex === st.index)) continue;
      const stageGoal = getGoal(st.goalId) ?? GOALS[0];
      const scored = matchPlans(stageGoal, state, allPlans, allPlans.length, recentPlanIds(memory));
      const top = scored[0];
      if (!top) continue;
      picks.push({
        stageIndex: st.index,
        goalId: st.goalId,
        role: "plan",
        proposal: {
          agentId: this.id,
          agentName: this.name,
          domain: "编排",
          planId: top.plan.id,
          params: { durationMin: Math.min(top.plan.durationMin, state.availableMinutes) },
          rationale: `第${st.index}步目录顶项补位「${top.plan.name}」。`,
          confidence: 0.5,
          matchScore: top.score,
        },
      });
    }

    const decision = stitchStageDecision({
      stages,
      picks,
      state,
      guidanceLevel: this.profile.preference.guidanceLevel,
      memory: memText || undefined,
    });
    const llmReasoning = await llm.arbitrate({
      goalId,
      state,
      proposals,
      principles: ["按用户说的顺序拼接目录模块", "不创作新练习", "不生图不作曲", "最小认知负荷"],
      memory: memText || undefined,
    });
    if (llmReasoning?.reasoning?.length) {
      decision.reasoning = llmReasoning.reasoning;
    }
    transcript.push(
      msg({
        from: this.id,
        fromName: this.name,
        to: "user",
        role: "user_agent",
        kind: "decision",
        content: `最终决定:「${decision.planName}」,${decision.customized.durationMin} 分钟。` +
          decision.reasoning[0],
        payload: decision,
      }),
    );

    return { goalId, state, analysis, transcript, proposals, conflicts, decision, engine: llm.name };
  }

  /** 只在同一环节里、两位计划负责人推了不同目录模块时记分歧。 */
  private detectStageConflicts(picks: StagePick[]): AgentConflict[] {
    const conflicts: AgentConflict[] = [];
    const byStage = new Map<number, StagePick[]>();
    for (const p of picks) {
      if (p.role !== "plan") continue;
      byStage.set(p.stageIndex, [...(byStage.get(p.stageIndex) ?? []), p]);
    }
    for (const [index, group] of byStage) {
      const planIds = new Set(group.map((g) => g.proposal.planId));
      if (planIds.size < 2) continue;
      conflicts.push({
        topic: `第${index}步目录模块`,
        agents: group.map((g) => ({
          agentId: g.proposal.agentId,
          agentName: g.proposal.agentName,
          position: `「${getPlan(g.proposal.planId)?.name ?? g.proposal.planId}」`,
        })),
      });
    }
    return conflicts;
  }
}

// 避免循环依赖:presets 里 PLANS 的 getter
import { PLANS } from "./data/presets";
function getAllPlans() {
  return PLANS;
}
