# 工作态脑电主动检测（10 分钟窗）

> 实现：`api/agents/work-detect.ts`  
> 接口：`agent.detectWorkNeed`  
> 评测：`eval/eval_No.2/eval/work_windows.jsonl`（`npm run eval`）

## 要解决什么

用户在工作状态时，不一定知道自己已经**认知超负荷**或**走神**。产品需要在已佩戴设备的前提下，**主动**提示「现在更适合冥想减压」或「现在更适合专注回笼」，而不是等用户自己点开。

## 时间尺度（硬约束）

- **不以秒为单位触发。** 瞬时尖峰不弹窗。
- 判定单元 = **最近 10 分钟**（`WINDOW_SEC = 600`）内的聚合特征。
- 有效跨度不足 **120 秒** → `insufficient`，不提醒。
- 两次提醒之间冷静期默认 **30 分钟**。

## 输入

前端（或串口桥）提供近窗内的三通道点：

```ts
{ t /* 秒 */, arousal, focus, calm, signal? }[]
```

与 live-device 一致：`focus≈attention`，`calm≈meditation`，`arousal≈clamp(100-calm*0.85)`。  
**原始脑电频带不送外部 LLM**；检测在本机规则完成。

## 判定（经验阈值，来自 `eval/user_data` 标签）

| 条件（近 10 分钟） | 判定 | 产品动作 |
|---|---|---|
| 唤醒偏高 + 平静持续偏低 + 注意力仍在线 | **认知超负荷** `rest` | 场景「超载减负」→ 冥想/减压目录（如 grounding-54321） |
| 注意力大量落在低专注区，且不像困倦关机 | **工作走神** `focus` | 场景「摸鱼回笼」→ 专注轻训（如 ripple-tap） |
| 注意力极低 + 困倦型平静/低唤醒 | **困倦走低** `rest` | 短恢复（如 coffee-nap） |
| 注意力稳定在专注带 | **none** | 不打扰 |

优先级：超载 > 困倦恢复 > 走神 > 无。

## 与评测集 2.0

`user_data` 里每段真机 CSV 约 40–80 秒，带 `focused / overload / drowsy / baseline` 标签。  
2.0 把短窗**铺成 600 秒**（`synthetic_tile`）写入 `work_windows.jsonl`，用来卡住检测规则；并不是连续 10 分钟实录。以后有更长实录可替换生成脚本输入。

## 前端协作

后端只返回 `need / sceneId / planId / reason / shouldNotify`。  
前端负责：佩戴中轮询或本地缓冲 10 分钟点 → 调 `agent.detectWorkNeed` → 弹提醒并跳转 `/session/{planId}`。  
本票不改 `src/pages`（除非总控另派前端票）。
