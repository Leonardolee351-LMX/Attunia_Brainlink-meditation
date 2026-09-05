#!/usr/bin/env node
/**
 * Rewrite AGENT_BOARD.md from board.json.
 * Usage: node scripts/sync-agent-board.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const boardPath = join(root, "docs", "agent-lab", "board.json");
const mdPath = join(root, "docs", "agent-lab", "AGENT_BOARD.md");

const board = JSON.parse(readFileSync(boardPath, "utf8"));
const agentName = Object.fromEntries(board.agents.map((a) => [a.id, a.name]));

function ticketRows() {
  return board.tickets
    .map((t) => `| ${t.id} | ${agentName[t.agent] ?? t.agent} | ${t.status} | ${t.title} | ${t.doneWhen} |`)
    .join("\n");
}

function agentRows() {
  return board.agents
    .map(
      (a) =>
        `| ${a.name} | ${a.status} | ${a.currentTicket ?? "—"} | ${a.now} | ${a.allowed.join("、")} |`,
    )
    .join("\n");
}

const blocked =
  board.blocked.length === 0
    ? "（无）"
    : board.blocked.map((b) => `- ${b}`).join("\n");

const md = `# Agent Board

机器可读源：\`docs/agent-lab/board.json\`。本文件由 \`node scripts/sync-agent-board.mjs\` 生成，不要手改。

| 字段 | 值 |
|------|-----|
| 快照时间 | ${board.updatedAt} |
| Version | ${board.version} |
| 下次备份 | Version ${board.nextBackupAt} |

## ${board.agents.length} 个 Agent 现在在做什么

| Agent | 状态 | 当前票 | 正在做什么 | 允许改 |
|-------|------|--------|------------|--------|
${agentRows()}

## 当前票

| ID | 角色 | 状态 | 标题 | 完成定义 |
|----|------|------|------|----------|
${ticketRows()}

状态只允许：\`idle\` / \`todo\` / \`doing\` / \`blocked\` / \`review\` / \`done\`。

## Blocked

${blocked}

## 工人同步步骤

1. 改 \`docs/agent-lab/board.json\` 里自己的 \`agents[]\` 和对应 \`tickets[]\`
2. 运行 \`node scripts/sync-agent-board.mjs\`
3. 不要改别人的 Agent 条目，不要手改本 Markdown
`;

writeFileSync(mdPath, md);
console.log("Wrote docs/agent-lab/AGENT_BOARD.md from board.json");
