/**
 * LLM Provider 抽象层 —— 本脚手架最关键的扩展点。
 *
 * 密钥与端点写在 config/llm-apis.md（格式）和 config/llm-apis.local.md（本机密钥，不进 git）。
 * 环境变量可覆盖。所有 Agent 只依赖 LLMProvider 接口。
 */
import type {
  ChatTurn,
  ExtractedIntent,
  ExpertProposal,
  FinalDecision,
  IntentAnalysis,
  LLMConfig,
  UserState,
  GoalId,
} from "@contracts/agents";
import { llmEndpoint, loadLlmApiRegistry } from "../../lib/llm-apis";
import { orderedGoalIds } from "../consult-stages";

// ───────────────────────────── 接口定义 ─────────────────────────────

/** 专家 Agent 向 LLM 请求提案时的输入 */
export interface ProposeInput {
  expertId: string;
  expertName: string;
  domain: string;
  /** 领域视角提示词,见 experts/*.ts 里的 persona */
  persona: string;
  goalId: GoalId;
  state: UserState;
  candidatePlans: { planId: string; name: string; matchScore: number }[];
  /** 用户记忆摘要(近端训练/会诊历史),可为空 */
  memory?: string;
  /** 用户这一轮的原话(会诊由对话触发) */
  userMessage?: string;
  /** Tuno 给这位专家的分工任务 */
  task?: string;
  /** 允许即兴创作全新练习(现有模块都不贴切时) */
  allowInvent?: boolean;
  /** 完整现有疗法目录(含阶段/禁忌/可调参数)。专家必须先对照目录再延展。 */
  catalog?: {
    planId: string;
    name: string;
    category: string;
    durationMin: number;
    intensity: number;
    tagline: string;
    phases: string;
    tags: string[];
    contraindications: string[];
    tunable: { breathPattern?: string; musicType?: string; guidanceLevel?: string; voiceGender?: string };
    matchScore: number | null;
  }[];
}

/** Tuno 编排分析的输入 */
export interface AnalyzeInput {
  message: string;
  historyTail: string[];
  state: UserState;
  stateName?: string;
  stateDepiction?: string;
  memory?: string;
  preferences?: string;
  /** 可调配的专家名册 */
  experts: { expertId: string; expertName: string; domain: string; persona: string }[];
}

/** 用户 Agent 向 LLM 请求仲裁时的输入 */
export interface ArbitrateInput {
  goalId: GoalId;
  state: UserState;
  proposals: ExpertProposal[];
  principles: string[]; // 用户预设的仲裁原则,如 "睡眠优先"
  /** 用户记忆摘要,可为空 */
  memory?: string;
}

/** 单 Agent 回复生成的全量上下文 */
export interface ComposeReplyInput {
  /** 用户这一轮的原话 */
  message: string;
  /** 最近几轮对话(纯文本,旧→新) */
  historyTail: string[];
  intent: ExtractedIntent;
  /** 识别出的目标名,如 "减压平复" */
  goalLabel: string | null;
  topPlanNames: string[];
  /** 首选计划的可解释理由(来自匹配引擎) */
  topPlanWhy: string[];
  followUpQuestion: string | null;
  /** 用户记忆摘要(训练/会诊历史),可为空 */
  memory?: string;
  /** 训练偏好摘要(由记忆推导),可为空 */
  preferences?: string;
  /** 状态评测:状态的名字,如 "紧绷的弦" */
  stateName?: string;
  /** 状态评测:一句话白描 */
  stateDepiction?: string;
  /** 状态评测:系统此刻最需要什么 */
  stateNeed?: string;
}

export interface LLMProvider {
  readonly name: string;
  /** 从用户对话中抽取意图(目标/时长/状态线索) */
  extractIntent(message: string, history: ChatTurn[]): Promise<ExtractedIntent>;
  /** 生成单 Agent 的自然语言回复 */
  composeReply(input: ComposeReplyInput): Promise<string>;
  /** Tuno 编排:有序环节 + 按擅长派工。创作开关现行恒为关。 */
  analyze(input: AnalyzeInput): Promise<IntentAnalysis | null>;
  /** 专家 Agent 生成提案(LLM 模式);rule 模式下返回 null,由专家走模板 */
  propose(input: ProposeInput): Promise<ExpertProposal | null>;
  /** 用户 Agent 仲裁冲突(LLM 模式);rule 模式下返回 null,走加权规则 */
  arbitrate(input: ArbitrateInput): Promise<Pick<FinalDecision, "reasoning"> | null>;
}

// ───────────────────────────── 规则实现(默认,离线可跑) ─────────────────────────────

export class RuleBasedProvider implements LLMProvider {
  readonly name = "rule";

  async extractIntent(message: string, _history: ChatTurn[]): Promise<ExtractedIntent> {
    const { GOALS } = await import("../data/presets");
    const lower = message.toLowerCase();
    const goalIds = orderedGoalIds(message);
    const goalId: GoalId | null = goalIds[0] ?? null;
    const hitCount = goalId
      ? GOALS.find((g) => g.id === goalId)?.keywords.filter((k) => lower.includes(k.toLowerCase())).length ?? 0
      : 0;

    let availableMinutes: number | null = null;
    const m1 = lower.match(/(\d+)\s*(分钟|min|m\b)/);
    const m2 = lower.match(/半小时|半个小时/);
    const m3 = lower.match(/(一|1)\s*(个)?\s*小时/);
    if (m1) availableMinutes = parseInt(m1[1], 10);
    else if (m2) availableMinutes = 30;
    else if (m3) availableMinutes = 60;

    const stateHints: string[] = [];
    const hintDict: Record<string, string> = {
      焦虑: "高唤醒", 紧张: "高唤醒", 心慌: "高唤醒", 烦躁: "高唤醒",
      累: "低精力", 疲惫: "低精力", 困: "低精力",
      走神: "低专注", 涣散: "低专注", 拖延: "低专注",
    };
    for (const [k, v] of Object.entries(hintDict)) {
      if (lower.includes(k) && !stateHints.includes(v)) stateHints.push(v);
    }

    const confidence =
      (goalId ? 0.55 : 0) + Math.min(hitCount, 3) * 0.1 + (availableMinutes ? 0.15 : 0);

    return {
      goalId,
      goalIds,
      availableMinutes,
      stateHints,
      confidence: Math.min(confidence, 0.98),
    };
  }

  async composeReply(input: ComposeReplyInput): Promise<string> {
    if (input.followUpQuestion) return input.followUpQuestion;
    const [first, second] = input.topPlanNames;
    if (!first) return "我暂时没找到合适的计划,能再说说你的状态吗?";
    const stateLine = input.stateName
      ? `此刻的你有点像「${input.stateName}」——${input.stateDepiction}。`
      : "";
    const memLine = input.memory ? `我记得你:${input.memory}。` : "";
    const why = input.topPlanWhy[0] ? `${input.topPlanWhy[0]}。` : "";
    return (
      `${stateLine}${memLine}我想请你试试「${first}」${second ? `,要是不对劲我们还有「${second}」` : ""}——${why}` +
      `慢慢来,不着急。如果你想被更细致地照顾,我也可以召集几位专家,一起为你调一个更贴合的版本。`
    );
  }

  async analyze(_input: AnalyzeInput): Promise<IntentAnalysis | null> {
    return null;
  }

  async propose(): Promise<ExpertProposal | null> {
    return null; // rule 模式下专家用模板生成,见 experts/base-expert.ts
  }

  async arbitrate(): Promise<null> {
    return null; // rule 模式下用户 Agent 用加权规则仲裁,见 user-agent.ts
  }
}

// ───────────────────────────── OpenAI 兼容实现(Kimi / Qwen 共用骨架) ─────────────────────────────

export class OpenAICompatibleProvider implements LLMProvider {
  readonly name: string;
  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private temperature: number;
  private fallback = new RuleBasedProvider();
  /** 最近一次调用是否降级到了规则引擎(供思考链路如实呈现) */
  lastFallback: string | null = null;

  constructor(opts: { name: string; baseUrl: string; apiKey: string; model: string; temperature?: number }) {
    this.name = opts.name;
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.apiKey = opts.apiKey;
    this.model = opts.model;
    this.temperature = opts.temperature ?? 0.3;
  }

  /** 统一的 chat completion 调用,所有方法共用;遇到限流/5xx 自动退避重试(1.6s、5s 共两次) */
  private async chat(system: string, user: string, attempt = 0): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: this.temperature,
        max_tokens: 4096, // 思考型模型的 <think> 会占额度,留足空间防截断
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      // 免费档常见 3 RPM 限流:退避重试,避免无谓降级
      if ((res.status === 429 || res.status >= 500) && attempt < 3) {
        // 免费档 3 RPM:退避到下一个限流窗口
        await new Promise((r) => setTimeout(r, [1600, 8000, 22000][attempt]));
        return this.chat(system, user, attempt + 1);
      }
      throw new Error(`LLM ${this.name} HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    // 思考型模型(MiniMax-M2 / Qwen3 等)会先输出 <think>…</think>,剥掉再交给 JSON.parse
    return data.choices[0].message.content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  }

  /** 从模型输出里稳健地取出 JSON:剥思考块 → 剥 markdown 围栏 → 截取首个 { 到末个 } */
  protected parseJson<T>(raw: string): T {
    let s = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    try {
      return JSON.parse(s) as T;
    } catch (e) {
      console.warn(`[llm] ${this.name} call failed:`, e instanceof Error ? e.message : e);
      const start = s.indexOf("{");
      const end = s.lastIndexOf("}");
      if (start >= 0 && end > start) return JSON.parse(s.slice(start, end + 1)) as T;
      throw new Error("no json in output");
    }
  }

  async extractIntent(message: string, history: ChatTurn[]): Promise<ExtractedIntent> {
    this.lastFallback = null;
    const base = await this.fallback.extractIntent(message, history);
    try {
      const raw = await this.chat(
        `你是意图抽取器。用户的话可能与减压/专注/睡眠表面无关(如"早起的bgm""做饭的仪式感"),` +
          `请映射到最近的状态目标:calm=减压平复, focus=提升专注, sleep=睡前准备。` +
          `「停下工作/卸下工作/收工」是 calm,不是 focus。` +
          `用户说先A再B时,goalIds 必须按这个先后填两个,不要按关键词次数排序。只输出 JSON:` +
          `{"goalId":"calm|focus|sleep|null","goalIds":["calm|focus|sleep"],"availableMinutes":number|null,"stateHints":["高唤醒|低精力|低专注"],"confidence":0~1}`,
        `历史:${JSON.stringify(history.slice(-4))}\n用户:${message}`,
      );
      const p = this.parseJson<Partial<ExtractedIntent>>(raw);
      return {
        goalId: p.goalId ?? base.goalId,
        goalIds: Array.isArray(p.goalIds) && p.goalIds.length > 0 ? p.goalIds : base.goalIds,
        availableMinutes: p.availableMinutes ?? base.availableMinutes,
        stateHints: Array.isArray(p.stateHints) ? p.stateHints : base.stateHints,
        confidence: typeof p.confidence === "number" ? p.confidence : base.confidence,
      };
    } catch (e) {
      console.warn(`[llm] ${this.name} call failed:`, e instanceof Error ? e.message : e);
      this.lastFallback = "extractIntent";
      return base; // 降级到规则
    }
  }

  async composeReply(input: Parameters<LLMProvider["composeReply"]>[0]): Promise<string> {
    try {
      const raw = await this.chat(
        `你是 Tuno,一位温和的大脑状态引导者。气质接近安静的占卜师、深夜守灯人——` +
          `但你"占卜"的素材是真实的:NeuroBand 脑状态读数、状态评测、用户的训练记忆与偏好。` +
          `说话方式:先映照对方此刻的状态(一次准确的"被看见"),再自然地引出推荐方向——` +
          `如果给了推荐计划,必须轻轻点出首选计划的名字和它为什么适合此刻的ta(理由要翻译成人话),最后可轻提一句可以召集专家做更深的定制。` +
          `可以有画面感和一点诗意,但每句判断都必须落在给你的数据上,不编造神秘论断,不许承诺疗效。` +
          `语气禁忌(严格):教练/训练师口吻、说教、命令式、列表、感叹号、` +
          `禁止出现任何数字指标、百分比、分数(如"亲和度 95%""唤醒 84"这类话一个字都不能提),` +
          `禁止专业术语(交感神经、唤醒度、亲和度、神经系统等——全部翻译成身体感受的人话,如"身体还挂在高挡位")。` +
          `反面教材(绝不要这样写):"这个计划与你的目标非常契合,亲和度高达95%,适合你的唤醒度84"。` +
          `注意:给你的"状态评测/推荐理由"是内部评分材料,只能消化后转述成身体感受,绝不能照抄其中的数字与术语。` +
          `如果给了追问草稿,用同样的气质润色它。` +
          `不超过 90 字。只输出 JSON:{"reply":"..."}`,
        JSON.stringify({
          用户此刻说的话: input.message,
          对话前文: input.historyTail,
          识别出的意图: input.intent,
          目标: input.goalLabel,
          状态评测: input.stateName
            ? { 名字: input.stateName, 白描: input.stateDepiction, 此刻需要: input.stateNeed }
            : null,
          用户记忆: input.memory ?? null,
          训练偏好: input.preferences ?? null,
          推荐计划: input.topPlanNames,
          推荐理由: input.topPlanWhy,
          追问草稿: input.followUpQuestion,
        }),
      );
      const p = this.parseJson<{ reply?: string }>(raw);
      if (typeof p.reply === "string" && p.reply.trim()) return p.reply.trim();
      throw new Error("bad shape");
    } catch (e) {
      console.warn(`[llm] ${this.name} call failed:`, e instanceof Error ? e.message : e);
      this.lastFallback = "composeReply";
      return this.fallback.composeReply(input);
    }
  }

  async analyze(input: AnalyzeInput): Promise<IntentAnalysis | null> {
    try {
      const raw = await this.chat(
        `你是 Tuno,用户 Agent 的编排大脑。现行规则:只拼接现有疗法目录,禁止即兴新练习、禁止生图、禁止作曲。` +
          `1) 先判断有序环节,最多两步。有「先…再…」必须按这个顺序。每步映射到 calm/focus/sleep。` +
          `2) 按擅长派工,不要五人全上。减压/停下工作→Mira(expert_counsel);专注→Chen(expert_cogsci),必要时 Kai(expert_flow);睡前→Vega(expert_neuro)。` +
          `同一人可以领两步。Sona(expert_art)只负责【感官层】:点选目录已有 musicType/guidanceLevel,不创作。` +
          `每位专家的 task 必须以【第N步·calm|focus|sleep】或【感官层】开头。` +
          `3) creativityNeeded 必须为 false。` +
          `只输出 JSON:{"weights":{"calm":n,"focus":n,"sleep":n},"summary":"一句话理解含顺序(≤40字)",` +
          `"experts":[{"expertId":"...","reason":"...","task":"..."}],"creativityNeeded":false}`,
        JSON.stringify({
          用户原话: input.message,
          对话前文: input.historyTail,
          当下脑状态: input.state,
          状态评测: input.stateName ? `${input.stateName}:${input.stateDepiction}` : null,
          用户记忆: input.memory ?? null,
          训练偏好: input.preferences ?? null,
          专家名册: input.experts.map((e) => ({ id: e.expertId, 名字: e.expertName, 领域: e.domain, 视角: e.persona })),
        }),
      );
      const p = this.parseJson<{
        weights?: Partial<Record<GoalId, number>>;
        summary?: string;
        experts?: { expertId?: string; reason?: string; task?: string }[];
        creativityNeeded?: boolean;
      }>(raw);
      const validIds = new Set(input.experts.map((e) => e.expertId));
      const picked = (p.experts ?? []).filter(
        (e): e is { expertId: string; reason: string; task: string } =>
          typeof e.expertId === "string" && validIds.has(e.expertId) &&
          typeof e.reason === "string" && typeof e.task === "string",
      );
      const w = {
        calm: Math.max(0, Math.round(p.weights?.calm ?? 0)),
        focus: Math.max(0, Math.round(p.weights?.focus ?? 0)),
        sleep: Math.max(0, Math.round(p.weights?.sleep ?? 0)),
      };
      const total = w.calm + w.focus + w.sleep;
      if (total <= 0 || typeof p.summary !== "string" || !p.summary.trim() || picked.length === 0) {
        throw new Error("bad shape");
      }
      // 归一化到 100
      const weights = {
        calm: Math.round((w.calm / total) * 100),
        focus: Math.round((w.focus / total) * 100),
        sleep: Math.round((w.sleep / total) * 100),
      };
      weights.calm += 100 - (weights.calm + weights.focus + weights.sleep);
      const nameOf = new Map(input.experts.map((e) => [e.expertId, e.expertName]));
      return {
        weights,
        summary: p.summary.trim(),
        selectedExperts: picked.map((e) => ({
          expertId: e.expertId,
          expertName: nameOf.get(e.expertId) ?? e.expertId,
          reason: e.reason,
          task: e.task,
        })),
        creativityNeeded: false,
      };
    } catch (e) {
      console.warn(`[llm] ${this.name} call failed:`, e instanceof Error ? e.message : e);
      this.lastFallback = "analyze";
      return null; // 由调用方降级为规则分析
    }
  }

  async propose(input: ProposeInput): Promise<ExpertProposal | null> {
    try {
      const raw = await this.chat(
        `${input.persona}\n你是多专家会诊中的${input.domain}专家「${input.expertName}」。` +
          `用户 Agent Tuno 给你的分工是:${input.task ?? "从你的领域给出建议"}。` +
          `你已经拿到完整的现有疗法目录。必须先对照目录思考:哪一项最接近?如何延展时长/引导/呼吸/声音?` +
          `不要假装不知道某项疗法。必须从目录中选一个 planId(必须是目录里的 id),禁止 invented,禁止写新引导词/新曲子/新画面。` +
          `musicType 只能用该目录项已有的 tunable.musicType。时长可在用户预算内压缩。` +
          (input.memory ? `用户历史:${input.memory}。理由中可引用其历史。` : "") +
          `专业理由 80~120 字,只说你的领域视角,不说行话。` +
          `只输出 JSON:{"planId":"目录中的id","durationMin":number,"breathPattern":string|null,` +
          `"musicType":string|null,"guidanceLevel":"full|light|minimal","rationale":"...","confidence":0~1}`,
        JSON.stringify({
          用户原话: input.userMessage ?? null,
          goalId: input.goalId,
          当下脑状态: input.state,
          疗法目录: input.catalog ?? input.candidatePlans,
          用户记忆: input.memory ?? null,
        }),
      );
      const p = this.parseJson<{
        planId?: string;
        durationMin?: number;
        breathPattern?: string | null;
        musicType?: string | null;
        guidanceLevel?: string;
        rationale?: string;
        confidence?: number;
        invented?: {
          name?: string;
          scene?: string;
          durationMin?: number;
          phases?: { name?: string; minutes?: number; instruction?: string }[];
          breathPattern?: string | null;
          musicType?: string | null;
        };
      }>(raw);
      if (typeof p.rationale !== "string" || !p.rationale.trim()) throw new Error("bad shape");
      if (p.planId === "invented") throw new Error("invented disabled");

      const candidate =
        input.candidatePlans.find((c) => c.planId === p.planId) ??
        input.catalog?.find((c) => c.planId === p.planId);
      if (!candidate) throw new Error("bad shape");
      const catalogItem = input.catalog?.find((c) => c.planId === candidate.planId);
      const catalogMusic = catalogItem?.tunable.musicType;
      const catalogBreath = catalogItem?.tunable.breathPattern;
      return {
        agentId: input.expertId,
        agentName: input.expertName,
        domain: input.domain,
        planId: candidate.planId,
        params: {
          durationMin:
            typeof p.durationMin === "number"
              ? Math.max(3, Math.min(45, Math.round(p.durationMin)))
              : 10,
          ...(catalogBreath ? { breathPattern: catalogBreath } : p.breathPattern ? { breathPattern: p.breathPattern } : {}),
          ...(catalogMusic ? { musicType: catalogMusic } : {}),
          guidanceLevel: (["full", "light", "minimal"].includes(p.guidanceLevel ?? "")
            ? p.guidanceLevel
            : "light") as "full" | "light" | "minimal",
        },
        rationale: p.rationale.trim(),
        confidence:
          typeof p.confidence === "number" ? Math.max(0.3, Math.min(0.95, p.confidence)) : 0.7,
        matchScore: candidate.matchScore ?? 50,
      };
    } catch (e) {
      console.warn(`[llm] ${this.name} call failed:`, e instanceof Error ? e.message : e);
      this.lastFallback = `propose:${input.expertId}`;
      return null; // 由专家降级为模板提案
    }
  }

  async arbitrate(input: ArbitrateInput): Promise<Pick<FinalDecision, "reasoning"> | null> {
    try {
      const raw = await this.chat(
        `你是用户 Agent Tuno,正在把各环节的目录模块拼成一条训练。` +
          `不要改成只留一个赢家。说明第1步/第2步各用了哪项目录、为什么这个顺序、声音是否只点选了已有物料。` +
          `禁止提到即兴创作、生图、作曲。` +
          (input.memory ? `用户历史:${input.memory}——理由中至少一条结合其历史。` : "") +
          `中文,每条不超过 40 字,诚实呈现权衡。只输出 JSON:{"reasoning":["...","..."]}`,
        JSON.stringify({
          goalId: input.goalId,
          state: input.state,
          proposals: input.proposals.map((p) => ({
            agent: p.agentName,
            domain: p.domain,
            planId: p.planId,
            params: p.params,
            confidence: p.confidence,
            matchScore: p.matchScore,
            rationale: p.rationale,
          })),
          principles: input.principles,
          userMemory: input.memory ?? null,
        }),
      );
      const p = this.parseJson<{ reasoning?: unknown }>(raw);
      if (
        Array.isArray(p.reasoning) &&
        p.reasoning.length > 0 &&
        p.reasoning.every((x) => typeof x === "string")
      ) {
        return { reasoning: p.reasoning as string[] };
      }
      throw new Error("bad shape");
    } catch (e) {
      console.warn(`[llm] ${this.name} call failed:`, e instanceof Error ? e.message : e);
      this.lastFallback = "arbitrate";
      return null; // 走加权规则仲裁
    }
  }
}

// ───────────────────────────── 工厂 ─────────────────────────────

/** 各 provider 的默认接入点(用户只填 key 即可,其余自动补全) */
export const PROVIDER_DEFAULTS: Record<"kimi" | "qwen" | "minimax", { baseUrl: string; model: string; temperature?: number }> = {
  kimi: { baseUrl: "https://api.moonshot.cn/v1", model: "kimi-k3", temperature: 1 },
  qwen: { baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus" },
  minimax: { baseUrl: "https://api.minimaxi.com/v1", model: "MiniMax-M2" },
};

function registryDefaults(id: "kimi" | "qwen" | "minimax") {
  const ep = llmEndpoint(id);
  return {
    baseUrl: ep?.baseUrl || PROVIDER_DEFAULTS[id].baseUrl,
    model: ep?.model || PROVIDER_DEFAULTS[id].model,
    temperature: ep?.temperature ?? PROVIDER_DEFAULTS[id].temperature,
    apiKey: ep?.apiKey,
  };
}

/** 服务端 MiniMax 凭证(TTS 复用;GroupId 只来自 local md / env) */
export function builtinMinimax(): { apiKey: string; groupId: string | undefined } {
  const tts = llmEndpoint("minimax-tts");
  const chat = llmEndpoint("minimax");
  return {
    apiKey: process.env.MINIMAX_API_KEY || tts?.apiKey || chat?.apiKey || "",
    groupId: process.env.MINIMAX_GROUP_ID || tts?.groupId,
  };
}

/** 冥想引导 TTS：有声书女声 + 慢语速。voice/speed 可被 config/llm-apis*.md 覆盖。 */
export function minimaxTtsVoice(): {
  model: string;
  voiceId: string;
  speed: number;
  vol: number;
  pitch: number;
} {
  const tts = llmEndpoint("minimax-tts");
  const speedRaw = tts?.extra?.speed ? Number(tts.extra.speed) : 0.75;
  return {
    model: tts?.model || "speech-02-hd",
    voiceId: tts?.voiceId || "audiobook_female_1",
    speed: Number.isFinite(speedRaw) ? Math.min(1.2, Math.max(0.5, speedRaw)) : 0.75,
    vol: 0.9,
    pitch: 0,
  };
}

let cached: LLMProvider | null = null;

/**
 * 获取 LLM Provider。
 * - 传了 override(前端用户填的 key)且有 apiKey → 按请求新建实例,不缓存、不落盘
 * - 否则走 config/llm-apis.local.md 与 env(缓存);都没有则规则引擎
 */
export function getLLMProvider(override?: LLMConfig): LLMProvider {
  if (override && override.provider === "rule") return new RuleBasedProvider();
  if (override) {
    const defaults = registryDefaults(override.provider as "kimi" | "qwen" | "minimax");
    const apiKey = override.apiKey || defaults.apiKey;
    if (apiKey) {
      return new OpenAICompatibleProvider({
        name: override.provider,
        baseUrl: override.baseUrl || defaults.baseUrl,
        apiKey,
        model: override.model || defaults.model,
        temperature: defaults.temperature,
      });
    }
  }
  if (cached) return cached;
  const registry = loadLlmApiRegistry();
  const kind = (process.env.LLM_PROVIDER || registry.defaultProvider) as "kimi" | "qwen" | "minimax" | "rule";
  if (kind === "rule") {
    cached = new RuleBasedProvider();
    return cached;
  }
  const defaults = registryDefaults(kind);
  const apiKey = process.env.LLM_API_KEY || defaults.apiKey;
  const baseUrl = process.env.LLM_BASE_URL || defaults.baseUrl;
  const model = process.env.LLM_MODEL || defaults.model;

  if (apiKey && baseUrl && model) {
    cached = new OpenAICompatibleProvider({
      name: kind,
      baseUrl,
      apiKey,
      model,
      temperature: defaults.temperature,
    });
  } else {
    cached = new RuleBasedProvider();
  }
  return cached;
}
