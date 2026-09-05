# MiniMax 六景纯音乐生成实测

**日期：** 2026-09-05  
**结果：** **失败 0/6** — 账号被拒，未写出任何 mp3

## 测了什么

- 脚本：`docs/agent-lab/mood/test_minimax_music_scenes.py`
- 接口：`POST https://api.minimaxi.com/v1/music_generation`
- 参数：`is_instrumental: true` + 各景作曲向 prompt（Rhodes/pad/钢琴/五声等，**不是**程序化粉噪脚本）
- 模型轮询：`music-3.0` → `music-2.6` → `music-3.0-free` → `music-2.6-free`
- 另用本机 `mmx music generate --instrumental --region cn` 冒烟，同样失败
- **2026-09-05 补测** `music-2.0` / `music-2.5` / `music-2.5+`：同样 HTTP 410 / status **2153**（见 `PROBE-music2.json`）。官方 OpenAPI 枚举已不再列 `music-2.0`（已弃用）；关停是整条 Music API，不是某个版本号能绕过。
- **2026-09-05 按国内文档** [music-generation](https://platform.minimax.cn/docs/api-reference/music-generation) 实测：`servers.url` = `https://api.minimax.cn`；文档页首即「2026-08-20 起新用户停服」。对本机 Key：`api.minimax.cn` / `api.minimaxi.com` 上 `music-3.0|2.6|*-free` 均为 **410/2153**；`api.minimax.io`（国际站）为 **2049 invalid api key**（国内 Key 不通用）。见 `PROBE-cn-doc.json`。

## 返回

统一错误（HTTP 410 / `status_code` 2153）：

> This Music API is no longer available to new users. Existing paying customers can continue to use the service.  
> For new access: MiniMax Audio 或开源 MiniMax-Music3。

鉴权本身可用（Key 被接受），是 **Music 产品线对新用户关闭**，不是 prompt 或脚本写错。

## 报告文件

`docs/agent-lab/mood/audio/minimax/REPORT.json`

## 下一步（需你方账号/产品决策）

1. 若有**已付费、且在 2026-08-20 前开通 Music 的老客户账号**，换 Key 后重跑同一脚本。  
2. 走 [MiniMax Audio](https://www.minimax.io/audio) 产品侧手动生成六景，再放进 `public/audio/scenes/`。  
3. 本地开源 Music 3（算力重）。  
4. 继续用现有程序化床轨 / Suno 等离线工具（F-14）。

**产品边界提醒：** 会诊运行时仍禁止现作曲；本测试是**离线素材制作**探测。
