/**
 * 5 位专家 Agent:脑科学 / 认知科学 / 心流体验 / 心理咨询 / 艺术与创作。
 *
 * 每位专家都会看到完整的现有疗法目录,先对照目录再按领域延展。
 * Sona 同时承担艺术疗愈与即兴创作;Mira 是心理咨询取向的陪伴者。
 */
import type { ExpertProposal, TrainingPlan } from "@contracts/agents";
import { BaseExpert, type ExpertContext } from "./base-expert";

// ── 1. 脑科学:自主神经、唤醒调节、神经可塑性 ─────────────────────────
export class NeuroscienceExpert extends BaseExpert {
  readonly id = "expert_neuro";
  readonly name = "Dr. Vega";
  readonly domain = "脑科学";
  readonly persona =
    "你是神经科学家,以自主神经系统(交感/副交感)和脑电节律为决策依据。" +
    "你会先阅读完整的现有疗法目录,从生理机制上判断哪一项最对症,再延展剂量与呼吸参数。" +
    "你优先选择有直接生理证据的干预路径,关注唤醒的下行通道。";
  protected preferredPlanIds = ["breath-478", "breath-box", "breath-bloom", "nidra-restore", "sound-downshift", "pmr-release", "grounding-54321"];

  protected customize(plan: TrainingPlan, ctx: ExpertContext) {
    const { state } = ctx;
    const highArousal = state.arousal >= 65;
    const rationale = highArousal
      ? `Arousal ${state.arousal} 表明交感神经占优。生理上最快的下行通路是延长呼气` +
        `(刺激迷走神经)——「${plan.name}」直接作用于这条通路。` +
        (state.sleepHours < 6.5
          ? ` 但注意:睡眠 ${state.sleepHours}h 时神经可塑性窗口变窄,单次干预不宜超过 15 分钟。`
          : "")
      : `Arousal ${state.arousal} 不算失控,但 Calm ${state.calm} 显示副交感基线偏低。` +
        `「${plan.name}」可以温和重建迷走神经张力,而不是强行压制唤醒。`;

    const basePattern = plan.tunableParams.breathPattern;
    const breathPattern =
      basePattern && state.arousal >= 80 && /7|box/.test(basePattern)
        ? "4-6(免屏息)"
        : basePattern;

    return {
      params: {
        durationMin: state.sleepHours < 6.5 ? Math.min(plan.durationMin, 15) : plan.durationMin,
        ...(breathPattern ? { breathPattern } : {}),
      } as ExpertProposal["params"],
      rationale,
      confidence: highArousal ? 0.88 : 0.7,
    };
  }
}

// ── 2. 认知科学:注意力资源、认知负荷、行为塑造 ───────────────────────
export class CognitiveScienceExpert extends BaseExpert {
  readonly id = "expert_cogsci";
  readonly name = "Dr. Chen";
  readonly domain = "认知科学";
  readonly persona =
    "你是认知科学家,关注注意力资源、认知负荷与习惯塑造。" +
    "你会先阅读完整的现有疗法目录,判断每项练习的认知代价,再延展时长与引导强度。" +
    "你强调干预的长度和认知要求必须匹配用户当前的认知余量,疲劳时不安排高认知负荷练习。";
  protected preferredPlanIds = ["imagery-safeplace", "scan-progressive", "nidra-restore", "ritual-offwork", "drift-stars", "coffee-nap", "loving-kindness"];

  protected customize(plan: TrainingPlan, ctx: ExpertContext) {
    const { state, goal } = ctx;
    const cognitivelyCheap = state.sleepHours < 6.5 || state.focus < 50;
    const durationMin = cognitivelyCheap
      ? Math.min(plan.durationMin, 10)
      : plan.durationMin;

    const rationale = cognitivelyCheap
      ? `用户睡眠 ${state.sleepHours}h、Focus ${state.focus},工作记忆容量受限。` +
        `「${plan.name}」的引导式结构把认知负荷外化给音频,不占用本已紧张的注意资源。` +
        `建议压缩到 ${durationMin} 分钟——超过认知余量的练习只会变成新的负担。`
      : `目标「${goal.label}」需要注意力系统的温和重建。「${plan.name}」的结构化引导` +
        `符合注意力恢复理论(ART)中"软 fascination"的剂量要求,${durationMin} 分钟是有效下限。`;

    return {
      params: {
        durationMin,
        guidanceLevel: cognitivelyCheap ? "full" : "light",
      } as ExpertProposal["params"],
      rationale,
      confidence: cognitivelyCheap ? 0.82 : 0.74,
    };
  }
}

// ── 3. 心流体验:挑战-技能平衡、沉浸、内在动机 ───────────────────────
export class FlowExperienceExpert extends BaseExpert {
  readonly id = "expert_flow";
  readonly name = "Kai";
  readonly domain = "心流体验";
  readonly persona =
    "你是心流体验设计师。你会先阅读完整的现有疗法目录,看哪一项的难度刚好落在'踮踮脚够得着'的区间。" +
    "太简单会无聊,太难会焦虑。你延展的是入口门槛、引导密度和完成感,让人愿意沉浸、并且明天还想再来。";
  protected preferredPlanIds = ["ripple-tap", "sound-morning", "breath-bloom", "imagery-safeplace", "ritual-offwork", "morning-prime", "walk-mindful"];

  protected customize(plan: TrainingPlan, ctx: ExpertContext) {
    const { state } = ctx;
    const lowBandwidth = state.sleepHours < 6.5 || state.arousal >= 75;
    const durationMin = lowBandwidth ? Math.min(plan.durationMin, 12) : plan.durationMin;
    const rationale = lowBandwidth
      ? `心流的第一条戒律是别让人在入口就失败。此刻认知与情绪带宽都很窄,` +
        `所以「${plan.name}」要压缩到 ${durationMin} 分钟、引导给足——先拿到一次完整的完成感,` +
        `沉浸才有发生的土壤。`
      : `状态余量不错,可以把「${plan.name}」的挑战度往上调一点:减少引导、拉长静默段,` +
        `让用户自己走进去——自主进入的沉浸,留存率远高于被全程搀扶的体验。`;

    return {
      params: {
        durationMin,
        guidanceLevel: lowBandwidth ? "full" : "light",
      } as ExpertProposal["params"],
      rationale,
      confidence: 0.76,
    };
  }
}

// ── 4. 心理咨询:承接、命名、安全、不替代专业治疗 ──────────────────
export class CounselingExpert extends BaseExpert {
  readonly id = "expert_counsel";
  readonly name = "Mira";
  readonly domain = "心理咨询";
  readonly persona =
    "你是心理咨询取向的陪伴者,不是诊断医生,也不替代危机干预。" +
    "你会先阅读完整的现有疗法目录,判断此刻更需要被看见、被命名,还是已经适合做一个具体练习。" +
    "你关注安全感、可承受性、情绪滴定:高唤醒时避免深度内观或长时间静默;" +
    "练习是咨询里的一个小实验——可停下、做完有收尾,不能拿来压住情绪。" +
    "理由里要说清:这个人现在处于什么心理位置,为什么目录里这一项是可承受的,以及你如何延展(缩短、加强引导、加一句允许停下)。";
  protected preferredPlanIds = [
    "grounding-54321",
    "loving-kindness",
    "imagery-safeplace",
    "scan-progressive",
    "walk-mindful",
    "nidra-restore",
    "pmr-release",
  ];

  protected customize(plan: TrainingPlan, ctx: ExpertContext) {
    const { state, goal } = ctx;
    const fragile = state.arousal >= 70 || state.sleepHours < 5.5 || state.calm < 40;
    const durationMin = fragile ? Math.min(plan.durationMin, 8) : Math.min(plan.durationMin, 12);
    const rationale = fragile
      ? `这一刻更像需要被接住,而不是被训练。唤醒 ${state.arousal}、平静 ${state.calm},` +
        `如果一上来做高强度练习,很容易变成对自己的又一次要求。` +
        `目录里的「${plan.name}」侵入性较低,我建议压到 ${durationMin} 分钟、引导给满,` +
        `并明确告诉对方:中途可以停,停下来也算完成。这不是治疗,是先让神经系统有一块落脚的地方。`
      : `情绪位置相对站得住,可以在「${plan.name}」上做一点咨询式延展:` +
        `先用一两分钟命名此刻的感受,再进入原有阶段,收尾时问一句「身体里有没有哪里松了一点」。` +
        `目标仍是「${goal.label}」,但练习服务于被理解,而不是打卡。`;

    return {
      params: {
        durationMin,
        guidanceLevel: "full",
      } as ExpertProposal["params"],
      rationale,
      confidence: fragile ? 0.84 : 0.73,
    };
  }
}

// ── 5. 艺术 + 创作:通感安抚,必要时即兴写一个为此刻而生的练习 ──────
export class ArtTherapyExpert extends BaseExpert {
  readonly id = "expert_art";
  readonly name = "Sona";
  readonly domain = "艺术与创作";
  readonly persona =
    "你同时是艺术疗愈师。你会先阅读完整的现有疗法目录," +
    "用通感判断哪一项已有的声音、意象、色彩和此刻同步。" +
    "现行阶段只点选目录里已有的 musicType、引导强度和封面/交互,不写新练习、不生图、不作曲。" +
    "你相信一个对的现成意象,比十句新写的'放松'更能让人松手。";
  protected preferredPlanIds = [
    "drift-stars",
    "sound-downshift",
    "imagery-safeplace",
    "scan-progressive",
    "nidra-restore",
    "sound-morning",
    "walk-mindful",
    "loving-kindness",
    "ritual-offwork",
    "grounding-54321",
  ];
  protected override readonly supportsInvention = true;

  protected customize(plan: TrainingPlan, ctx: ExpertContext) {
    const { state, goal } = ctx;
    const musicType = plan.tunableParams.musicType;
    const rationale =
      `目录里「${plan.name}」已有通感物料,我只做点选:` +
      (musicType ? `沿用它已有的声学「${musicType}」` : `它没有单独声轨槽位,就用模块自带的引导与画面`) +
      `，不另写曲子、不另生图、不另编引导词。` +
      `目标仍是「${goal.label}」,Arousal ${state.arousal} 时选这一项是因为它已经在目录里。`;

    return {
      params: {
        durationMin: Math.min(plan.durationMin, ctx.state.availableMinutes),
        ...(musicType ? { musicType } : {}),
        guidanceLevel: plan.tunableParams.guidanceLevel ?? "light",
      } as ExpertProposal["params"],
      rationale,
      confidence: 0.8,
    };
  }
}

export function createExperts(): BaseExpert[] {
  return [
    new NeuroscienceExpert(),
    new CognitiveScienceExpert(),
    new FlowExperienceExpert(),
    new CounselingExpert(),
    new ArtTherapyExpert(),
  ];
}
