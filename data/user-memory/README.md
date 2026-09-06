# data/user-memory

本机用户记忆落盘目录（**不含原始脑电波形**）。

| 路径 | 作用 |
|------|------|
| `memory.json` | 合并后的训练史 + 会诊史 + **habits 习惯画像** + **chatDigests 压缩对话** |
| `sessions/YYYY-MM-DD.jsonl` | 每次训练结束追加一行摘要 |
| `chat-digest.jsonl` | 每次对话/会诊压缩成一句短记忆 |

## 如何反作用于 Agent

1. 前端 `localStorage` 为热缓存；训练结束 / 对话后调用 `agent.syncMemory` 或由 `chat`/`consult` 自动合并。  
2. `rebuildHabits` 从训练史归纳：偏好目标、常练模块、习惯时长、高峰时段。  
3. 匹配引擎对「习惯模块」轻度加分，对「刚练过」降权。  
4. `memoryToText` 把习惯笔记 + 近期对话摘要注入 Tuno 思考链路与 LLM prompt。

## Git

真实用户数据被 gitignore；本 README 与 `.gitkeep` 可提交。
