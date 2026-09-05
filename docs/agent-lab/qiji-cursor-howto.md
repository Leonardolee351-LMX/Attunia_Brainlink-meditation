# 在 Cursor 里用奇绩 Key

本仓库已接好两套奇绩协议（密钥只在本机 gitignore 文件，不进 git）：

| 协议 | Base URL | 模型示例 |
|------|----------|----------|
| OpenAI 兼容 | `https://api.openai-next.com/v1` | `gpt-5.6-sol`、`gpt-4o-mini` |
| Anthropic 原生 | `https://api.openai-next.com`（无 `/v1`） | `claude-opus-5` |

本机探测：OpenAI `gpt-5.6-sol` 与 Anthropic `claude-opus-5` 均可通。

---

## 要用奇绩 Key 时（推荐路径）

Cursor Agent 聊天目前主要吃 **OpenAI 兼容** Override，按下面做：

1. 打开 **Cursor Settings → Models**（`Ctrl+Shift+J`）。
2. **OpenAI API Key**：打开开关，填入奇绩 Key（与 `config/llm-apis.local.md` 里同一把）。
3. **Override OpenAI Base URL**：打开，填  
   `https://api.openai-next.com/v1`  
   （**必须带 `/v1`**，不要填成不带 `/v1` 的根地址。）
4. **Add Model**（或模型列表里添加自定义 ID），填奇绩文档里的模型名，例如：  
   `gpt-5.6-sol`  
   点 Verify / 保存。
5. 回到对话，在模型选择器里选你**刚添加的** `gpt-5.6-sol`，不要选 Cursor 列表里自带的「GPT 5.6 Sol / 5.5」（那些走订阅通道，会报 *This model does not support custom API keys*）。
6. 发一条短消息试通。

只用奇绩时：保持 OpenAI Key + Override 打开。  
切回 Cursor 订阅模型（Composer / Grok / 内置 Sol）：用 `Ctrl+Shift+0` **关掉** OpenAI API Key，或改用 Auto。

---

## Anthropic 原生协议

- 已写入工作区：`.cursor/settings.json` 的 `anthropic.baseUrl` = `https://api.openai-next.com`（无 `/v1`）。
- 密钥在 `.cursor/settings.local.json`（gitignore）。
- **Cursor 目前往往没有「Override Anthropic Base URL」完整 UI**；Claude 走奇绩更稳的是：  
  - Claude Code / 其它 Anthropic 客户端：Base = `https://api.openai-next.com`，Header `x-api-key`；或  
  - 在 Cursor 里继续用 OpenAI 兼容通道选奇绩提供的 Claude 兼容模型 ID（若奇绩目录有）。
- 本仓 `config/llm-apis*.md` 的 `qiji-anthropic` 区块供后续服务端 / 脚本用 Messages API。

---

## 不要做的事

- 不要把 Key 写进 **全局** Cursor Settings → Models 后永久开着，否则其它仓库（NoAI-Lab、AB-TEST）也会带上这把 Key。
- 不要把 Key 提交进 git；可提交的只有无密钥的 Base URL（`.cursor/settings.json`、`config/llm-apis.md`）。
- 不要把脑电原始数据或可识别健康信息送进该 API。

---

## 文件对照

| 文件 | 内容 |
|------|------|
| `.cursor/settings.json` | 两套 Base URL（可提交） |
| `.cursor/settings.local.json` | Key + URL（gitignore） |
| `config/llm-apis.md` | `qiji` / `qiji-anthropic` 模板 |
| `config/llm-apis.local.md` | 本机密钥 |
