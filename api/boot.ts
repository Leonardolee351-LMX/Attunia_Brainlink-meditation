import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { streamSSE } from "hono/streaming";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { ensureSerialBridge } from "./lib/serial-bridge-spawn";
import { UserAgent } from "./agents/user-agent";
import { DEMO_PROFILE } from "./agents/data/presets";
import {
  appendChatDigest,
  compressChatTurn,
  mergeAndPersistMemory,
} from "./agents/user-memory-store";
import type { ConsultStreamEvent, LLMConfig, UserMemory, UserState } from "../contracts/agents";

void ensureSerialBridge();

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

/** 会诊 SSE：阶段 / 消息 / 结果渐进推送 */
app.post("/api/consult-stream", async (c) => {
  let body: {
    message?: string;
    state?: UserState;
    llm?: LLMConfig;
    memory?: UserMemory;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid json" }, 400);
  }
  const message = (body.message ?? "").trim();
  if (!message || message.length > 2000) {
    return c.json({ error: "message required" }, 400);
  }
  const state = body.state;
  if (!state) return c.json({ error: "state required" }, 400);

  return streamSSE(c, async (stream) => {
    let id = 0;
    const send = async (ev: ConsultStreamEvent) => {
      await stream.writeSSE({
        id: String(++id),
        event: ev.type,
        data: JSON.stringify(ev),
      });
    };

    try {
      const memory = mergeAndPersistMemory(body.memory);
      const tuno = new UserAgent(DEMO_PROFILE);
      const result = await tuno.consultMessage(message, state, body.llm, memory, (ev) => {
        void send(ev);
      });
      const digestMemory = appendChatDigest(
        compressChatTurn({
          userMessage: message,
          goalId: result.goalId,
          planId: result.decision.planId,
          planName: result.decision.planName,
        }),
        memory,
      );
      const finalResult = { ...result, memory: digestMemory };
      await send({ type: "result", result: finalResult });
      await send({ type: "phase", phase: "done", label: "会诊完成" });
    } catch (err) {
      await send({
        type: "error",
        phase: "error",
        error: err instanceof Error ? err.message : String(err),
        label: "会诊出错了",
      });
    }
  });
});

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
