/**
 * 用户 Agent(Tuno)—— Multi-Agent 会诊的编排者。
 *
 * 现行边界:docs/agent-lab/multi-agent-boundary.md
 * 支持 onProgress：真实阶段完成即推送，供 SSE 渐进呈现。
 */
import type {
  AgentConflict,
  AgentMessage,
  ConsultResult,
  ConsultStreamEvent,
  ExpertProposal,
  GoalId,
  LLMConfig,
  UserMemory,
  UserProfile,
  UserState,
} from "@contracts/agents";
import { getGoal, getPlan, GOALS, PLANS } from "./data/presets";
import { matchPlans } from "./matching/engine";
import { createExperts } from "./experts/experts";
import { getLLMProvider } from "./llm/provider";
import { memoryToText, recentPlanIds, rebuildHabits } from "@contracts/agents";
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

function dominantGoalId(weights: Record<GoalId, number>): GoalId {
  const entries = Object.entries(weights) as [GoalId, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? "calm";
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export type ConsultProgress = (ev: ConsultStreamEvent) => void;

export class UserAgent {
  readonly id = "tuno";
  readonly name = "Tuno";
  private profile: UserProfile;

  constructor(profile: UserProfile) {
    this.profile = profile;
  }

  async consultMessage(
    message: string,
    state: UserState,
    llmOverride?: LLMConfig,
    memory?: UserMemory,
    onProgress?: ConsultProgress,
  ): Promise<ConsultResult> {
    msgSeq = 0;
    const emit = (ev: ConsultStreamEvent) => {
      try {
        onProgress?.(ev);
      } catch {
        /* ignore */
      }
    };
    const transcript: AgentMessage[] = [];
    const push = (partial: Omit<AgentMessage, "id">) => {
      const m = msg(partial);
      transcript.push(m);
      emit({ type: "message", message: m });
      return m;
    };

    const llm = getLLMProvider(llmOverride);
    const memText = memory ? memoryToText(memory) : "";
    const habitPrefs =
      memory?.habits?.preferredPlanIds ??
      (memory && memory.sessions.length ? rebuildHabits(memory).preferredPlanIds : undefined);

    emit({ type: "phase", phase: "reading_state", label: "正在读取当下脑状态…" });
    const assessed = assessState(state);
    await delay(180);

    emit({
      type: "phase",
      phase: "reading_memory",
      label: memText ? "正在读取你的训练习惯与对话记忆…" : "正在确认：尚无训练史，按新用户理解…",
    });
    await delay(160);

    const experts = createExperts();
    emit({ type: "phase", phase: "analyzing", label: "Tuno 正在理解你的诉求与顺序…" });

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
    emit({ type: "analysis", analysis });

    emit({ type: "phase", phase: "dispatching", label: "正在按擅长派工给 Friends…" });

    push({
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
    });

    const goalId = stages[0]?.goalId ?? dominantGoalId(analysis.weights);
    const allPlans = PLANS;
    const selectedIds = new Set(analysis.selectedExperts.map((e) => e.expertId));
    const called = experts.filter((e) => selectedIds.has(e.id));
    const calledExperts = called.length > 0 ? called : experts;

    for (const expert of calledExperts) {
      const assignment = analysis.selectedExperts.find((a) => a.expertId === expert.id);
      push({
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
      });
    }

    const proposals: ExpertProposal[] = [];
    const picks: StagePick[] = [];
    for (const expert of calledExperts) {
      emit({
        type: "phase",
        phase: "expert_working",
        label: `${expert.name} 正在从目录里选模块…`,
        expertName: expert.name,
      });
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
        const scored = matchPlans(
          stageGoal,
          state,
          allPlans,
          allPlans.length,
          recentPlanIds(memory),
          habitPrefs,
        );
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
        push({
          from: proposal.agentId,
          fromName: proposal.agentName,
          to: this.id,
          role: "expert",
          kind: "proposal",
          content:
            (job.kind === "overlay" ? "感官层(目录点选):" : `第${job.index}步:`) + proposal.rationale,
          payload: proposal,
        });
      }
    }

    emit({ type: "phase", phase: "stitching", label: "Tuno 正在拼接环节与收束方案…" });

    const conflicts = this.detectStageConflicts(picks);
    for (const c of conflicts) {
      push({
        from: this.id,
        fromName: this.name,
        to: "broadcast",
        role: "user_agent",
        kind: "challenge",
        content: `发现分歧【${c.topic}】:${c.agents.map((a) => `${a.agentName} 主张 ${a.position}`).join(";")}`,
        payload: c,
      });
    }

    for (const st of stages) {
      if (picks.some((p) => p.role === "plan" && p.stageIndex === st.index)) continue;
      const stageGoal = getGoal(st.goalId) ?? GOALS[0];
      const scored = matchPlans(
        stageGoal,
        state,
        allPlans,
        allPlans.length,
        recentPlanIds(memory),
        habitPrefs,
      );
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
    push({
      from: this.id,
      fromName: this.name,
      to: "user",
      role: "user_agent",
      kind: "decision",
      content:
        `最终决定:「${decision.planName}」,${decision.customized.durationMin} 分钟。` +
        decision.reasoning[0],
      payload: decision,
    });

    const result: ConsultResult = {
      goalId,
      state,
      analysis,
      transcript,
      proposals,
      conflicts,
      decision,
      engine: llm.name,
    };
    emit({ type: "phase", phase: "done", label: "会诊完成" });
    emit({ type: "result", result });
    return result;
  }

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
