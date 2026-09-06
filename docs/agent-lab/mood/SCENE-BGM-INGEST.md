# 六景训练 BGM 入库（用户曲库）

**日期：** 2026-09-05  
**源目录：** `music/`（仓库内）  
**播放：** `useSceneBgm` → `sceneBgmSrc` → `public/audio/scenes/`  
**机器清单：** [`scene-bgm-manifest.json`](./scene-bgm-manifest.json)

## 映射（现行）

| 场景 | 产品名 | 采用文件（来自 music/） | 训练路径 |
|------|--------|------------------------|----------|
| `clock-in` | 开工前奏 / 上班 | `上班准备 (2).mp3` | `/audio/scenes/clock-in.mp3` |
| `post-meet` | 会后留白 | `软光回落.mp3`（先当会后 BGM） | `/audio/scenes/post-meet.mp3` |
| `overload` | 超载减负 | `overdrive smoothen (2).mp3` | `/audio/scenes/overload.mp3` |
| `clock-out` | 下工仪式 / 下班转换 | `下班切换.mp3` | `/audio/scenes/clock-out.mp3` |
| `lunch-tide` | 午憩航道 | （尚未提供） | 仍用程序化 `lunch-tide.wav` |
| `drift-back` | 摸鱼回笼 | （尚未提供） | 仍用程序化 `drift-back.wav` |

同目录备选未启用：`上班准备 (1)`、`下班切换 (1)`、`overdrive smoothen (1)`——需要换版时改 manifest 再拷一次即可。

## 产品约定

- 循环播放、音量低于引导词（现有 duck 逻辑保留）。
- 会诊运行时**不**现作曲；只点已入库文件。
- `软光回落` → `post-meet`：按你的指示临时对应；若以后会后有专曲，再换 `post-meet.mp3`，软光可改挂别景。

## 听验收

进场景页开训练：开工 / 会后 / 超载 / 下工应听到新 mp3；午憩与摸鱼仍是旧 wav。
