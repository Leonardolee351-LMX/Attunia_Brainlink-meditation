# Attunia（Brainlink Meditation）

Attunia 是面向 **Work–Life Balance** 的 Soft Healthcare 产品原型：用脑电感知工作/休息切换中的状态落差，提供短时调适练习，并由 Agent **Tuno** 陪伴对话（必要时 Multi-Agent 会诊，只拼已有疗法目录）。

> Attunia 提供的是冥想与身心状态调节练习，**不构成医疗诊断、治疗或处方建议**。  
> 原始脑电与可识别健康数据**不会**送入外部 LLM。

**硬件现状：** 现阶段基于 **BrainLink Lite**（宏智力）脑电头环开发与联调。架构上预留多品牌接入（NeuroSky / Muse 等），后续可扩展任意兼容的脑电设备。

本地仓库目录名可能仍为 `NeuroFlow-AgentLab`；**产品对外名称统一为 Attunia**。

- GitHub：https://github.com/Leonardolee351-LMX/Attunia_Brainlink-meditation

---

## 使用教学指引（从下载到日常）

面向：想自己跑起来体验 Attunia 的同学。推荐环境 **Windows + Chrome / Edge**（BrainLink Lite 经典蓝牙串口在 Windows 上最稳）。

### 1. 下载程序

任选其一：

**A. 用 Git 克隆（推荐）**

```bash
git clone https://github.com/Leonardolee351-LMX/Attunia_Brainlink-meditation.git
cd Attunia_Brainlink-meditation
```

**B. 网页下载 ZIP**

1. 打开上面的仓库地址  
2. 点击绿色 **Code → Download ZIP**  
3. 解压到任意目录（路径尽量不要有奇怪权限）

### 2. 安装运行环境

1. 安装 [Node.js LTS](https://nodejs.org/)（需带 `npm`）  
2. 确认终端里能跑：

```bash
node -v
npm -v
```

### 3. 打开 / 启动程序

**方式一：Windows 一键部署并启动（最省事）**

1. 双击仓库根目录的 `start.bat`（窗口不会闪退）  
2. 脚本会自动完成运行环境部署：  
   - 探测 / 必要时用 winget 安装 **Node.js LTS**  
   - `npm install` 部署产品依赖  
   - 生成本机配置：`.env`、`config/llm-apis.local.md`、`config/media-apis.local.md`  
   - 若本机有 Python，尝试安装 **pyserial**（BrainLink Lite 串口桥可选）  
   - 启动开发服务并打开 **http://localhost:3000**  
3. 也可右键运行 `start.ps1`  
4. **关掉启动窗口 = 停止服务**

若仍失败：把黑色窗口里的报错原文发出来。未装 Node 且 winget 不可用时，请先手动安装 [Node.js LTS](https://nodejs.org/)。

**方式二：命令行**

```bash
npm install
npm run dev
```

然后在浏览器打开终端提示的本地地址（一般为 `http://localhost:3000`）。

进入后你会看到 Attunia 开屏 → 可按引导走设备页 / 校准 / 首页场景。

### 4. 配置 API（对话与语音）

产品对话依赖 LLM；训练引导可选 TTS。配置在 `config/`，**不要把自备密钥提交到 git**。

#### 4.1 读取顺序

1. `config/llm-apis.md`（仓库内模板 / 可能含产品分发用的默认通道）  
2. `config/llm-apis.local.md`（**本机覆盖，gitignore，推荐你改这个**）  
3. 环境变量：`LLM_PROVIDER` / `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` / `MINIMAX_API_KEY` 等  

语音等非对话能力见 `config/media-apis.md` → 本机可用 `media-apis.local.md`。

#### 4.2 自己换 / 补 Key（示例）

复制一份本地覆盖文件（若还没有）：

```bash
# Windows PowerShell 示例
copy config\llm-apis.md config\llm-apis.local.md
```

在 `llm-apis.local.md` 里改对应区块，例如：

```markdown
## default
provider: qiji

## qiji
kind: llm
protocol: openai-compatible
baseUrl: https://api.openai-next.com/v1
model: gpt-5.6-sol
temperature: 0.3
apiKey: 你的密钥写在这里
```

也可填 `kimi` / `minimax` / `qwen` 等区块（自备各家 Key）。改完后**重启** `npm run dev` / `start.bat`。

App 内若有 LLM 设置面板，也可切换引擎；本机 local 文件里的密钥会优先补全到后端。

#### 4.3 TTS（可选）

若要听训练引导语音，在 `media-apis.local.md` 或 `llm-apis.local.md` 的 MiniMax TTS 相关项填入 `apiKey`（`groupId` 可空）。未配置时引导可能降级或静音，不影响大部分界面演示。

### 5. 连接 BrainLink Lite（现阶段）

1. **开机并佩戴** Lite 头环，确保电量充足  
2. 在 **Windows 蓝牙设置** 中配对设备（Lite 多为经典蓝牙 SPP，会出现 COM 口）  
3. 用 **Chrome 或 Edge** 打开本机 Attunia（`localhost:3000`）  
4. 进入开屏流程中的 **设备页**：  
   - 优先走本机串口桥 / Web Serial，选择配对后的 **outgoing COM**（开发机常见为 COM22 / COM23，以你系统为准）  
   - 部分机型也可尝试 Web Bluetooth（名称前缀多为 `BrainLink`）  
5. 连接成功后可做基线校准，再进首页与训练  

连不上时：

- 确认只用 Chrome/Edge，且允许串口/蓝牙权限  
- 关闭其它占用同一 COM 的软件  
- 可先选 **演示信号** 体验产品流程（无真机数据）

**后续：** 接入层已按设备族预留扩展；其它品牌脑电设备将逐步接入，使用方式会在本 README 更新。

### 6. 日常使用怎么玩

1. **开屏 / 封面 / 设备**  
   佩戴并连接（或演示模式）→ 校准个人基线（有则更准）。  

2. **首页与生活场景**  
   对准上班前、会后、超载、下班等 Work–Life 节点，选场景短训。  

3. **训练 Session**  
   跟随引导与交互动效；可开关字幕、实时脑电 HUD、语音。练完可看简要复盘。  

4. **与 Tuno 对话**  
   说出当下状态（累、飘、睡不好等），获取推荐练习；涉及危机词会走安全转介话术。  

5. **会诊（可选）**  
   多专家按疗法目录拼环节，不即兴发明新练习、不生图作曲。  

6. **合规**  
   训练页免责声明多为 ⓘ 渐进披露；请把它当作状态调节工具，不适即停。

无头环时：用演示信号仍可走完对话、场景与大部分 UI；有 Lite 时，实时反馈与校准更贴近真实节律。

### 7. 训练史与 Agent 记忆（本机）

训练结束、对话与会诊后，摘要会落到仓库旁的：

`data/user-memory/`

- `memory.json`：训练/会诊史 + 习惯画像 + 压缩对话  
- `sessions/*.jsonl`：按日追加的训练记录  
- `chat-digest.jsonl`：压缩后的对话记忆  

这些会反作用于 Tuno 的推荐与思考（习惯模块轻度优先、刚练过的降权、prompt 里带上近期摘要）。**不含原始脑电。** 详见该目录 `README.md`。

---

## 仓库结构（给开发者）

| 路径 | 说明 |
|------|------|
| `src/` | 前端 |
| `api/` `db/` | 后端与数据 |
| `contracts/` | 前后端共享类型 |
| `config/` | LLM / 媒体 API 登记 |
| `docs/agent-lab/` | 任务板、进度简报、训练文档 |
| `start.bat` | Windows 一键启动 |
| `AGENTS.md` | 多 Agent 协作协议 |

会诊边界：`docs/agent-lab/multi-agent-boundary.md`。进度叙事：`docs/agent-lab/PROGRESS-BRIEF.md`。

## Done / Todo / Contact

### Done list（已完成 · 概览）

先看这五块就够；展开下方折叠可看各 Agent 的完整交付清单。

| 维度 | 已做到什么（一句话） |
|------|----------------------|
| **前端** | Attunia 开屏→设备→校准→首页六景→训练 Session→对话 / 会诊的主路径可演示；训练页视效、声景、渐进披露 UI |
| **评测** | `eval_No.1`（对话 / 状态 / 危机）与 `eval_No.2`（工作态 10 分钟窗）可跑；`detectWorkNeed` 判定逻辑可演示 |
| **Agent 框架** | 单 Agent **Tuno** + Multi-Agent 会诊（按环节拼疗法目录，不即兴 / 不生图作曲）；任务板与多角色分工协议 |
| **用户体验** | Work–Life 介入场景（开工 / 会后 / 超载 / 摸鱼回笼 / 下工等）；日常短训与 Profile 记忆；对话与会诊的陪伴式流程 |
| **合规说明** | Soft Healthcare 免责（ⓘ 渐进披露）、危机词识别与转介；原始脑电不进外部 LLM |

> 叙事背景与成功指标草案见 [`docs/agent-lab/PROGRESS-BRIEF.md`](docs/agent-lab/PROGRESS-BRIEF.md)。任务事实来源：[`docs/agent-lab/board.json`](docs/agent-lab/board.json)。

<details>
<summary><strong>前端 Agent · Done（网页 / 动效 / 体验）</strong></summary>

- 训练页三通道（唤醒 / 专注 / 平静）真机可视化，未接回落演示信号  
- 全页排版对齐；场景抽象光效封面；校准盯球无进度标注打扰  
- Work–Life **六场景**推荐与场景页进训  
- 六景声景 BGM + 深色播放器训练页；引导语柔和女声通路  
- 首页意图输入进 Conversation / 会诊；场景浓缩；校正迁 Profile  
- Conversation / 会诊 UI 去「便当盒」、空态与规整气泡、设置渐进披露  
- Profile 训练记忆 + 近一周回顾  
- 训练播放器：场景多模块上一/下一 + 多段进度  
- 超载减负着陆路径场景页与训练染色  
- Attunia 品牌开屏 + 深色大脑几何封面；设备页柔和重做  
- 训练单元一屏可见；免责 ⓘ 折叠，不再门禁式勾选才能开练  
- 会诊领域图标与前端危机词表对齐后端  

*另有若干票处于「已交 / 待审」：工作室侧栏提醒信息条、超载四模块 visual.kind、开屏说明书、快速训练选分钟、字幕与脑电开关、会诊 SSE 渐进呈现等——详见任务板。*

</details>

<details>
<summary><strong>后端 Agent · Done（API / 对话 / TTS）</strong></summary>

- 专家名册重组；全体专家提案基于**现有疗法目录**延展  
- 比赛相关 API 盘点与生产路径接入（LLM / TTS 配置化）  
- MiniMax TTS：温婉慢速女声；会诊按专家切换音色  
- LLM 登记表 `config/llm-apis.md`（含产品分发用奇绩通道）+ 本机 local 覆盖  
- Multi-Agent 现行边界落地：Nova 排环节 → 专家只拼目录 → 拼接（见 `multi-agent-boundary.md`）  
- 工作态检测 API：`agent.detectWorkNeed`；提醒落盘日志能力  

</details>

<details>
<summary><strong>评测 · Done</strong></summary>

- `eval/` 指针与可跑评测：对话 / 意图 / 危机等切片（eval_No.1）  
- eval_No.2：`work_windows` + 10 分钟聚合窗判定（超载→减压倾向 / 走神→专注回笼）  
- 规格文档：`docs/agent-lab/work-detect.md`  
- `npm run eval` 纳入工作态检测相关用例  

*说明：现有评测是可演示的规则与窗切片，尚非大规模脑电数据训练后的稳定状态机。*

</details>

<details>
<summary><strong>Agent 框架 / 总控 · Done</strong></summary>

- 多 Agent 边界、分工、`board.json` 任务板、Version / 备份协议（`AGENTS.md`、`.cursor/rules`）  
- 总控 PM skills 与拆票编制  
- 产品 Agent 对话设计归属后端；前端只渲染 API 结果  
- 会诊：阶段上限、目录内组合、用户可见派工  

</details>

<details>
<summary><strong>用户体验 · Done（介入场景与日常）</strong></summary>

- **介入场景**：六景对准上班族节奏（开工前奏、会后留白、午憩、超载减负、摸鱼回笼、下工仪式）  
- **日常体验**：开屏→设备/校准→短训→复盘记忆闭环；无头环可用演示信号走完流程  
- **对话陪伴**：与 Tuno 说当下状态拿推荐；思考链路可折叠查看  
- **会诊体验**：多专家按目录拼方案；LLM / 记忆 / 模拟状态默认折叠  
- **工作室联调**：提醒机制说明 + 机内信息条演示（非骚扰式弹窗挡操作）  

建议亲自点一遍：首页场景、`/chat`、`/consult`，以及 Profile 记忆列表。

</details>

<details>
<summary><strong>人文关怀 / 训练咨询 · Done</strong></summary>

- 训练咨询编制与「只写厚已有模块、不即兴」边界  
- 17 个疗法模块引导文案补齐（`docs/agent-lab/training/modules/`）  
- 超载四模块：交互动效与逐字稿意义对照；画面事件协议钟验收交接  
- 关键场景与子模块详情持续加厚（开工 / 超载 / 下工等）  

</details>

<details>
<summary><strong>合规 · Done</strong></summary>

- Soft Healthcare 定位：调节练习，**非医疗诊断 / 治疗 / 处方**  
- 训练页免责 ⓘ 渐进披露；危机识别与安全转介话术  
- 原始脑电与可识别健康数据**不**送外部 LLM  
- API Key 分发边界：产品内置奇绩通道已授权；其它厂商需用户自备；勿写入 Cursor 全局 Settings  

</details>

---

### Todo list（接下来）

1. **硬件形态**：考虑耳机样式脑电设备，减轻长时间佩戴疲劳（在现有 BrainLink Lite 联调之外的形态探索）。  
2. **创作力 Agent 系统**：允许用户在边界内自主创作冥想训练的交互动效（目录与合规仍需约束）。  
3. **游戏感**：视效与声音的匹配度——沉浸、节奏同频、愿意重复的轻反馈。  
4. **评测集与脑电状态机部署**：在现有 eval 切片上扩样本、定规则、降误报，并把更稳的状态机部署进产品路径。

---

### Contact me

欢迎试用、提 Bug、聊合作或 Soft Healthcare / WLB 场景反馈：

- **GitHub Issues**（推荐）：[Attunia_Brainlink-meditation / Issues](https://github.com/Leonardolee351-LMX/Attunia_Brainlink-meditation/issues)  
- **仓库 / 主页**：[@Leonardolee351-LMX](https://github.com/Leonardolee351-LMX)  

若需邮件或其它联系方式，可在 Issue 里留言，我会补到本段。
