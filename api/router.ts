import { createRouter, publicQuery } from "./middleware";
import { agentRouter } from "./routers/agent";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  agent: agentRouter,
});

export type AppRouter = typeof appRouter;
