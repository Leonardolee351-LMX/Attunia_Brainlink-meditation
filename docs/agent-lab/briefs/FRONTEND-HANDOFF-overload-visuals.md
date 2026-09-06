# 前端交接：大脑超载四模块 · 训练交互动效

**发给：** 前端（`src/`）  
**来自：** 训练咨询（T-5）  
**票：** **F-23**（本交接主票）；与 **F-12** 超载主演示 `grounding-54321` 重叠部分可一并做  
**日期：** 2026-09-05  

> 咨询师侧的 HTML 原型在编辑器里常打不开，**不要依赖它**。以本文 + 下列路径为准，在产品训练页复刻。

---

## 1. 一句话目标

用户进入场景 `overload` 的四个训练（`relatedPlanIds`）时，**中央画面按模块母题 + 协议钟变化**，口播短句出现时有对应画面事件；三通道脑电**只改画面品质，不改节拍**。不要继续用泛用 `PlayerAura(sceneId)` 光球顶替这四套。

---

## 2. 范围

| 做 | 不做 |
|----|------|
| `grounding-54321` / `pmr-release` / `breath-478` / `imagery-safeplace` 四套 `visual.kind` | 新 `planId`、改匹配引擎 |
| Session 中央区按 `planId` 切换 Visual | 改 `api/`、`contracts/`（除非总控另开票加 `visualKind` 字段；本期可用前端本地表） |
| 协议钟与现有阶段 / cue 对齐 | MiniMax 现作曲、现生图 |
| 超载染色：窗口/标签残片，黏土→鼠尾草 | 会议室文案/灰尘；四套母题互相抄 |

**允许改：** `src/`（建议 `src/components/training-visuals/` + `SessionPage`）、必要时 `src/lib/` 本地 registry。  
**禁止改：** `api/`、`db/`、`contracts/`（未经总控）、`docs/agent-lab/training/` 里的引导正文（以现有为准）。

---

## 3. 必读材料（按顺序）

| 优先级 | 路径 | 用途 |
|--------|------|------|
| P0 | **本文** | 完成定义与接线 |
| P0 | `docs/agent-lab/training/modules/overload/interactive-motion.md` | 口播阶段 ↔ 画面事件（意义匹配） |
| P0 | `docs/agent-lab/training/modules/{planId}/guidance.md` + `guidance.json` | 逐字稿与分秒 cue（四模块各一份） |
| P1 | `docs/agent-lab/training/three-key-scenes.md` §B + `three-key-scenes.json` | 母题 / eeg 映射 / phases 机器可读 |
| P1 | `docs/agent-lab/training/modules/overload/README.md` | 四模块何时用 |
| P2 | `docs/agent-lab/training/module-pack-proposal.md` | registry / kind 开关方向 |
| 参考 | `docs/agent-lab/training/modules/overload/interactive-demo.html` | 行为草图（可选；打不开可忽略） |

现况：`SessionPage` 用 `PlayerAura liveRef={…} sceneId={sceneId}`，超载场景是统一 orb——**本票要换成 per-planId visual**。

---

## 4. `visual.kind` 契约（前端本地表即可）

```ts
type OverloadVisualKind =
  | "ground-stairs"        // grounding-54321
  | "tense-release-discs"  // pmr-release
  | "exhale-triangle"      // breath-478
  | "safe-portal";         // imagery-safeplace

const OVERLOAD_VISUAL: Record<string, OverloadVisualKind> = {
  "grounding-54321": "ground-stairs",
  "pmr-release": "tense-release-discs",
  "breath-478": "exhale-triangle",
  "imagery-safeplace": "safe-portal",
};
```

| kind | 一眼可辨母题 | 协议钟 | 脑电只改 |
|------|--------------|--------|----------|
| `ground-stairs` | 五级楼梯（大→小）+ 背后标签残片 | 按阶段换级；cue「第 N 样」亮点 | arousal→标签数；calm→sage 地；focus→当前级清晰 |
| `tense-release-discs` | 黏土小圆（紧）vs 沙色大圆（松） | **紧 5s + 松 ≈8s**（≈13s/组）；阶段 2 循环 | arousal→小圆「死」；calm→大圆铺满；focus→当前组高亮 |
| `exhale-triangle` | 泄光三角 + 黏土**标签尘** | **吸4 → 停7 → 呼8**（19s）；阶段 3 自然呼吸 | arousal→尘密度；calm→泄后空/sage；focus→轨迹连贯 |
| `safe-portal` | 左侧奶油门洞 + 门内几何色块（**不生风景图**） | 阶段：靠近 → 五感建岛 → 锚定回房 | arousal→门远虚；calm→门近暖；focus→门内清晰 |

**禁止混用：** 楼梯当呼吸、圆环冒充 4-7-8、门洞里塞风景图、PMR 用楼梯。

**染色：** 超载黏土 `#FF6B4A` → 鼠尾草 `#A8BFB0`；尘/残片语义是「标签/窗口」，不是会议室。

---

## 5. 接线建议（实现形状）

```
SessionPage
  └─ TrainingVisual
        props: planId, elapsedSec (或 phaseIndex+phaseElapsed),
               liveBio { arousal, focus, calm },
               reducedMotion?
        └─ switch(kind) → GroundStairs | TenseReleaseDiscs | ExhaleTriangle | SafePortal
```

1. **节奏源：** 会话已走过的秒数（墙钟），与 TTS/阶段切换同一时钟；**不要**用 arousal 驱动呼吸周期。  
2. **cue 源：** 优先 `guidance.json` / `three-key-scenes.json` 的 `phases[].cues[].atSec`；画面在 `phaseElapsed >= atSec` 时触发事件（亮点、开始泄、等）。若运行时仍只靠 presets instruction，至少按阶段边界切母题状态。  
3. **脑电：** 读现有 `liveRef` / bio；映射只进 opacity、数量、清晰度、远近。  
4. **非超载 plan：** 保持现有 `PlayerAura` 或其它 kind，本票不强制改开工/下工（F-12 另做 `box-square` / `drawer-lid`）。

可选文件落点：

- `src/components/training-visuals/OverloadVisual.tsx`（入口）
- `src/components/training-visuals/GroundStairs.tsx` 等
- `src/lib/training-visual-registry.ts`（planId → kind）

---

## 6. 分模块验收（Given / When / Then）

### 6.1 `grounding-54321` · 5 min

- Given 训练开始，When 进入「看」阶段，Then 最大一级楼梯亮，背后有标签残片。  
- When 口播到「第三样」类 cue，Then 当前级上至少有对应亮点（不必精确像素，事件要有）。  
- When 进入「触」，Then 当前级边更厚；「脚底」附近可有轻微下沉。  
- When 「长呼气」cue，Then 场缓慢下沉、标签明显变少。  
- When 把 arousal 滑高/真机唤醒高，Then **阶段仍按分钟走**，只是标签更多。

### 6.2 `pmr-release` · 12 min（超载 tint）

- Given 紧-松阶段，When 一组开始，Then 小圆约 5s 收紧，随后大圆约 8s 铺开。  
- When 口播换部位，Then 焦点仍在双圆叙事（可换标签文案，勿换母题）。  
- When 沉静阶段，Then 双圆几乎静止、场偏沙/sage。  
- 脑电高唤醒 → 小圆更「死」；高平静 → 大圆更满；**周期长度不变**。

### 6.3 `breath-478` · 8 min

- Given 循环阶段，When 走一拍，Then 可见聚 → 停 → 向下泄，总长约 19s。  
- When 呼气段，Then 标签尘随泄下落。  
- When 自然呼吸阶段，Then 三角极淡，不再强数拍。  
- 禁止会议室灰；尘为黏土标签感。

### 6.4 `imagery-safeplace` · 12 min

- Given 诱导阶段三次呼气，When 时间推进，Then 左侧门洞由远/虚变近。  
- When 场景建构，Then 门内**几何色块**逐档清晰，无 AI 风景图。  
- When 「窗口不在这里」，Then 门外标签被推淡/推开。  
- When 锚定，Then 门仍可见；可有心口锚定的极简提示（点/暖光即可）。

### 6.5 公共

- 四套画面**一眼可分**，不能都像同一个光球。  
- `prefers-reduced-motion: reduce` 时降低频闪，仍保留阶段静态差异。  
- 不改 debrief / 匹配公式 / 会诊逻辑。

---

## 7. 口播 ↔ 画面事件速查

完整表见 `interactive-motion.md`。前端最少保证这些「关键拍」：

| planId | 关键口播/拍 | 画面必须 |
|--------|------------|----------|
| grounding-54321 | 「第一样…第五样」 | 楼梯点依次亮 |
| grounding-54321 | 「很长的呼气」 | 全场沉 + 标签少 |
| pmr-release | 「握紧—五…一—松开」 | 小圆紧 → 大圆松 |
| breath-478 | 吸/停/呼 | 三角聚/悬/泄 |
| imagery-safeplace | 「门会在左边」 | 门洞可见且在左侧 |
| imagery-safeplace | 「手在心口」 | 锚定态 + 门仍在 |

---

## 8. 建议实现顺序

1. Registry：`planId` → kind；Session 超载四模块走 `TrainingVisual`，其余仍 `PlayerAura`。  
2. 先做 **`ground-stairs`**（超载主路径 / F-12 重叠）。  
3. `exhale-triangle`（协议钟清晰，易验）。  
4. `tense-release-discs`。  
5. `safe-portal`。  
6. 与场景页上一/下一模块（F-15 已有）联调：切换 `planId` 时 Visual 与时钟重置。

---

## 9. 完成定义（F-23 doneWhen）

- [ ] 超载四 `planId` 训练页中央为对应 kind，而非统一 scene orb。  
- [ ] 协议钟驱动；脑电只改品质（可用模拟 bio 或真机验收）。  
- [ ] 上表关键口播/拍有可见画面事件。  
- [ ] 四套母题互不抄；超载标签语义正确。  
- [ ] 未改 api/contracts/匹配；未新增 planId。

验收人：总控 + 训练咨询可对照 `interactive-motion.md` 点名验收。

---

## 10. 咨询师侧状态

- T-5：意义匹配说明 + 本交接已交；HTML 仅参考。  
- 引导文案：`modules/*/guidance.md|json` 已齐（T-3）；回写 `presets.ts` 仍须总控批后端票。  
- 有问题在 `board.json` 标 `Blocked` 并 `@lead`，不要改咨询师引导正文来「迁就」画面。
