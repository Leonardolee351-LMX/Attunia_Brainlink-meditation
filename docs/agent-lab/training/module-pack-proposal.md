# 模块包（Module Pack）提案

> 咨询师提案。落地要改 `src/` / `api/` / `contracts/`，须总控开票后由前后端做。  
> 对齐：`multi-agent-boundary.md` —— 会诊只**排列组合已有目录**，不即兴、不生图、不作曲。

## 你问的是不是这件事

是。每个训练模块做成一个自包含单元：

| 物料 | 现在散在哪 | 包内应有 |
|------|------------|----------|
| preset 文本（阶段、引导词、参数） | `api/agents/data/presets.ts` 一大坨 | `preset.json`（或 md + 生成进 presets） |
| 背景 / 封面图 | `public/plans/{id}.jpg` | `cover.jpg`（或指向已有 public 路径） |
| 交互动效 | `src/components/interactive/*` + 泛用 `PlayerAura` | `visual.kind` + 可选 `Visual.tsx` 入口约定 |
| BGM | 多半挂在**场景** `public/audio/scenes/`，不按模块 | 可选 `bgm.wav`；没有就继承场景声景 |

「大脑超载」或 A2A 定制计划 = **按顺序引用若干 `planId`**，运行时按包加载，而不是现写练习。

## 建议目录（作者向，可先不搬运行代码）

```
docs/agent-lab/training/modules/
  breath-box/
    preset.json          # id, phases, breath, eeg, cues, contraindications
    cover.ref.json       # { "src": "/plans/breath-box.jpg", "crop": "70% 30%" }
    visual.md            # 母题、协议钟、三通道（给人看）
    visual.kind.json     # { "kind": "box-square", "forbid": [...] }
    bgm.ref.json         # 可选；缺省 = 场景 BGM
  grounding-54321/
    ...
  ritual-offwork/
    ...
```

**场景**仍是组合层，不塞动效代码：

```
docs/agent-lab/training/scenes/
  overload.json   # { primary, relatedPlanIds, accent, desiredShift }
  clock-in.json
  clock-out.json
```

A2A / Nova 输出形状（概念上）：

```json
{
  "steps": [
    { "planId": "grounding-54321", "durationMin": 5 },
    { "planId": "breath-478", "durationMin": 8 }
  ]
}
```

Session 按 `steps[]` 依次挂载对应模块的 visual + instruction +（可选）bgm。最多两步（现行边界）。

## 运行时（前端以后要接的）

今天 Session 基本是：查 presets 里一条 plan → 一个 `PlayerAura(sceneId)` → 播阶段 instruction。

目标：

1. **Registry**：`planId → { preset, visualKind, cover, bgm? }`
2. **Visual switch**：`box-square` | `ground-stairs` | `drawer-lid` | `bloom-flower` | … 而不是一律 scene 光场
3. **Playlist / A2A**：`steps[0].planId` 练完切 `steps[1]`（或阶段引导词已由后端拼进 `customized.phases` 时，仍按当前 planId 选画面）

动效**代码**仍宜放在 `src/components/training-visuals/`（可按 kind 一个文件），包内只放 **kind 名 + 参数**，避免在 `docs/` 里塞可执行 React。否则构建链和任务板边界会炸。

作者包（docs）↔ 运行包（src/public/api）用同步脚本或手工拷贝；咨询师改 docs 包，前端实现 kind。

## 和边界的关系

| 允许 | 禁止 |
|------|------|
| 场景 / A2A 只引用已有 `planId` | 会诊里新建模块文件夹或 invented |
| 调时长、guidance、已有 musicType | 现生成图、现作曲填进包 |
| 同一模块多场景染色（tint） | 为会诊现场改引导长文当新练习 |

模块包 = **目录物料的物理形态**；会诊 = **对包的引用列表**。

## 分阶段

1. **现在（咨询师）**：继续按模块写 `three-key-scenes` / 将来拆成 `modules/{id}/`；不改 src。
2. **总控票**：契约是否增加 `visualKind`、`modulePackPath`；F-12 按 kind 渲染三主模块。
3. **前端**：registry + visual switch；Session 支持 A2A `steps[]` 切模块画面。
4. **后端**：presets 仍可由包生成；会诊只吐 `planId` 序列。
5. **以后**：BGM 按模块可选覆盖场景声景；交互组件真正 per-module 懒加载。

## 不做的决定（本提案）

- 不把 React 源码放进 `docs/agent-lab/training/modules/` 当唯一真相。
- 不让咨询师直接改 `src/`。
- 不在本期为 17 模块各写一套完整 TSX；先定 pack 形状 + 三关键主模块 kind。
