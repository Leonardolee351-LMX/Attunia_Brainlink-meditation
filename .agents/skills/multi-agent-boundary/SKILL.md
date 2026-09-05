---
name: multi-agent-boundary
description: >-
  Recall NeuroFlow Multi-Agent consult boundaries (stage-based catalog assembly,
  no invention, no image/music generation). Use when splitting tickets, writing
  todos, or when the user asks about A2A, Tuno, 会诊, 多专家, 即兴, 生图, 作曲,
  训练顺序, or whether experts may create new content.
---

# Multi-Agent 边界

先读并遵守：`docs/agent-lab/multi-agent-boundary.md`

排会诊 / 专家 / 即兴 / 生图 / 作曲相关 todo 时必须先读该文。

## 必须执行

- 会诊是**按擅长分环节、拼接已有疗法目录**，不是旧 A2A 的「五人选一张赢家」。
- **禁止**新练习、生图、作曲。Sona 只能点选目录已有声音/意象/引导分档。
- 最多两步；专家不互改；不能协作时由 Tuno 整合。
- 对话机制归后端；改语义不要改 `src/pages`。
- 问「能不能创作/生图/作曲/三步/专家互改」→ 答**现在不行**。
