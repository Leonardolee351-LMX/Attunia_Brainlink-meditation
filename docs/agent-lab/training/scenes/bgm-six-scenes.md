# 六景冥想训练 BGM

作者：训练咨询 + 用户曲库入库。  
边界：离线入库循环播放；**不是**会诊现作曲。

| 文件 | 用途 |
|------|------|
| [`../mood/SCENE-BGM-INGEST.md`](../mood/SCENE-BGM-INGEST.md) | **现行入库映射**（上班/下班/超载 mp3；软光回落→会后） |
| [`../mood/scene-bgm-manifest.json`](../mood/scene-bgm-manifest.json) | 机器清单 |
| [`../mood/MUSIC-PROMPTS.md`](../mood/MUSIC-PROMPTS.md) | 仍缺曲场景的提示词（午憩 / 摸鱼） |
| `generate_scene_audio.py` | 仅未供曲场景的程序化备用 |

## 现行听感来源

| sceneId | 来源 |
|---------|------|
| clock-in / post-meet / overload / clock-out | `music/` → `public/audio/scenes/*.mp3` |
| lunch-tide / drift-back | 程序化 `*.wav`（待补曲） |

`post-meet` 暂用 **软光回落**。
