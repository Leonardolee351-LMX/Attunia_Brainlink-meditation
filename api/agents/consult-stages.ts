/**
 * Multi-Agent 会诊：有序环节 + 按擅长派工 + 只拼目录。
 * 边界见 docs/agent-lab/multi-agent-boundary.md。
 */
import type {
  ExpertProposal,
  FinalDecision,
  GoalId,
  IntentAnalysis,
  PlanPhase,
  TrainingPlan,
  UserState,
} from "@contracts/agents";
import { getGoal, getPlan, GOALS } from "./data/presets";

export const LEAVE_WORK =
  /停下.{0,8}工作|卸下.{0,8}工作|放下工作|结束工作|收工|别再干活|慢慢停/;

const STAGE_TASK = /【第(\d)步·(calm|focus|sleep)】/g;
const OVERLAY_MARK = "【感官层】";

export type StageSpec = {
  index: number;
  goalId: GoalId;
  label: string;
};

export type StageJob = {
  index: number;
  goalId: GoalId;
  kind: "plan" | "overlay";
};

export type StagePick = {
  stageIndex: number;
  goalId: GoalId;
  proposal: ExpertProposal;
  role: "plan" | "overlay";
};

export type RosterEntry = {
  expertId: string;
  expertName: string;
  domain: string;
  persona?: string;
};

const PLAN_OWNER: Record<GoalId, string> = {
  calm: "expert_counsel",
  focus: "expert_cogsci",
  sleep: "expert_neuro",
};

const FOCUS_SECOND = "expert_flow";
const OVERLAY_ID = "expert_art";

/** 片段里命中最靠前的目标；卸下工作优先算 calm，不算 focus。 */
export function primaryGoalIn(text: string): GoalId | null {
  const leaveWork = LEAVE_WORK.test(text);
  let best: { id: GoalId; pos: number } | null = null;
  for (const goal of GOALS) {
    for (const k of goal.keywords) {
      if (goal.id === "focus" && (k === "工作" || k === "上班") && leaveWork) continue;
      const i = text.toLowerCase().indexOf(k.toLowerCase());
      if (i < 0) continue;
      if (!best || i < best.pos) best = { id: goal.id, pos: i };
    }
  }
  if (leaveWork) {
    const m = text.search(LEAVE_WORK);
    if (m >= 0 && (!best || m <= best.pos + 4)) return "calm";
  }
  return best?.id ?? null;
}

/**
 * 有序目标：优先「先 A 再 B」子句；否则按关键词首次出现位置。最多两个。
 */
export function orderedGoalIds(message: string): GoalId[] {
  const seq = message.match(/先(.+?)(?:再|然后|接着|之后)(.+)/);
  if (seq) {
    const first = primaryGoalIn(seq[1] ?? "");
    const second = primaryGoalIn(seq[2] ?? "");
    const ids = [first, second].filter((x): x is GoalId => Boolean(x));
    const uniq = [...new Set(ids)];
    if (uniq.length > 0) return uniq.slice(0, 2);
  }

  const leaveWork = LEAVE_WORK.test(message);
  const lower = message.toLowerCase();
  const hits: { id: GoalId; pos: number; count: number }[] = [];
  for (const goal of GOALS) {
    let pos = Infinity;
    let count = 0;
    for (const k of goal.keywords) {
      if (goal.id === "focus" && (k === "工作" || k === "上班") && leaveWork) continue;
      const i = lower.indexOf(k.toLowerCase());
      if (i < 0) continue;
      count += 1;
      if (i < pos) pos = i;
    }
    if (leaveWork && goal.id === "calm") {
      const m = message.search(LEAVE_WORK);
      count += 2;
      if (m >= 0 && m < pos) pos = m;
    }
    if (count > 0) hits.push({ id: goal.id, pos, count });
  }
  hits.sort((a, b) => a.pos - b.pos || b.count - a.count);

  const hasSeq = /先|再|然后|接着|之后|最后/.test(message);
  const hasConnective = hasSeq || /以及|并且|还要|同时/.test(message);
  const ids: GoalId[] = [];
  if (hits[0]) ids.push(hits[0].id);
  if (hits[1] && (hasConnective || hits[1].count >= 2)) ids.push(hits[1].id);
  return [...new Set(ids)].slice(0, 2);
}

export function parseStageJobs(task: string): StageJob[] {
  const jobs: StageJob[] = [];
  const re = new RegExp(STAGE_TASK.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(task))) {
    jobs.push({
      index: Number(m[1]),
      goalId: m[2] as GoalId,
      kind: "plan",
    });
  }
  if (task.includes(OVERLAY_MARK)) {
    jobs.push({ index: 0, goalId: "calm", kind: "overlay" });
  }
  return jobs;
}

export function stagesFromGoalIds(goalIds: GoalId[]): StageSpec[] {
  const ids = goalIds.length > 0 ? goalIds.slice(0, 2) : (["calm"] as GoalId[]);
  return ids.map((goalId, i) => ({
    index: i + 1,
    goalId,
    label: getGoal(goalId)?.label ?? goalId,
  }));
}

function nameOf(roster: RosterEntry[], id: string): string {
  return roster.find((e) => e.expertId === id)?.expertName ?? id;
}

function domainOf(roster: RosterEntry[], id: string): string {
  return roster.find((e) => e.expertId === id)?.domain ?? "";
}

/** 规则派工：每步一位计划负责人；同一人可领两步；Sona 只做目录感官点选。 */
export function assignExperts(
  stages: StageSpec[],
  roster: RosterEntry[],
): IntentAnalysis["selectedExperts"] {
  const byId = new Map<string, { reason: string; tasks: string[] }>();
  const add = (expertId: string, reason: string, task: string) => {
    if (!roster.some((e) => e.expertId === expertId)) return;
    const cur = byId.get(expertId);
    if (cur) {
      cur.tasks.push(task);
      if (!cur.reason.includes(reason)) cur.reason = `${cur.reason}；${reason}`;
    } else {
      byId.set(expertId, { reason, tasks: [task] });
    }
  };

  for (const st of stages) {
    const owner = PLAN_OWNER[st.goalId];
    add(
      owner,
      `这一步是「${st.label}」，更擅长从${domainOf(roster, owner)}选目录模块`,
      `【第${st.index}步·${st.goalId}】只从现有疗法目录为「${st.label}」选一项模块，沿用其阶段引导词，不创作新练习、不生图、不作曲。`,
    );
    if (st.goalId === "focus") {
      add(
        FOCUS_SECOND,
        "专注环节需要把入口难度收在目录练习里",
        `【第${st.index}步·${st.goalId}】只从目录里选一项专注/心流模块，不另写练习。`,
      );
    }
  }

  add(
    OVERLAY_ID,
    "声音和意象只点选目录里已有的物料",
    `${OVERLAY_MARK}只从目录项已有的 musicType、guidanceLevel 和封面/交互模块里点选，不生成音乐或图像，不写新引导词。`,
  );

  return [...byId.entries()].map(([expertId, v]) => ({
    expertId,
    expertName: nameOf(roster, expertId),
    reason: v.reason,
    task: v.tasks.join(" "),
  }));
}

export function weightsFromStages(stages: StageSpec[]): Record<GoalId, number> {
  const weights: Record<GoalId, number> = { calm: 0, focus: 0, sleep: 0 };
  if (stages.length === 1) {
    weights[stages[0].goalId] = 100;
    return weights;
  }
  const share = [65, 35];
  stages.forEach((st, i) => {
    weights[st.goalId] += share[i] ?? 0;
  });
  const total = weights.calm + weights.focus + weights.sleep;
  if (total !== 100) weights[stages[0].goalId] += 100 - total;
  return weights;
}

export function buildStageAnalysis(message: string, roster: RosterEntry[]): IntentAnalysis {
  const stages = stagesFromGoalIds(orderedGoalIds(message));
  const selectedExperts = assignExperts(stages, roster);
  const labels = stages.map((s) => `第${s.index}步${s.label}`).join("，再");
  return {
    weights: weightsFromStages(stages),
    summary: `按顺序做：${labels}。只拼接现有疗法目录，不创作新内容。`,
    selectedExperts,
    creativityNeeded: false,
  };
}

/** LLM 若漏写环节标记或打开了创作，用规则派工盖掉。 */
export function ensureStageAnalysis(
  analysis: IntentAnalysis,
  message: string,
  roster: RosterEntry[],
): IntentAnalysis {
  const jobs = analysis.selectedExperts.flatMap((e) => parseStageJobs(e.task));
  const stages = stagesFromGoalIds(orderedGoalIds(message));
  const planCovered = stages.every((st) =>
    jobs.some((j) => j.kind === "plan" && j.index === st.index),
  );
  if (!planCovered || analysis.selectedExperts.length === 0) {
    return buildStageAnalysis(message, roster);
  }
  return { ...analysis, creativityNeeded: false };
}

export function stagesFromAnalysis(analysis: IntentAnalysis, message: string): StageSpec[] {
  const fromTasks = analysis.selectedExperts
    .flatMap((e) => parseStageJobs(e.task))
    .filter((j) => j.kind === "plan")
    .sort((a, b) => a.index - b.index);
  const unique = new Map<number, GoalId>();
  for (const j of fromTasks) unique.set(j.index, j.goalId);
  if (unique.size > 0) {
    return [...unique.entries()].map(([index, goalId]) => ({
      index,
      goalId,
      label: getGoal(goalId)?.label ?? goalId,
    }));
  }
  return stagesFromGoalIds(orderedGoalIds(message));
}

function catalogPlan(p: ExpertProposal): TrainingPlan | null {
  if (p.planId === "invented") return null;
  return getPlan(p.planId) ?? null;
}

function scalePhases(phases: PlanPhase[], budget: number): PlanPhase[] {
  const total = phases.reduce((s, p) => s + p.minutes, 0);
  if (total <= budget || total <= 0) return phases;
  const ratio = budget / total;
  const scaled = phases.map((p) => ({
    ...p,
    minutes: Math.max(1, Math.round(p.minutes * ratio)),
  }));
  const drift = scaled.reduce((s, p) => s + p.minutes, 0) - budget;
  if (drift > 0 && scaled.length > 0) {
    const last = scaled[scaled.length - 1];
    last.minutes = Math.max(1, last.minutes - drift);
  }
  return scaled;
}

export function stitchStageDecision(opts: {
  stages: StageSpec[];
  picks: StagePick[];
  state: UserState;
  guidanceLevel: "full" | "light" | "minimal";
  memory?: string;
}): FinalDecision {
  const { stages, picks, state, guidanceLevel, memory } = opts;
  const adoptedFrom: FinalDecision["adoptedFrom"] = [];
  const chosen: { spec: StageSpec; plan: TrainingPlan; lead: ExpertProposal }[] = [];

  for (const spec of stages) {
    const candidates = picks.filter(
      (p) => p.role === "plan" && p.stageIndex === spec.index && catalogPlan(p.proposal),
    );
    const lead = [...candidates].sort(
      (a, b) => b.proposal.matchScore * b.proposal.confidence - a.proposal.matchScore * a.proposal.confidence,
    )[0];
    const plan = lead ? catalogPlan(lead.proposal) : null;
    if (!lead || !plan) continue;
    chosen.push({ spec, plan, lead: lead.proposal });
    adoptedFrom.push({
      agentId: lead.proposal.agentId,
      agentName: lead.proposal.agentName,
      what: `第${spec.index}步「${spec.label}」目录模块「${plan.name}」`,
    });
  }

  if (chosen.length === 0) {
    throw new Error("No catalog stage pick");
  }

  const overlay = picks.find((p) => p.role === "overlay" && catalogPlan(p.proposal));
  const overlayPlan = overlay ? catalogPlan(overlay.proposal) : null;
  const lastPlan = chosen[chosen.length - 1].plan;
  const musicType = overlayPlan?.tunableParams.musicType ?? lastPlan.tunableParams.musicType;
  if (overlay && musicType) {
    adoptedFrom.push({
      agentId: overlay.proposal.agentId,
      agentName: overlay.proposal.agentName,
      what: `感官层点选目录已有声学「${musicType}」`,
    });
  }

  const breath =
    chosen.map((c) => c.lead.params.breathPattern ?? c.plan.tunableParams.breathPattern).find(Boolean);

  const rawPhases: PlanPhase[] = chosen.flatMap((c) =>
    c.plan.phases.map((ph) => ({
      ...ph,
      name: stages.length > 1 ? `${c.spec.label} · ${ph.name}` : ph.name,
    })),
  );
  const phases = scalePhases(rawPhases, state.availableMinutes);
  const durationMin = phases.reduce((s, p) => s + p.minutes, 0);
  const planName = chosen.map((c) => c.plan.name).join(" → ");

  const reasoning = [
    `按你说的顺序拼接现有疗法：${planName}。`,
    ...chosen.map(
      (c) =>
        `第${c.spec.index}步「${c.spec.label}」由 ${c.lead.agentName} 从目录选用「${c.plan.name}」，引导词沿用该模块原文。`,
    ),
    overlay && musicType
      ? `声音只点选目录已有项，不作曲、不生图。`
      : `没有新的声音或画面，只用各模块自带物料。`,
    `总时长 ${durationMin} 分钟，不超过你现在的 ${state.availableMinutes} 分钟。`,
    ...(memory ? [`结合你的训练记忆：${memory}。`] : []),
  ];

  return {
    planId: chosen[0].plan.id,
    planName,
    customized: {
      durationMin,
      breathPattern: breath,
      musicType,
      guidanceLevel,
      phases,
    },
    reasoning,
    adoptedFrom,
  };
}
