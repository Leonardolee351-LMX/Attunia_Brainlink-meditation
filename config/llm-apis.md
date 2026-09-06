# LLM API 调用格式

程序只认这个目录里的 Markdown，按 `## 区块名` 分段，每段是 `key: value`。

读取顺序（后者覆盖前者）：

1. `config/llm-apis.md`（本文件，可进 git）
2. `config/llm-apis.local.md`（本机覆盖，**不要进 git**；可覆盖默认与其它厂商密钥）
3. 环境变量 `LLM_PROVIDER` / `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` / `MINIMAX_API_KEY` / `MINIMAX_GROUP_ID`

语言类 LLM 都走 OpenAI 兼容的 `POST {baseUrl}/chat/completions`。

**产品分发授权（用户 2026-09-05）：** `## qiji` 的 Key 已写入本文件，凡克隆/下载本仓库的用户均可使用该奇绩通道。Kimi / MiniMax / Qwen 等其它厂商仍需自备 Key（写 local 或环境变量 / 前端设置）。

音乐、图像、视频等非语言 API **不要写在这里**，见 `config/media-apis.md`。

---

## default

provider: qiji

## qiji

kind: llm
protocol: openai-compatible
baseUrl: https://api.openai-next.com/v1
model: gpt-5.6-sol
temperature: 0.3
apiKey: sk-KT46gUChCMAUpxDc5d6aAe8d536d4c7aB91e23FcC48d8b92
channelId: 10e509f2-3745-4ea9-a53f-c72daf12850e
note: 产品内置奇绩 OpenAI 兼容通道（已授权随仓库分发）。Base URL 必须带 /v1。原始脑电勿送入此 API。

## qiji-anthropic

kind: llm
protocol: anthropic-messages
baseUrl: https://api.openai-next.com
model: claude-opus-5
temperature: 0.3
apiKey: sk-KT46gUChCMAUpxDc5d6aAe8d536d4c7aB91e23FcC48d8b92
channelId: 10e509f2-3745-4ea9-a53f-c72daf12850e
note: 奇绩 Anthropic 原生协议。Base URL 不要带 /v1。同一把 Key。Claude Code 等原生客户端用这一条。

## kimi

kind: llm
protocol: openai-compatible
baseUrl: https://api.moonshot.cn/v1
model: kimi-k3
temperature: 1
apiKey:
note: 需用户自备 Key。

## minimax

kind: llm
protocol: openai-compatible
baseUrl: https://api.minimaxi.com/v1
model: MiniMax-M2
apiKey:
note: 需用户自备 Key（对话与 TTS）。

## qwen

kind: llm
protocol: openai-compatible
baseUrl: https://dashscope.aliyuncs.com/compatible-mode/v1
model: qwen-plus
apiKey:
note: 需用户自备 Key。

## minimax-tts

kind: tts
protocol: minimax-t2a
baseUrl: https://api.minimaxi.com/v1/t2a_v2
model: speech-02-hd
voiceId: audiobook_female_1
speed: 0.75
note: 冥想引导用女性有声书音色，语速 0.75。需用户自备 MiniMax apiKey / groupId。
groupId:
apiKey:
