# 前端交接：工作态 10 分钟主动提醒

后端：`agent.detectWorkNeed`（规格：`docs/agent-lab/work-detect.md`）。

**F-24 已接工作室侧栏：** `StudioSideRail`（开屏 / 提醒机制 / 模拟脑电），演示弹窗可跳 `/session/{planId}`。

## 生产态接法（App 内，非画板）

1. 佩戴中把 live-device 三通道写入本地环形缓冲（≥600 秒）。
2. 每 30–60 秒调 `detectWorkNeed`；仅 `shouldNotify` 弹窗。
3. 弹过后带上 `sinceLastNotifySec`（冷静期 30 分钟）。
4. 原始 EEG 频带不送 LLM。
