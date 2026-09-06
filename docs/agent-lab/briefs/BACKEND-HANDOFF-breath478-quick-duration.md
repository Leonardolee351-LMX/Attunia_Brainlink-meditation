# 后端对齐：breath-478 时长 + 快速训练自选分钟

**发给：** 后端（`api/`）  
**来自：** 前端（F-23 增补 / 快速训练时长）  
**日期：** 2026-09-05  
**相关票：** 建议 **B-9**（本交接）；前端 **F-25**（快速训练改名 + 进训前选时长，已在 `src/` 落地）

---

## 1. breath-478（4-7-8）时长与口播节奏

### 产品定稿（前端已按此跑）

| 阶段 | 产品分钟 | API presets 现状（需改） | 行为 |
|------|----------|--------------------------|------|
| 安顿 | **1** | 1 | 播阶段引导词；画面可先泄/空 |
| **4-7-8 循环** | **2**（不是 6） | 目前多为 **6** | 协议钟 **吸4 → 屏7 → 呼8**（19s/轮）**循环**；界面波形与 4/7/8 点**全程**有 |
| 自然呼吸 | **1** | 1 | 收尾 |
| **合计** | **约 4 分钟** | 标签/封面仍写「8分钟」会误导 | `durationMin`、tags、therapy-catalog 应对齐 |

### 语音（前端已实现，后端 TTS 无需新接口）

1. 进入「4-7-8 循环」时：先播该阶段 **instruction**（长引导词）。  
2. **引导词播完后约 20 秒内**：按段切点短提示「吸气」「屏住」「呼气」（走现有 `agent.tts` / `speaker=guidance`）。  
3. **20 秒之后**：不再跟拍口令，**画面继续按 19s 循环**直到该阶段 2 分钟结束。

### 请后端改的文件（建议）

- `api/agents/data/presets.ts` → `breath-478`：  
  - `durationMin: 4`（或与 phases 之和一致）  
  - 循环 phase `minutes: 2`  
  - tags 去掉/改掉「8分钟」  
- `api/agents/data/therapy-catalog.ts`（若单独镜像时长）一并改  
- 咨询文案侧（训练咨询，非本票强制）：`docs/agent-lab/training/modules/breath-478/guidance.json` 里循环 `minutes: 6` / `durationMin: 8` 建议改成与产品一致（**前端不改 training/**）

### 验收

- `GET` presets 中 `breath-478` 循环段 = 2′，总时长与 phases 之和一致。  
- 前端去掉 `patchBreath478Phases` 临时覆写后，行为仍为 2′ 循环（可另开 F 票删覆写）。

---

## 2. 「探索训练」→「快速训练」+ 用户自选时长

### 产品

- 首页区块文案：**快速训练**（原「探索训练」）。  
- 这些目录卡允许用户**自己定训练总分钟数**。  
- 流程：点卡片 → 单元页 → **「进入训练」先弹出分钟选择**（上下滑动）→ 确认后再进 `/session/:planId`。

### 前端接线（已用现有 handoff，不改 contracts）

`navigate('/session/' + planId, { state: { sceneId?, customized: { durationMin, guidanceLevel, phases } } })`

`SessionPage` 已有逻辑：若 `customized.durationMin !== phases 合计`，则**按比例缩放各 phase.minutes**（最短约 0.5′）。

默认选中：`plan.durationMin`（目录推荐值）。  
可选范围（前端）：**1–30 分钟**（步进 1）。

### 请后端知晓 / 可选对齐

| 项 | 说明 |
|----|------|
| presets `durationMin` | 继续表示**推荐默认时长**，不是硬上限 |
| debrief / recordSession | 以用户实际跑完的分钟为准（前端 `samples` 墙钟）；勿假定必等于 presets |
| 匹配引擎 `availableMinutes` | 快速训练自选与「此刻窗口」可并行；若推荐链路也要尊重用户刚选的分钟，可后续读同一 `durationMin` |
| contracts | **本期不必改形状**；沿用 `FinalDecision.customized.durationMin`。若要单独「快速训练自选」字段，等总控开票 |

### 不做

- 不为自选时长新开 tRPC（除非要服务端校验/落库偏好）。  
- 不改会诊/场景仪式路径的强制选时（场景页进训可保持推荐时长；快速训练入口必选）。

---

## 3. 完成定义（B-9）

- [ ] `breath-478` presets：循环 2′、总时长与 tags 一致  
- [ ] therapy-catalog（如有）同步  
- [ ] 任务板注明：前端可删 `src/lib/breath-478-session.ts` 里的分钟覆写  
- [ ] （可选）回复任务板：快速训练自选时长无需 API，已知悉

---

## 4. 参考路径

- 前端覆写与跟拍：`src/lib/breath-478-session.ts`、`src/pages/SessionPage.tsx`  
- 快速训练选时：`src/components/PlanFlipLayer.tsx`、`src/components/DurationMinutePicker.tsx`  
- 超载 visual 交接：`docs/agent-lab/briefs/FRONTEND-HANDOFF-overload-visuals.md`
