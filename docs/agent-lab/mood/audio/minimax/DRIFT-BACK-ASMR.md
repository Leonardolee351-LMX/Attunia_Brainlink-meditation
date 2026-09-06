# 摸鱼回笼 · MiniMax 试生成（轻松愉悦 ASMR）

**日期：** 2026-09-05  
**sceneId：** `drift-back`  
**目标：** 轻松、愉悦、轻 ASMR；不是成曲。

## API 实测（本机）

```text
mmx music generate --region cn --instrumental …
→ HTTP 410 / Music API no longer available to new users
```

当前仓库 MiniMax Key **不能**走 `/v1/music_generation`。  
可用路径：打开 [MiniMax Audio](https://www.minimax.io/audio)（或国内 Audio 控制台）**网页手动生成** → 下载 mp3 → 放到：

- `public/audio/scenes/drift-back.mp3`（训练播放）
- 并更新 `docs/agent-lab/mood/scene-bgm-manifest.json`

## 网页粘贴用 · Style / 描述

```
NOT a song, NOT a composition. Soft pleasant joyful ASMR sound therapy for gentle return from daydream. Mint-green water ambient spatial field. Sparse lighthearted water droplets with quiet gaps, tiny soft surface ripples, light fingertip taps on warm wood, airy room tone. Kind, playful, non-judgmental. No melody line, no drums, no vocals, no lyrics, no whispered speech, no trap hats, no cartoon splash, no pop chorus, no cinematic score. Meditation training bed under spoken guidance, loop-friendly, very soft. About 2–3 minutes instrumental texture only.
```

## 中文版（若网页偏中文）

```
这不是一首歌，不是音乐创作。轻松愉悦的轻 ASMR 声音疗法：从走神软软滑回工作。薄荷绿水面、Ambient Spatial。稀疏开心地水滴（滴与滴之间留白）、极轻涟漪、指尖轻点暖木、空气感房间气。友善、好玩、不评判。无旋律、无鼓、无人声、无耳语说话、无 trap、无卡通泼水、无流行副歌、无电影配乐。冥想训练背景床，可循环，音量很轻。约 2–3 分钟纯质地。
```

## Avoid

`song, melody, vocals, drums, pop, cinematic, orchestra, whispered speech, trap hats, cartoon splash, sad piano`

## 本机已落音频（程序化 ASMR，非 MiniMax）

Music API 不可用时，已用 `generate_scene_audio.py drift-back` 重做轻松愉悦 ASMR 音效床：

- `docs/agent-lab/mood/audio/drift-back.wav`
- `public/audio/scenes/drift-back.wav`（训练 `useSceneBgm` 已指向此路径）

质地：明亮水滴 + 偶发双滴、轻木触、薄荷空气垫；无旋律无鼓。
