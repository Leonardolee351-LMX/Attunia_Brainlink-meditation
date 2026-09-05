# NeuroFlow-AgentLab — Agent 协议

本仓库里的每一个 Cursor 对话都受这里约束。总控负责拆任务、写契约、验收；前端 / 后端 / 合规 / 训练咨询对话（或总控拉起的子 Agent）只做分派给自己的票。训练咨询只写已有模块与六景的详情（动效、方法、引导词），不改 `src/` `api/` `contracts/`。

总控不能把字打进另一个对话框。协作方式：改 `docs/agent-lab/AGENT_BOARD.md`，或在总控对话里拉起你看得见的子 Agent。开发期间不要接 EigenFlux。

**现阶段：产品 Agent 的对话设计归后端**（单 Agent / Multi-Agent 提示词、意图抽取、多目标与顺序、回合策略）。前端只渲染 Conversation / 会诊已给出的结果，不改对话逻辑。会诊现行边界见 `docs/agent-lab/multi-agent-boundary.md`。

开工前先读：

1. `docs/agent-lab/board.json` — 各 Agent 的实时状态（唯一事实来源）
2. `.cursor/rules/` — 边界、分工、备份
3. `contracts/` — 前后端共享类型，未经总控不要改形状
4. `docs/agent-lab/multi-agent-boundary.md` — Multi-Agent 会诊现行边界（排会诊/专家/即兴/生图/作曲相关 todo 时必读，并调用 `.cursor/skills/multi-agent-boundary`）

监视面：总控对话旁边的任务板画板。工人改 `board.json` 后运行 `node scripts/sync-agent-board.mjs`。

工作区根目录必须是 `NeuroFlow-AgentLab`。不要改仓库外的文件。
