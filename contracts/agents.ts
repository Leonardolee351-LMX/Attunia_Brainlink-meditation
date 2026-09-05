/**
 * NeuroFlow Agent Lab — 领域契约（前后端共享）
 *
 * 这里是单 Agent 与 A2A 多专家会诊共用的"语言":
 * 目标、训练计划、用户状态、提案、会诊记录、最终决策。
 * 后续接入真实 LLM 时,这些结构即 prompt 的输入/输出 schema。
 */

// ───────────────────────────── 用户目标(预设 3 个) ─────────────────────────────

export type GoalId = "calm" | "focus" | "sleep";

export interface Goal {
  id: GoalId;
  label: string;
  /** 一句话描述这个目标的典型用户处境 */
  description: string;
  /** 规则匹配用的关键词(LLM 接入后作为意图识别的 fallback / few-shot 语料) */
  keywords: string[];
  /** 期望的状态迁移方向,供匹配引擎计算 stateFit */
  desiredShift: {
    arousal: "down" | "up" | "keep";
    focus: "up" | "keep";
    calm: "up" | "keep";
  };
}

// ───────────────────────────── 训练计划(预设 5 类) ─────────────────────────────

export type PlanCategory =
  | "breathwork" // 呼吸调节
  | "body_scan" // 正念身体扫描
  | "soundscape" // 音景/音乐疗愈
  | "guided_imagery" // 引导意象
  | "yoga_nidra"; // 瑜伽休息术

export interface PlanPhase {
  name: string;
  minutes: number;
  instruction: string;
}

export interface TrainingPlan {
  id: string;
  category: PlanCategory;
  /** 大标题 */
  name: string;
  /** 小标题(一句话场景感) */
  subtitle: string;
  /** 面向用户的标签,如 ["快速平复","通勤可做"] */
  tags: string[];
  /** 封面渐变色(模块封面用) */
  cover: { from: string; to: string };
  tagline: string;
  durationMin: number;
  intensity: 1 | 2 | 3; // 1 温和 2 中等 3 较强
  phases: PlanPhase[];
  /** 与每个目标的先天亲和度 0~1 */
  goalAffinity: Record<GoalId, number>;
  /** 状态适配规则:由匹配引擎解释执行 */
  stateFit: {
    /** 适合的 arousal 区间 [min, max] */
    arousalRange: [number, number];
    /** arousal 超出区间时的惩罚系数 0~1 */
    outOfRangePenalty: number;
    /** 至少需要多少冷静基线(过低说明用户太激动,先做 downgrade) */
    minCalm?: number;
  };
  /** 可被 Agent 定制的参数槽位——专家 Agent 提案时填这些 */
  tunableParams: {
    breathPattern?: string; // 如 "4-7-8" / "box"
    musicType?: string; // 如 "brown-noise" / "binaural-40hz" / "ambient-piano"
    guidanceLevel?: "full" | "light" | "minimal";
    voiceGender?: "female" | "male";
  };
  contraindications: string[];
  /** 交互式模块:训练中渲染对应的动效引导组件(参考 Endel / Vibes 的交互范式) */
  interactive?: "bloom" | "ripples" | "drift";
}

// ───────────────────────────── 训练中生物数据记录 & 赛后复盘 ─────────────────────────────

/** 隐形记录器每秒采一个点(脚手架阶段为模拟数据流) */
export interface BioSample {
  t: number; // 训练内秒数
  arousal: number;
  focus: number;
  calm: number;
}

export interface SessionInsight {
  icon: string;
  title: string;
  detail: string;
  /** good=表现好 nudge=温和提醒 */
  tone: "good" | "nudge";
}

export interface SessionDebrief {
  summary: string;
  deltas: { arousal: number; focus: number; calm: number };
  highlights: { label: string; value: string }[];
  insights: SessionInsight[];
  nextSuggestion: {
    planId: string | null;
    planName: string | null;
    reason: string;
    consultSuggested: boolean;
  };
  engine: string;
}

// ───────────────────────────── 用户上下文 / 状态 ─────────────────────────────

export interface UserState {
  /** 0~100,来自 NeuroBand(原型阶段为模拟值) */
  arousal: number;
  focus: number;
  calm: number;
  sleepHours: number;
  /** 本次可用时长(分钟) */
  availableMinutes: number;
}

export interface UserProfile {
  userId: string;
  name: string;
  preference: {
    guidanceLevel: "full" | "light" | "minimal";
    voiceGender: "female" | "male";
    dislikedCategories: PlanCategory[];
  };
  /** 个人化先验:Nova 长期学到的规律(脚手架阶段写死示例) */
  personalPatterns: string[];
}

// ───────────────────────────── Agent 间消息(A2A 协议) ─────────────────────────────

export type AgentRole =
  | "user_agent" // 用户 Agent(Nova),代表用户
  | "expert" // 专家 Agent
  | "system";

export interface AgentMessage {
  id: string;
  from: string; // agent id
  fromName: string;
  to: string; // agent id 或 "broadcast"
  role: AgentRole;
  /** ask=主Agent征询 proposal=专家提案 challenge=质疑/冲突 summary=决策 */
  kind: "ask" | "proposal" | "challenge" | "decision" | "note";
  content: string;
  /** 该消息携带的结构化载荷(提案、冲突等) */
  payload?: unknown;
}

/** 专家即兴创作的全新冥想练习(候选计划都不合适时) */
export interface InventedPractice {
  name: string;
  /** 场景白描:这个练习把用户带去哪里 */
  scene: string;
  durationMin: number;
  phases: PlanPhase[];
  breathPattern?: string;
  musicType?: string;
  guidanceLevel: "full" | "light" | "minimal";
}

export interface ExpertProposal {
  agentId: string;
  agentName: string;
  domain: string; // 专业领域,如 "认知科学"
  /** 取自候选计划;即兴创作时为 "invented" */
  planId: string;
  /** 即兴创作的练习(planId === "invented" 时必带) */
  invented?: InventedPractice;
  /** 专家基于领域知识定制的参数 */
  params: TrainingPlan["tunableParams"] & { durationMin: number };
  /** 专业理由(面向用户可解释) */
  rationale: string;
  /** 0~1,专家对该提案的把握 */
  confidence: number;
  /** 0~100,匹配引擎算出的客观适配分 */
  matchScore: number;
}

export interface AgentConflict {
  topic: string;
  agents: { agentId: string; agentName: string; position: string }[];
  resolution?: string;
}

export interface FinalDecision {
  planId: string;
  planName: string;
  customized: {
    durationMin: number;
    breathPattern?: string;
    musicType?: string;
    guidanceLevel: string;
    phases: PlanPhase[];
  };
  /** Nova 的决策说明:采纳了谁、为什么、放弃了什么 */
  reasoning: string[];
  adoptedFrom: { agentId: string; agentName: string; what: string }[];
}

/** Nova 对用户诉求的编排分析:需求配比 + 专家选派 + 分工 */
export interface IntentAnalysis {
  /** 需求构成百分比(减压/专注/睡前),总和 100 */
  weights: Record<GoalId, number>;
  /** Nova 对用户诉求的一句话理解 */
  summary: string;
  /** 选派哪些专家、为什么、各负责什么 */
  selectedExperts: { expertId: string; expertName: string; reason: string; task: string }[];
  /** 是否鼓励专家即兴创作新练习(现有模块都不贴切时) */
  creativityNeeded: boolean;
}

export interface ConsultResult {
  goalId: GoalId;
  state: UserState;
  /** Nova 的编排分析(需求配比、专家选派) */
  analysis: IntentAnalysis;
  transcript: AgentMessage[];
  proposals: ExpertProposal[];
  conflicts: AgentConflict[];
  decision: FinalDecision;
  /** 本次会诊使用的 LLM 引擎(rule / kimi / qwen / minimax) */
  engine: string;
}

// ───────────────────────────── 单 Agent 对话 ─────────────────────────────

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** 前端可填写的 LLM 配置:仅存浏览器 localStorage,随请求带给后端,不落服务器 */
export interface LLMConfig {
  provider: "rule" | "kimi" | "qwen" | "minimax";
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

/** Nova 思考链路的一步(可视化脚手架的信息处理过程) */
export interface NovaTraceStep {
  key: "intent" | "state" | "memory" | "decision" | "match" | "reply";
  title: string;
  detail: string;
  /** 这一步由谁完成:rule / kimi / qwen / matching-rules */
  engine?: string;
  /** 补充行,如各候选得分明细 */
  extra?: string[];
}

export interface ExtractedIntent {
  goalId: GoalId | null;
  /** 多目标意图:如 "先放松再专注" → ["calm","focus"],触发组合方案 */
  goalIds: GoalId[];
  availableMinutes: number | null;
  /** 从对话中读到的状态线索,如 "焦虑" "失眠" */
  stateHints: string[];
  /** 0~1,意图识别置信度,低置信度时单 Agent 应追问 */
  confidence: number;
}

/** 跨状态组合方案:如"先平复 → 再专注" */
export interface ComboRecommendation {
  title: string;
  goalIds: GoalId[];
  steps: { planId: string; name: string; minutes: number; plan: TrainingPlan }[];
  totalMin: number;
  rationale: string;
}

export interface ScoredPlan {
  plan: TrainingPlan;
  score: number; // 0~100
  breakdown: {
    goalAffinity: number;
    stateFit: number;
    durationFit: number;
  };
  why: string[]; // 可解释的推荐理由
}

export interface ChatAgentReply {
  reply: string;
  intent: ExtractedIntent;
  /** 命中推荐时给出 top N(单目标) */
  recommendations: ScoredPlan[];
  /** 多目标时的组合方案(与 recommendations 二选一) */
  combo: ComboRecommendation | null;
  /** 需要用户补充的信息(低置信度追问) */
  followUpQuestion: string | null;
  /** 本次回复由哪个 provider 生成(rule / kimi / qwen) */
  engine: string;
  /** Nova 的思考链路:意图识别 → 状态合成 → 路径决策 → 匹配计算 → 回复生成 */
  trace: NovaTraceStep[];
}


// ───────────────────────────── 用户记忆 ─────────────────────────────

/** 一次完成的训练(训练结束页由前端记录) */
export interface SessionRecord {
  planId: string;
  planName: string;
  goalId: GoalId | null;
  durationMin: number;
  /** ISO 时间 */
  at: string;
  arousalStart: number;
  arousalEnd: number;
}

/** 一次 A2A 会诊的结论(会诊页记录) */
export interface ConsultRecord {
  goalId: GoalId;
  planId: string;
  planName: string;
  at: string;
}

/** Nova 对用户的长期记忆(脚手架阶段存浏览器 localStorage) */
export interface UserMemory {
  sessions: SessionRecord[];
  consults: ConsultRecord[];
}

export const EMPTY_MEMORY: UserMemory = { sessions: [], consults: [] };

export interface MemorySummary {
  totalSessions: number;
  totalConsults: number;
  /** 训练次数最多的目标 */
  favoriteGoal: GoalId | null;
  favoriteCount: number;
  lastSession: SessionRecord | null;
  /** 唤醒下降的训练占比 0~1 */
  improveRate: number | null;
  avgDurationMin: number | null;
}

const GOAL_LABELS: Record<GoalId, string> = { calm: "减压平复", focus: "提升专注", sleep: "睡前准备" };

/** 最近练过的 n 个计划 id(供匹配引擎做多样性降权) */
export function recentPlanIds(m: UserMemory | undefined, n = 3): string[] {
  if (!m) return [];
  return m.sessions.slice(-n).map((s) => s.planId);
}

export function summarizeMemory(m: UserMemory): MemorySummary {
  const total = m.sessions.length;
  const byGoal = new Map<GoalId, number>();
  for (const s of m.sessions) {
    if (s.goalId) byGoal.set(s.goalId, (byGoal.get(s.goalId) ?? 0) + 1);
  }
  let favoriteGoal: GoalId | null = null;
  let favoriteCount = 0;
  for (const [g, c] of byGoal) {
    if (c > favoriteCount) {
      favoriteGoal = g;
      favoriteCount = c;
    }
  }
  const improved = m.sessions.filter((s) => s.arousalEnd < s.arousalStart).length;
  return {
    totalSessions: total,
    totalConsults: m.consults.length,
    favoriteGoal,
    favoriteCount,
    lastSession: m.sessions.length > 0 ? m.sessions[m.sessions.length - 1] : null,
    improveRate: total > 0 ? improved / total : null,
    avgDurationMin: total > 0 ? Math.round(m.sessions.reduce((x, s) => x + s.durationMin, 0) / total) : null,
  };
}

/** 给 LLM prompt / 规则模板 / 思考链路共用的一句话记忆摘要 */
export function memoryToText(m: UserMemory): string {
  const s = summarizeMemory(m);
  if (s.totalSessions === 0 && s.totalConsults === 0) return "";
  const parts: string[] = [];
  if (s.totalSessions > 0) {
    parts.push(`累计完成 ${s.totalSessions} 次训练`);
    if (s.favoriteGoal) parts.push(`最常练「${GOAL_LABELS[s.favoriteGoal]}」(${s.favoriteCount} 次)`);
    if (s.improveRate !== null) parts.push(`${Math.round(s.improveRate * 100)}% 的训练后唤醒下降`);
    if (s.lastSession) {
      const d = s.lastSession.arousalStart - s.lastSession.arousalEnd;
      parts.push(
        `最近一次是「${s.lastSession.planName}」${s.lastSession.durationMin} 分钟,唤醒 ${s.lastSession.arousalStart}→${s.lastSession.arousalEnd}${d > 0 ? `(降 ${d})` : ""}`,
      );
    }
  }
  if (s.totalConsults > 0) parts.push(`做过 ${s.totalConsults} 次 A2A 会诊`);
  return parts.join(";");
}
