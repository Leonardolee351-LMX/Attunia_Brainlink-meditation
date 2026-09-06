# GitHub Pages 部署说明

## 为什么之前打开是空白？

旧 workflow（`static.yml` / Jekyll）把**仓库源码**原样挂到 Pages。  
线上 `index.html` 里是：

```html
<script type="module" src="/src/main.tsx"></script>
```

浏览器不能直接跑 TypeScript / Vite 源码，所以看起来「没有界面」。

正确做法：在 Actions 里 `vite build`，只上传 `dist/public`。

## 现在怎么部署

- Workflow：`.github\workflows\deploy-pages.yml`
- 推送 `main` 或手动 Run workflow
- 站点：`https://leonardolee351-lmx.github.io/Attunia_Brainlink-meditation/`
- Repo Settings → Pages → Source 选 **GitHub Actions**

本地预览静态包：

```bash
set VITE_BASE=/Attunia_Brainlink-meditation/
set VITE_STATIC=1
npx vite build
npx vite preview --base /Attunia_Brainlink-meditation/
```

## 重要限制（想「网上直接操作原型」必读）

| 能力 | GitHub Pages | 需要 Node 主机 |
|---|---|---|
| 开屏 / 导航 / 静态 UI | ✅ | — |
| tRPC / Agent 对话 / 会诊 / TTS | ❌ | ✅（`npm run build && npm start`） |
| 本机 BrainLink 串口桥 | ❌ | ✅（本机 `:8765` 或 Web Serial） |

**Pages 只是静态前端。** Attunia 的 Agent、LLM、TTS、会话逻辑都在 `api/`，Pages 不能跑 Node。

若要「打开链接就能点、能聊、能出训练」：

1. **前端**继续用 Pages（或同一静态托管）  
2. **后端**部署到 Railway / Render / Fly / 自有 VPS，跑 `dist/boot.js`  
3. 前端把 tRPC 指到该 API 源（需再开一小票改 `src/providers/trpc.tsx` 的 `url`）

纯路演静态页可先开：[`docs/agent-lab/pitch/index.html`](./pitch/index.html)（不依赖 API）。
