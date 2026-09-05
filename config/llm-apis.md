# LLM API 调用格式

程序只认这个目录里的 Markdown，按 `## 区块名` 分段，每段是 `key: value`。

读取顺序（后者覆盖前者）：

1. `config/llm-apis.md`（本文件，可进 git：端点、模型、格式）
2. `config/llm-apis.local.md`（本地密钥，**不要进 git**）
3. 环境变量 `LLM_PROVIDER` / `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` / `MINIMAX_API_KEY` / `MINIMAX_GROUP_ID`

语言类 LLM 都走 OpenAI 兼容的 `POST {baseUrl}/chat/completions`。换一家时复制一个 `##` 区块，改 `baseUrl` / `model` / `apiKey` 即可。

音乐、图像、视频等非语言 API **不要写在这里**，见 `config/media-apis.md`。

---

## default

provider: minimax

## qiji

kind: llm
protocol: openai-compatible
baseUrl: https://api.openai-next.com/v1
model: gpt-5.6-sol
temperature: 0.3
apiKey:
note: 奇绩 OpenAI 兼容协议。Base URL 必须带 /v1。Cursor / Codex / OpenAI SDK 用这一条。密钥只写 llm-apis.local.md。

## qiji-anthropic

kind: llm
protocol: anthropic-messages
baseUrl: https://api.openai-next.com
model: claude-opus-5
temperature: 0.3
apiKey:
note: 奇绩 Anthropic 原生协议。Base URL 不要带 /v1（客户端会自行拼 /v1/messages）。用 x-api-key。Cursor 目前可能没有 Anthropic Base URL 覆盖；Claude Code 等原生客户端用这一条。密钥只写 llm-apis.local.md。

## kimi

kind: llm
protocol: openai-compatible
baseUrl: https://api.moonshot.cn/v1
model: kimi-k3
temperature: 1
apiKey:

## minimax

kind: llm
protocol: openai-compatible
baseUrl: https://api.minimaxi.com/v1
model: MiniMax-M2
apiKey:

## qwen

kind: llm
protocol: openai-compatible
baseUrl: https://dashscope.aliyuncs.com/compatible-mode/v1
model: qwen-plus
apiKey:

## minimax-tts

kind: tts
protocol: minimax-t2a
baseUrl: https://api.minimaxi.com/v1/t2a_v2
model: speech-02-hd
voiceId: audiobook_female_1
speed: 0.75
note: 冥想引导用女性有声书音色，语速 0.75。GroupId 可选；有 apiKey 即可合成。会诊按 speaker 切音色。不要用 female-chengshu 做训练引导。
groupId:
apiKey:
