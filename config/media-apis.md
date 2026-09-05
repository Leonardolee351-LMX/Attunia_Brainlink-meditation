# 非语言 API（音乐 / 图像 / 视频）

语言 LLM 写在 `llm-apis.md`。这里只登记**不是 chat/completions 的能力**。

每家的鉴权、请求体、计费都不同，接入前按具体功能开票，不要硬套 LLM 区块。

读取顺序与 LLM 相同：本文件 → `media-apis.local.md`（gitignore）→ 环境变量。

尚未接入的能力先留空，不要填假密钥。

---

## minimax-tts

kind: tts
protocol: minimax-t2a
baseUrl: https://api.minimaxi.com/v1/t2a_v2
model: speech-02-hd
voiceId: audiobook_female_1
speed: 0.75
note: 语音合成。密钥可与 llm-apis 的 minimax 共用。GroupId 可选（空则不带 query）。会诊音色在 api/agents/tts.ts。不要用 female-chengshu 做训练引导。
groupId:
apiKey:

## music

kind: music
protocol: undecided
baseUrl:
model:
apiKey:
note: 音景/BGM 生成。等产品定是 MiniMax 音乐、本地库还是别的供应商再填。

## image

kind: image
protocol: undecided
baseUrl:
model:
apiKey:
note: 场景图/封面生成。按页面需求单独开票，不走 chat completions。
