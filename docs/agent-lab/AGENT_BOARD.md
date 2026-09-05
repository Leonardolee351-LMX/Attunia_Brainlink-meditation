# Agent Board

机器可读源：`docs/agent-lab/board.json`。本文件由 `node scripts/sync-agent-board.mjs` 生成，不要手改。

| 字段 | 值 |
|------|-----|
| 快照时间 | 2026-09-05T15:22:00+08:00 |
| Version | 0 |
| 下次备份 | Version 3 |

## 5 个 Agent 现在在做什么

| Agent | 状态 | 当前票 | 正在做什么 | 允许改 |
|-------|------|--------|------------|--------|
| 总控 | idle | L-2 | 产品 Attunia；编排 Agent 已改名为 Tuno。F-17 开启页待验收。 | docs/agent-lab/、.cursor/rules/、contracts/、AGENTS.md、.agents/skills/ |
| 前端 | review | F-8 | F-8：Friends 分色头像+输入置顶。待验收。 | src/、index.html |
| 后端 | review | B-5 | B-4/B-6：TTS 空 GroupId 不再整条降级；会诊 speaker→不同 MiniMax 音色。待听验收。 | api/、db/、drizzle.config.ts、eval/、config/ |
| 合规 | idle | C-2 | 奇绩 Key 已写入本机 gitignore 文件，范围仅本仓与隔壁 Brainlink；未进全局 Cursor 设置。下一张是 C-2 免责/危机体验。 | 只读审查；发现问题写票 |
| 训练咨询 | review | T-5 | T-5：超载四模块交互动效意义匹配 + HTML 演示已交；待总控/前端验收后开 F 票进 src。 | docs/agent-lab/training/、docs/agent-lab/briefs/CONSULTANT.md |

## 当前票

| ID | 角色 | 状态 | 标题 | 完成定义 |
|----|------|------|------|----------|
| L-0 | 总控 | done | 落地总控编制 | 边界、分工、任务板、Version 备份协议写入仓库 |
| L-1 | 总控 | done | 为总控安装产品经理技能包 | 本仓库装上 PRD / 用户故事 / 验收 / JTBD 等核心 PM skills，并写明仅总控使用 |
| F-0 | 前端 | done | 等待第一张前端票 | 总控派发 F-1 后此票关闭 |
| F-1 | 前端 | done | 训练页三通道实时真机可视化 | 全部 /session 训练都能显示唤醒/专注/平静；已接头环时读 live-device 真机数据，未接时回落模拟 |
| F-2 | 前端 | done | 全页排版对齐 + 场景图像素材 | Home/对话/会诊/画像/场景/开屏间距与字号对齐；三场景有可用图像素材 |
| F-3 | 前端 | done | Work-life 六场景（按状态推荐） | 首页 2×3 六个上班族场景；按时间与三通道状态推荐此刻；不含睡前/起床；点进场景页能进对应训练 |
| F-4 | 前端 | done | 抽象光效封面 + 校准盯球去标注 | 首页场景图为几何渐变光效而非实景；校准 Focus/Meditation 有动效画面且盯球时无进度条标注 |
| F-5 | 前端 | done | 六景声景 BGM + 播放器训练页 + 温婉女声 | 六个预设场景能播对应声景；训练正式页为深色播放器动效并随脑电变化；引导语为柔和女声 |
| F-6 | 前端 | done | 会诊领域图标 + 危机词表对齐后端 | Mira 显示心理咨询图标；页面不再把创作当专家领域；对话危机拦截覆盖后端词表与死了.{0,6}更好 |
| B-0 | 后端 | done | 等待第一张后端票 | 总控派发 B-1 后此票关闭 |
| B-1 | 后端 | done | 专家名册重组 + 全体专家接入疗法目录 | Sona 合并创作与艺术并可即兴；Mira 改为心理咨询；五位专家提案时都能看到完整现有疗法并基于目录延展 |
| B-2 | 后端 | review | 接入初版评测集 + 本地 LLM API 文档 | CURRENT 指向 eval_No.1；生产代码可跑该集；Kimi/MiniMax 密钥不在源码里，改由 gitignore 的 local md 提供；仓库里有可提交的调用格式模板 |
| B-4 | 后端 | review | MiniMax TTS 换成温婉慢速女声 | agent.tts 不再用 female-chengshu；voice_id 为有声书/温婉女声；语速明显慢于 1.0；配置从 llm-apis 读取 |
| B-5 | 后端 | review | Multi-Agent 按环节拼接目录（不做即兴/生图/作曲） | 会诊按顺序分环节派工并拼接已有疗法；即兴/生图/作曲关闭；边界文档可供 todolist 调用 |
| C-0 | 合规 | done | 等待下一张合规审查票 | 总控派发新的 C- 票后此票关闭 |
| C-1 | 合规 | done | 为本仓库配置奇绩 Cursor Base URL（不含密钥） | 工作区写出 openai-next Base URL；密钥不进仓库；确认不外传原始脑电 |
| L-2 | 总控 | done | 剩余五条 backlog 拆票与排序 | 5 条写入 tickets；有 MoSCoW/ICE 文档；工人未开工前不改 src/api |
| C-2 | 合规 | todo | 免责声明与危机识别体验（不可与 UX 对冲掉） | 关键路径有免责披露；危机识别前后端词表对齐；拦截/转介体验可走通且不打断主 UserFlow 的可读性 |
| C-3 | 合规 | done | 本机写入奇绩 API Key（仅两仓，不进 git） | Key 只在 NeuroFlow-AgentLab 与隔壁 Brainlink 的 gitignore 本机文件；未写入全局 Cursor 设置 |
| B-3 | 后端 | todo | 盘点并接入比赛提供的 API | 组委会/赛题 API 清单写入 config；生产路径至少用上题目要求的能力；密钥不进 git；原始脑电不外传 |
| F-7 | 前端 | todo | 全页 UX-Workflow 走查与优化 | 开屏到训练结束的全部页面画出 flow；标出断点与重塑；总控点头后按走查改关键路径，而不是只交审计文档 |
| L-3 | 总控 | todo | A/B 三臂实验契约（记忆 / 脑电 / LLM） | 三组对照的分流、开关、日志字段写入 contracts 提案并经总控批准；再派 B-5/F-6 |
| F-8 | 前端 | review | UI 动效加分（持续） | 无完工线；每轮验收时训练/场景/转场至少多一处可感知动效且不挡 Must |
| F-9 | 前端 | done | 首页意图输入 + 场景浓缩 + 校正迁 Profile | 首页黄油条改为状态输入，默认进 Conversation；新疗法/新鲜感/高度定制进 Nova 并自动会诊；去掉对话式推荐与多专家会诊两卡；场景改为 icon 浓缩；训练改为探索区；重新校正只在 Profile |
| F-10 | 前端 | done | Conversation 建议结果去嵌套便当盒 | 对话页不再套大白盒；组合方案改为时间线而不是盒中盒；单目标推荐改为条目而非海报卡嵌套 |
| F-11 | 前端 | done | Profile 训练记忆 + 一周回顾（去便当盒） | Profile 列出本机训练/会诊记忆；近 7 天回顾能按真实记录汇总；无大白盒，功能用横线隔开 |
| B-6 | 后端 | review | Multi-Agent TTS 按专家切换音色 | 会诊/多专家发言可听出不同 voice_id；未配置时明确降级，而不是全员同一声或全员本机默认音 |
| F-12 | 前端 | todo | 三项关键训练：脑电 × 呼吸 × 画面互动 | 开工 breath-box、会后 breath-478、下工 ritual-offwork 三套训练过程中，画面与呼吸节律随三通道变化，而不是只播引导+静态光场 |
| F-13 | 前端 | todo | UI 美术整体质感 | 首页/对话/会诊/训练/画像在同一套材质与间距里；不再像多轮补丁拼贴。动效仍归 F-8，本票管色、字、面、封面 |
| F-14 | 前端 | todo | 训练与六景音乐重做 | 六景 BGM 与三项关键训练的声景重做且能循环；与画面/呼吸不抢；无 MiniMax 作曲（B-5 边界） |
| F-15 | 前端 | done | 训练播放器：场景模块上一/下一 + 多段进度 | 场景 relatedPlanIds 在训练页顶部显示多段进度条；Play 两侧为上一/下一模块而非 ±15s；切换保留 sceneId 并重置会话 |
| F-16 | 前端 | done | 超载减负：着陆路径场景页 + 训练染色 | 场景页按咨询师四步路径（先落地/松身体/慢心跳/换通道）展示何时用；主 CTA 进感官着陆；训练页标题/副标显示路径角色；无便当网格；不改 api/contracts |
| F-17 | 前端 | done | Attunia 开启页 + 深色大脑几何封面 | 每次打开 / 先见 Attunia 产品开启页，再进读懂你的大脑→设备→校准→home；封面为深色大脑/灵智平面构成；定位为冥想疗法与大脑调律 |
| F-18 | 前端 | done | 设备连接页唯美柔和重做 | 戴上头环读状态页视觉柔和唯美，与 Attunia 开屏调性一致；连接逻辑不变 |
| F-19 | 前端 | done | Conversation 空态与规整对话 UI | 首句前暗色问候空态；回复后规整呈现；加载完成滚动到最新回复顶部而非贴底；LLM/NeuroBand 渐进披露；空输入语音 icon、有字发送 icon |
| F-20 | 前端 | done | 会诊页：主输入置顶 + LLM/记忆/模拟折叠 | 说说此刻的你置顶为主任务；LLM、记忆、模拟状态默认折叠渐进披露；去掉左右分栏抢注意力 |
| F-21 | 前端 | done | 训练单元一屏 + 免责 icon 渐进披露 | 模块翻开页无需滚动即可见进入训练；单元页与正式训练页用ⓘ折叠免责，不再每次勾选才能开始 |
| F-22 | 前端 | review | 训练页字幕与脑电读数可开关 | 所有 /session 训练页可独立开关字幕与实时脑电（唤醒/专注/平静）呈现；偏好本地记忆 |
| L-4 | 总控 | todo | LLM 会话逻辑与犯错边界（设计） | 写出对话该做什么/不该做什么、降级规则、幻觉与目录外疗法的校正；再派 B-7 |
| B-7 | 后端 | todo | LLM 会话逻辑与犯错边界（实现） | chat/consult 遵守 L-4：目录外拒绝、危机拦截、无 key 降级规则；评测能抓住常见胡说 |
| T-0 | 训练咨询 | done | 落地训练咨询编制 | 角色 brief、允许/禁止路径、与会诊不即兴边界写入仓库 |
| T-1 | 训练咨询 | done | 9月6日前三景详情：开工 / 会后 / 下工 | breath-box、breath-478、ritual-offwork 各有可落地的画面母题、三通道映射、协议钟、分秒引导词；不新增 planId |
| T-2 | 训练咨询 | review | 关键三景 + 全部子模块：开工 / 超载 / 下工 | clock-in、overload、clock-out 的主模块与 relatedPlanIds 全部有画面母题、三通道映射、协议钟、分秒引导词；不新增 planId |
| T-3 | 训练咨询 | review | 大脑超载四模块：完整冥想引导文案 | grounding-54321、pmr-release、breath-478、imagery-safeplace 各有可播的完整引导脚本（进段 + 分秒 cue）；落在 modules/；不新增 planId |
| T-4 | 训练咨询 | done | 17 模块引导文案 md 补齐 | 目录全部 17 个 planId 在 modules/{id}/guidance.md 有进段口播与分秒短句；有总索引 |
| T-5 | 训练咨询 | review | 超载四模块：交互动效与逐字稿意义匹配 + 演示 | grounding-54321 / pmr-release / breath-478 / imagery-safeplace 各有口播阶段↔画面事件对照；可打开演示页用协议钟验收；脑电只改品质；不改 src/ |

状态只允许：`idle` / `todo` / `doing` / `blocked` / `review` / `done`。

## Blocked

（无）

## 工人同步步骤

1. 改 `docs/agent-lab/board.json` 里自己的 `agents[]` 和对应 `tickets[]`
2. 运行 `node scripts/sync-agent-board.mjs`
3. 不要改别人的 Agent 条目，不要手改本 Markdown
