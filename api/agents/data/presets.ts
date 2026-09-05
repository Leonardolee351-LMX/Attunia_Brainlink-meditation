/**
 * 预设语料:3 个用户目标 + 8 个冥想训练模块(5 大类)。
 *
 * 目标文案面向真实生活场景;关键词表是意图识别的 mapping 基础——
 * 用户说"早起的 bgm""做饭的仪式感"这类与减压/升压表面无关的话,
 * 通过这里的关键词映射到三个状态目标;LLM 接入后此表作为 fallback。
 *
 * 每个训练模块都带完整的引导脚本(phases[].instruction),
 * 参考冥想音频的语言方式:第二人称、现在时、短句、不评判。
 */
import type { Goal, TrainingPlan, UserProfile } from "@contracts/agents";

// ───────────────────────────── 3 个最常见目标 ─────────────────────────────

export const GOALS: Goal[] = [
  {
    id: "calm",
    label: "减压平复",
    description: "大脑思考过载、感到焦虑不安、承载了超出自己能力的事、身体紧绷",
    keywords: [
      "焦虑", "紧张", "压力", "烦躁", "紧绷", "放松", "平静", "过载", "不安",
      "心慌", "烦", "崩溃", "平复", "冷静", "calm", "anxious", "stress",
      "overwhelmed", "喘口气", "缓一缓", "停下工作", "卸下工作", "放下工作", "收工",
    ],
    desiredShift: { arousal: "down", focus: "keep", calm: "up" },
  },
  {
    id: "focus",
    label: "提升专注",
    description: "准备开始工作了,需要从当下状态过渡、进入工作节奏",
    keywords: [
      "专注", "走神", "注意力", "工作", "学习", "效率", "心流", "写方案",
      "拖延", "涣散", "进入状态", "早起", "早晨", "清晨", "开工", "工作前",
      "上班", "focus", "concentrate", "晨间",
    ],
    desiredShift: { arousal: "keep", focus: "up", calm: "up" },
  },
  {
    id: "sleep",
    label: "睡前准备",
    description: "下班了、要休息了,需要从工作状态转换到休息状态",
    keywords: [
      "睡", "失眠", "困", "累", "疲惫", "恢复", "休息", "熬夜", "睡前",
      "精力", "回血", "下班", "转换", "切换", "晚安", "做饭", "氛围",
      "仪式感", "晚上", "sleep", "tired", "insomnia",
    ],
    desiredShift: { arousal: "down", focus: "keep", calm: "up" },
  },
];

// ───────────────────────────── 8 个冥想训练模块(5 大类) ─────────────────────────────

export const PLANS: TrainingPlan[] = [
  {
    id: "breath-478",
    category: "breathwork",
    name: "4-7-8 生理刹车",
    subtitle: "心跳很快、脑子很乱的时候,先用呼吸把身体「刹住」",
    tags: ["快速平复", "8分钟", "任何场合"],
    cover: { from: "#dfe9dc", to: "#b9cfbb" },
    tagline: "通过延长呼气直接下调交感神经,最快的降唤醒手段",
    durationMin: 8,
    intensity: 1,
    phases: [
      {
        name: "安顿",
        minutes: 1,
        instruction:
          "找一个能靠住的地方坐下。把舌尖轻轻抵在上颚。现在,用嘴把肺里的气全部呼出去,像放掉一个憋了很久的气球。",
      },
      {
        name: "4-7-8 循环",
        minutes: 6,
        instruction:
          "用鼻子安静吸气,心里数 4——屏住,数 7——噘起嘴唇,缓缓呼出,数 8,发出很轻的「呼」声。不需要完美,数乱了就从下一次呼吸重新开始。",
      },
      {
        name: "自然呼吸",
        minutes: 1,
        instruction:
          "现在把数数的任务放下。让呼吸自己流动,你只是看着它。注意你的心跳——它比一分钟前慢了一点。",
      },
    ],
    goalAffinity: { calm: 0.95, focus: 0.55, sleep: 0.85 },
    stateFit: { arousalRange: [55, 100], outOfRangePenalty: 0.35 },
    tunableParams: { breathPattern: "4-7-8", guidanceLevel: "light" },
    contraindications: ["屏息不适者改用 4-6 呼吸", "孕期避免长屏息"],
  },
  {
    id: "breath-box",
    category: "breathwork",
    name: "箱式呼吸 · 专注前奏",
    subtitle: "开工前的四方形呼吸,把散落的注意力收拢成一个点",
    tags: ["工作前过渡", "6分钟", "提升专注"],
    cover: { from: "#e8e4d5", to: "#cfc7a8" },
    tagline: "等长的四段呼吸节奏,给大脑一个清晰的「开始」信号",
    durationMin: 6,
    intensity: 2,
    phases: [
      {
        name: "坐姿校准",
        minutes: 1,
        instruction:
          "坐直,双脚平放在地面。想象头顶有一根线轻轻向上提。看一眼你等下要做的事,然后闭上眼睛。",
      },
      {
        name: "四方循环",
        minutes: 4,
        instruction:
          "吸气 4 拍——停 4 拍——呼气 4 拍——停 4 拍。像在空气中画一个正方形,每一条边都一样长。注意力跑了,就带回这个正方形。",
      },
      {
        name: "定锚",
        minutes: 1,
        instruction:
          "最后一次四方呼吸。睁开眼之前,对自己说:接下来这段时间,只有这一件事。",
      },
    ],
    goalAffinity: { calm: 0.5, focus: 0.95, sleep: 0.3 },
    stateFit: { arousalRange: [30, 80], outOfRangePenalty: 0.4 },
    tunableParams: { breathPattern: "box-4-4-4-4", guidanceLevel: "light" },
    contraindications: ["极度疲惫时改用更短的 3 拍版本"],
  },
  {
    id: "scan-progressive",
    category: "body_scan",
    name: "渐进式身体扫描",
    subtitle: "从头到脚把紧绷一寸寸放掉,把注意力还给身体",
    tags: ["深度放松", "15分钟", "睡前可用"],
    cover: { from: "#e3e9e2", to: "#aebfb4" },
    tagline: "从脚趾到头顶逐区放松,把过载的注意力收回身体",
    durationMin: 15,
    intensity: 1,
    phases: [
      {
        name: "着陆",
        minutes: 2,
        instruction:
          "躺下或深深地靠进椅背。感受身体被支撑着——你不需要用力,椅子会接住你。做三次比平时更深的呼吸。",
      },
      {
        name: "分区扫描",
        minutes: 11,
        instruction:
          "把注意力带到双脚,觉察那里的温度和触感,然后允许它们松下来。慢慢向上:小腿、膝盖、大腿、腹部、手、手臂、肩膀……每到一个地方,只对那里说:你可以休息了。",
      },
      {
        name: "整体整合",
        minutes: 2,
        instruction:
          "现在感受整个身体作为一个整体在呼吸。不需要评价任何感觉,来了就看着它来,走了就让它走。",
      },
    ],
    goalAffinity: { calm: 0.85, focus: 0.5, sleep: 0.9 },
    stateFit: { arousalRange: [40, 100], outOfRangePenalty: 0.2 },
    tunableParams: { guidanceLevel: "full", voiceGender: "female" },
    contraindications: ["创伤史用户可跳过躯体侵入性强的引导词"],
  },
  {
    id: "sound-downshift",
    category: "soundscape",
    name: "降速音景沉浸",
    subtitle: "声音从你的心跳速度开始,慢慢把你渡到平静",
    tags: ["音乐疗愈", "12分钟", "降噪耳机最佳"],
    cover: { from: "#dde6da", to: "#9fb8a6" },
    tagline: "ISO 原理:音乐从当前唤醒度附近开始,逐步滑向静息频段",
    durationMin: 12,
    intensity: 1,
    phases: [
      {
        name: "同步",
        minutes: 3,
        instruction:
          "戴上耳机。此刻的声音不急不躁,和你现在的状态几乎同频——你不需要改变自己,声音会先过来陪你。",
      },
      {
        name: "降速",
        minutes: 7,
        instruction:
          "你不需要注意到它,但声音正在一点点变慢、变低。如果思绪飘走,就把耳朵交给最慢的那个声部。",
      },
      {
        name: "悬停",
        minutes: 2,
        instruction: "声音已经接近静止。在这里再待一会儿,直到你准备好自己离开。",
      },
    ],
    goalAffinity: { calm: 0.9, focus: 0.6, sleep: 0.8 },
    stateFit: { arousalRange: [50, 100], outOfRangePenalty: 0.25 },
    tunableParams: { musicType: "ambient-descend(渐降 tempo)", guidanceLevel: "minimal" },
    contraindications: ["对持续低频音敏感者改用自然声景"],
  },
  {
    id: "sound-morning",
    category: "soundscape",
    name: "晨光唤醒音景",
    subtitle: "给早起的耳朵一段坡度,而不是一个闹钟",
    tags: ["早起 BGM", "10分钟", "唤醒不惊醒"],
    cover: { from: "#f2e8d5", to: "#dcc49a" },
    tagline: "从 60bpm 缓升至 90bpm 的晨间声景,温和拉升唤醒度",
    durationMin: 10,
    intensity: 1,
    phases: [
      {
        name: "微光",
        minutes: 3,
        instruction:
          "刚醒的耳朵还很软。声音很轻,像天还没全亮。你可以继续闭着眼,只是听。",
      },
      {
        name: "坡度",
        minutes: 5,
        instruction:
          "节奏在悄悄变快,像光线一点点漫进房间。跟着它做几次更深的呼吸,让清醒来得自然一点。",
      },
      {
        name: "抵达",
        minutes: 2,
        instruction: "现在的你,比十分钟前更接近「准备好了」。睁开眼,今天从从容开始。",
      },
    ],
    goalAffinity: { calm: 0.4, focus: 0.85, sleep: 0.2 },
    stateFit: { arousalRange: [10, 60], outOfRangePenalty: 0.4 },
    tunableParams: { musicType: "morning-ascend(渐升 tempo)", guidanceLevel: "minimal" },
    contraindications: [],
  },
  {
    id: "imagery-safeplace",
    category: "guided_imagery",
    name: "安全岛引导意象",
    subtitle: "在心里建一个随时可以回去的地方,切断停不下来的反刍",
    tags: ["反刍思维", "12分钟", "情绪急救"],
    cover: { from: "#e6e3da", to: "#b8b2a0" },
    tagline: "用语言构建一个可返回的心理安全场景,切断反刍思维",
    durationMin: 12,
    intensity: 2,
    phases: [
      {
        name: "放松诱导",
        minutes: 3,
        instruction:
          "闭上眼睛,跟三次深呼吸走。每次呼气,想象肩膀往下沉一点点,像卸下一个很重的背包。",
      },
      {
        name: "场景建构",
        minutes: 7,
        instruction:
          "想象一个让你感到绝对安全的地方——可以是真实去过的,也可以是想象中的。那里的光线是什么颜色?空气是什么温度?远处有什么声音?用五感把它搭得越来越清楚。这个地方只属于你,没有任何人可以进来。",
      },
      {
        name: "锚定返回",
        minutes: 2,
        instruction:
          "把右手轻轻放在心口,记住这个感觉。以后任何时候,只要做这个手势,你就能在几秒钟内回到这里。现在,慢慢回到房间。",
      },
    ],
    goalAffinity: { calm: 0.8, focus: 0.45, sleep: 0.7 },
    stateFit: { arousalRange: [35, 85], outOfRangePenalty: 0.3, minCalm: 30 },
    tunableParams: { guidanceLevel: "full", voiceGender: "female", musicType: "soft-pad" },
    contraindications: ["急性惊恐发作时先呼吸再意象", "解离倾向者慎用"],
  },
  {
    id: "nidra-restore",
    category: "yoga_nidra",
    name: "瑜伽休息术 NSDR",
    subtitle: "不睡着,但像睡了一觉——给透支的系统一次深度维护",
    tags: ["深度恢复", "20分钟", "午后回血"],
    cover: { from: "#dfe3e6", to: "#9fb0ae" },
    tagline: "非睡眠深度休息:在清醒与睡眠的边界系统性恢复精力",
    durationMin: 20,
    intensity: 1,
    phases: [
      {
        name: "意向设定",
        minutes: 2,
        instruction:
          "躺好,比平时更慢一点地安顿身体。在心里对自己说一句话,作为这次练习的意向——比如「我允许自己休息」。",
      },
      {
        name: "身体与呼吸觉察",
        minutes: 6,
        instruction:
          "快速扫描全身:哪里还有用力?找到它,呼气时把它交给地面。然后只是数呼吸,从 10 倒数到 1,数乱了就从 10 再来。",
      },
      {
        name: "对立感觉练习",
        minutes: 8,
        instruction:
          "现在玩一个游戏:先感觉身体很重,像陷进地面……再感觉很轻,像要浮起来。重——轻——暖——凉。你的神经系统正在学习灵活切换,这就是恢复本身。",
      },
      {
        name: "意象与整合",
        minutes: 4,
        instruction:
          "让任何画面自然地来,不挑选、不跟随。最后,把意识慢慢带回房间:动动手指、脚趾。带着这份余量,回到你的下午。",
      },
    ],
    goalAffinity: { calm: 0.75, focus: 0.65, sleep: 0.95 },
    stateFit: { arousalRange: [20, 75], outOfRangePenalty: 0.3 },
    tunableParams: { guidanceLevel: "full", voiceGender: "female" },
    contraindications: ["严重睡眠剥夺者可能在练习中入睡——设一个轻柔的唤醒闹钟"],
  },
  {
    id: "ritual-offwork",
    category: "guided_imagery",
    name: "下班切换仪式",
    subtitle: "工作模式关机,生活模式开机——给两个自己之间划一条线",
    tags: ["状态切换", "10分钟", "做饭通勤可做"],
    cover: { from: "#ece2d8", to: "#c4a98e" },
    tagline: "用一个小型仪式完成心理脱离(psychological detachment)",
    durationMin: 10,
    intensity: 1,
    phases: [
      {
        name: "盘点封存",
        minutes: 3,
        instruction:
          "把今天没做完的事在脑子里快速过一遍。对每一件说:我知道你在这儿,明天上午我会处理你。然后想象把它们放进一个抽屉,关上。",
      },
      {
        name: "感官换挡",
        minutes: 5,
        instruction:
          "现在,把注意力完全交给眼前的生活场景:如果在做菜,听切菜的声音、闻食材的气味;如果在路上,感受脚步和晚风。工作不在这里,而你在。",
      },
      {
        name: "入场",
        minutes: 2,
        instruction:
          "深呼吸一次,对自己说:工作已结束,今晚属于我。从现在开始,你不是角色,你是你自己。",
      },
    ],
    goalAffinity: { calm: 0.7, focus: 0.4, sleep: 0.9 },
    stateFit: { arousalRange: [30, 85], outOfRangePenalty: 0.25 },
    tunableParams: { guidanceLevel: "light", voiceGender: "female", musicType: "warm-evening" },
    contraindications: [],
  },
  // ── 交互动效模块(参考 Endel 的状态驱动慢视觉 + Vibes 的触摸仪式感) ──
  {
    id: "breath-bloom",
    category: "breathwork",
    name: "呼吸之花",
    subtitle: "按住屏幕,花随吸气绽开;松开,随呼气合拢",
    tags: ["交互引导", "触觉呼吸", "6分钟"],
    cover: { from: "#e9dfd2", to: "#c9a97e" },
    tagline: "把呼吸变成指尖可以触摸的节奏——按住即吸,松开即呼",
    durationMin: 6,
    intensity: 1,
    phases: [
      {
        name: "认识你的花",
        minutes: 1,
        instruction:
          "屏幕中央有一朵尚未开放的花。现在,用手指按住它——花瓣会随着你的吸气慢慢绽开;松开手指,它随呼气合拢。先试一次。",
      },
      {
        name: "同步循环",
        minutes: 4,
        instruction:
          "跟着花的节奏:按住,吸——感受花瓣展开到最大;松开,呼——看它温柔地收回。你的呼吸有多慢,花就开得多慢。",
      },
      {
        name: "放手",
        minutes: 1,
        instruction: "最后一次让花绽开。然后把手放下,只看着它自己开合——你的呼吸已经记住了这个节奏。",
      },
    ],
    goalAffinity: { calm: 0.9, focus: 0.6, sleep: 0.6 },
    stateFit: { arousalRange: [45, 100], outOfRangePenalty: 0.3 },
    tunableParams: { breathPattern: "4-4", guidanceLevel: "minimal" },
    contraindications: [],
    interactive: "bloom",
  },
  {
    id: "ripple-tap",
    category: "soundscape",
    name: "涟漪音池",
    subtitle: "每一下轻触,都是水面上的一个音符——你在弹一首只存在一次的歌",
    tags: ["交互引导", "生成音乐", "10分钟"],
    cover: { from: "#dce8e4", to: "#93b5a9" },
    tagline: "触摸水面激起涟漪与音高,五声音阶保证怎么弹都好听",
    durationMin: 10,
    intensity: 1,
    phases: [
      {
        name: "听水",
        minutes: 2,
        instruction: "先什么都不做,只看水面。偶尔有涟漪自己散开——那是环境的声音。等你准备好了,伸出手指。",
      },
      {
        name: "弹奏",
        minutes: 6,
        instruction:
          "轻触水面的任何位置:一圈涟漪,一个音符。没有对错,没有乐谱。快的触摸像雨,慢的触摸像钟。弹你此刻的心情。",
      },
      {
        name: "静观",
        minutes: 2,
        instruction: "停下手指,看你刚才创造的涟漪慢慢平息。这首歌消失了,只有我记得——这就是当下。",
      },
    ],
    goalAffinity: { calm: 0.8, focus: 0.7, sleep: 0.55 },
    stateFit: { arousalRange: [30, 90], outOfRangePenalty: 0.25 },
    tunableParams: { musicType: "pentatonic-generative(五声生成)", guidanceLevel: "minimal" },
    contraindications: [],
    interactive: "ripples",
  },
  {
    id: "drift-stars",
    category: "guided_imagery",
    name: "星尘漂流",
    subtitle: "什么都不用做,只看星尘慢慢落——思绪也会跟着慢下来",
    tags: ["交互引导", "零操作", "10分钟"],
    cover: { from: "#2b3a40", to: "#14201f" },
    tagline: "Endel 式的极简注视训练:缓慢粒子流 + 可选的指尖引力",
    durationMin: 10,
    intensity: 1,
    phases: [
      {
        name: "注视",
        minutes: 3,
        instruction:
          "看着星尘缓缓飘落。不需要数,不需要追。思绪飘走了,就让它像星尘一样落下——然后回到画面中央。",
      },
      {
        name: "引力",
        minutes: 4,
        instruction:
          "如果你愿意,把手指放在屏幕上轻轻移动——星尘会被你牵引。你影响它们,但不控制它们。就像你对待思绪的方式。",
      },
      {
        name: "沉没",
        minutes: 3,
        instruction: "把手拿开。星尘继续落,你继续看。让眼皮变重是被允许的。",
      },
    ],
    goalAffinity: { calm: 0.75, focus: 0.5, sleep: 0.85 },
    stateFit: { arousalRange: [20, 80], outOfRangePenalty: 0.25 },
    tunableParams: { guidanceLevel: "minimal", musicType: "deep-pad" },
    contraindications: [],
    interactive: "drift",
  },

  // ── 多样化扩展:肌肉 / 感官 / 慈心 / 小睡 / 晨间 / 行走 ──
  {
    id: "pmr-release",
    category: "body_scan",
    name: "渐进式肌肉放松",
    subtitle: "先主动绷紧、再彻底松开——让身体亲自体验「松」是什么感觉",
    tags: ["身体紧绷", "12分钟", "下班后可做"],
    cover: { from: "#e5ddd2", to: "#c3b49b" },
    tagline: "雅各布森 PMR:用「紧-松」对照训练神经系统的放松反射",
    durationMin: 12,
    intensity: 2,
    phases: [
      {
        name: "安顿",
        minutes: 2,
        instruction: "坐好或躺下,双脚踩实。这个练习只有一个动作:用力绷紧 5 秒,然后一下子松掉。我们先从手开始。",
      },
      {
        name: "紧-松循环",
        minutes: 8,
        instruction:
          "握紧拳头,5、4、3、2、1——松开,感受那股暖流漫开。接下来是小臂、肩膀、脸、腹部、腿,一组一组来。每一组都只用七成力,松开的那一下,才是真正的练习。",
      },
      {
        name: "整体沉静",
        minutes: 2,
        instruction: "现在整个身体都已经松过了。安静地坐着,感受「松下来」的身体和十分钟前有什么不同。",
      },
    ],
    goalAffinity: { calm: 0.9, focus: 0.45, sleep: 0.8 },
    stateFit: { arousalRange: [40, 95], outOfRangePenalty: 0.4 },
    tunableParams: { guidanceLevel: "full" },
    contraindications: ["肌肉拉伤或术后恢复期跳过对应部位", "只需七成力,不要憋气"],
  },
  {
    id: "grounding-54321",
    category: "guided_imagery",
    name: "感官着陆 5-4-3-2-1",
    subtitle: "心慌到坐不住的时候,用五种感官把自己拉回此时此地",
    tags: ["急性焦虑", "5分钟", "任何场合"],
    cover: { from: "#dfe7e3", to: "#a8bfb0" },
    tagline: "临床常用的 grounding 技术:用感官输入打断焦虑反刍循环",
    durationMin: 5,
    intensity: 1,
    phases: [
      {
        name: "5 样东西 · 看",
        minutes: 1,
        instruction: "环顾四周,在心里说出你看到的 5 样东西。不用特别,桌角、水杯、光斑都可以。慢慢说,一样一样来。",
      },
      {
        name: "4 种触感 · 摸",
        minutes: 1,
        instruction: "找到 4 种触感:衣料的质地、桌面的凉、脚底的支撑、自己手心的温度。每种都停留几秒。",
      },
      {
        name: "3 种声音 · 听",
        minutes: 1,
        instruction: "闭上眼,找出周围 3 种声音。远处的也算,自己的呼吸也算。只是听,不评价。",
      },
      {
        name: "2 种气味 · 1 口呼吸",
        minutes: 2,
        instruction: "留意 2 种气味(或想象中的气味也可以),然后做一次又慢又长的呼气。你已经回到此时此地了。",
      },
    ],
    goalAffinity: { calm: 0.92, focus: 0.6, sleep: 0.4 },
    stateFit: { arousalRange: [60, 100], outOfRangePenalty: 0.5 },
    tunableParams: { guidanceLevel: "full" },
    contraindications: [],
  },
  {
    id: "loving-kindness",
    category: "guided_imagery",
    name: "慈心练习",
    subtitle: "对自己太苛刻的时候,练习像对待好朋友一样对待自己",
    tags: ["自我关怀", "10分钟", "情绪修复"],
    cover: { from: "#f0e3dd", to: "#d9b8ac" },
    tagline: "metta 冥想:四组祝愿语,软化自我批评的神经通路",
    durationMin: 10,
    intensity: 1,
    phases: [
      {
        name: "对自己",
        minutes: 3,
        instruction: "把手放在心口。在心里慢慢地说:愿我平安。愿我健康。愿我对自己温柔一点。每一句都停一停,不用强迫自己真的相信,只是说出来。",
      },
      {
        name: "对一个你在乎的人",
        minutes: 3,
        instruction: "想起一个让你心里一暖的人。把同样的祝愿送给他:愿你平安,愿你健康,愿你没有痛苦。",
      },
      {
        name: "对一个普通人",
        minutes: 2,
        instruction: "想起一个擦肩而过的普通人——快递员、便利店的店员。把祝愿也给他一份。他和我们一样,在努力地过这一天。",
      },
      {
        name: "收束",
        minutes: 2,
        instruction: "把注意力收回到自己呼吸上。刚才心里升起过的任何一点暖意,都是你自己产生的。",
      },
    ],
    goalAffinity: { calm: 0.85, focus: 0.4, sleep: 0.6 },
    stateFit: { arousalRange: [30, 85], outOfRangePenalty: 0.45, minCalm: 25 },
    tunableParams: { guidanceLevel: "full", voiceGender: "female" },
    contraindications: ["强烈情绪创伤期建议在专业陪伴下进行"],
  },
  {
    id: "coffee-nap",
    category: "yoga_nidra",
    name: "咖啡小憩",
    subtitle: "先喝一口咖啡再小睡 15 分钟——醒来时咖啡因刚好起效",
    tags: ["午后回血", "15分钟", "午休"],
    cover: { from: "#e9e2d4", to: "#c9b891" },
    tagline: "利用咖啡因 20 分钟起效的时间窗:小睡清腺苷,咖啡接棒提神",
    durationMin: 15,
    intensity: 1,
    phases: [
      {
        name: "喝下咖啡",
        minutes: 1,
        instruction: "现在喝下你的咖啡(或茶),然后立刻找个能靠的地方——计时开始,咖啡因大约 20 分钟后起效。",
      },
      {
        name: "快速下沉",
        minutes: 3,
        instruction: "闭眼,做三次深长的呼气。不需要睡着,半梦半醒的边缘就是最好的休息。",
      },
      {
        name: "浅眠",
        minutes: 10,
        instruction: "什么都不用做。思绪来了就让它路过。就算没睡着,闭眼休息同样在给大脑清缓存。",
      },
      {
        name: "醒来",
        minutes: 1,
        instruction: "慢慢动一动手指和脚趾,睁眼。咖啡因正好开始起效,你会感觉比单纯小睡更清醒。",
      },
    ],
    goalAffinity: { calm: 0.55, focus: 0.85, sleep: 0.45 },
    stateFit: { arousalRange: [10, 70], outOfRangePenalty: 0.4 },
    tunableParams: { guidanceLevel: "minimal", musicType: "brown-noise" },
    contraindications: ["下午 3 点后不建议(咖啡因影响夜间睡眠)", "对咖啡因敏感者改为无咖啡版"],
  },
  {
    id: "morning-prime",
    category: "breathwork",
    name: "晨间唤醒序列",
    subtitle: "起床后 6 分钟,温和地把大脑从睡眠模式切到上线模式",
    tags: ["起床后", "6分钟", "清醒"],
    cover: { from: "#f2e8d5", to: "#e0c9a0" },
    tagline: "轻度换气 + 节律伸展,提升晨间皮质醇曲线的自然斜率",
    durationMin: 6,
    intensity: 2,
    phases: [
      {
        name: "苏醒呼吸",
        minutes: 2,
        instruction: "坐起来,双脚落地。吸气时把手臂向上伸展,呼气时放下。配合呼吸做 8 次,动作可以慢一点。",
      },
      {
        name: "节律充能",
        minutes: 3,
        instruction: "做 20 次稍快的鼻吸鼻呼(每秒约 1 次),然后自然吸气 1 分钟。注意力放在身体逐渐发热的感觉上。",
      },
      {
        name: "定个调",
        minutes: 1,
        instruction: "睁眼之前,想一件今天值得期待的小事——哪怕只是一杯好喝的咖啡。带着它开始今天。",
      },
    ],
    goalAffinity: { calm: 0.4, focus: 0.9, sleep: 0.1 },
    stateFit: { arousalRange: [5, 55], outOfRangePenalty: 0.35 },
    tunableParams: { breathPattern: "energize-1s", guidanceLevel: "light" },
    contraindications: ["高血压或眩晕史者跳过快速呼吸段"],
  },
  {
    id: "walk-mindful",
    category: "guided_imagery",
    name: "正念行走",
    subtitle: "通勤路上、饭后散步,都可以是一段练习——不需要坐垫",
    tags: ["边走边练", "10分钟", "通勤可做"],
    cover: { from: "#dde8dc", to: "#a4bda4" },
    tagline: "行禅的现代版:把「走路」从通勤负担变成注意力的节拍器",
    durationMin: 10,
    intensity: 1,
    phases: [
      {
        name: "起步",
        minutes: 2,
        instruction: "用平时的速度走。先注意脚底:脚跟落地、重心前移、脚尖离地。只是注意,不用改变什么。",
      },
      {
        name: "节拍",
        minutes: 5,
        instruction: "让呼吸跟上脚步:吸气走 3 步,呼气走 3 步。走神了没关系,回到脚底的触感就好。",
      },
      {
        name: "打开",
        minutes: 3,
        instruction: "把注意力从脚底扩大到周围:风、声音、光线。你不是在路过这条街,你是在这条街上。",
      },
    ],
    goalAffinity: { calm: 0.75, focus: 0.65, sleep: 0.35 },
    stateFit: { arousalRange: [20, 90], outOfRangePenalty: 0.3 },
    tunableParams: { guidanceLevel: "light" },
    contraindications: ["走路时注意路况,不要在车流中闭眼"],
  },
];

// ───────────────────────────── 演示用户档案(脚手架阶段写死) ─────────────────────────────

export const DEMO_PROFILE: UserProfile = {
  userId: "u_tina",
  name: "Tina",
  preference: {
    guidanceLevel: "light",
    voiceGender: "female",
    dislikedCategories: [],
  },
  personalPatterns: [
    "高唤醒状态下 Focus 衰减更快",
    "晚间 22 点后练习更容易入睡",
    "对女声引导的依从性更高",
  ],
};

export function getGoal(id: string): Goal | undefined {
  return GOALS.find((g) => g.id === id);
}

export function getPlan(id: string): TrainingPlan | undefined {
  return PLANS.find((p) => p.id === id);
}
