# 训练详情设计

咨询师产物落在本目录。前端以这里为方法与动效说明书；后端只在总控批准后把引导词写回 `presets.ts`。

## 边界

- 只设计已有 `planId` 与六景 `sceneId`。不新增练习，不生图，不作曲。
- 三通道：`arousal` / `focus` / `calm`。原始波形不进外部 API。
- 硬件：`focus = attention`，`calm = meditation`，`arousal ≈ 100 - calm * 0.85`。画面不要把唤醒和平静绑成同一属性的正反面。
- **呼吸节拍由协议钟驱动，脑电只改品质。**

## 关键三景（现行）

用户指定：开工前奏、大脑超载、下工仪式。

| 场景 | sceneId | 主模块 | 子模块 |
|------|---------|--------|--------|
| 开工前奏 | clock-in | breath-box | walk-mindful, breath-bloom |
| 大脑超载 | overload | grounding-54321 | pmr-release, breath-478, imagery-safeplace |
| 下工仪式 | clock-out | ritual-offwork | sound-downshift, pmr-release, scan-progressive |

正文：`three-key-scenes.md` + `three-key-scenes.json`（T-2）。

其余三景（会后 / 午憩 / 摸鱼）仍在目录里，详情后补。`slice-sept6-three-scenes.*` 是旧切片（开工 / 会后 / 下工），已被 T-2 取代。

## 三通道

| 通道 | 画面职责 | 不要用来做 |
|------|----------|------------|
| focus | 几何齐不齐、当前目标清不清 | 节拍器 |
| calm | 场软不软、空不空、暖不暖 | 和唤醒抢同一旋钮 |
| arousal | 残留能量、标签、微颤 | 加快协议 |

EMA 400–800 ms。少动：几何停在当前相位。

## 模块包构想

每个 `planId` 收成「preset + 封面 + visual.kind + 可选 BGM」单元，场景 / A2A 只引用 `planId` 排列组合。提案见 `module-pack-proposal.md`。

**已落地：** 17 个模块均有 `modules/{planId}/guidance.md`。索引见 `modules/README.md`。超载四模块另有 `guidance.json`。

**六景 BGM 重写：** `scenes/bgm-six-scenes.md`；提示词与程序化生成见 `docs/agent-lab/mood/music-prompts.json`（v3）。
