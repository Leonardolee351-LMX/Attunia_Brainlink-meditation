import type { ConsultStreamEvent, ConsultResult, LLMConfig, UserMemory, UserState } from "@contracts/agents";

/** 消费会诊 SSE：真实阶段 / 消息 / 结果渐进到达 */
export async function streamConsult(
  input: {
    message: string;
    state: UserState;
    llm?: LLMConfig | null;
    memory?: UserMemory;
  },
  handlers: {
    onEvent: (ev: ConsultStreamEvent) => void;
    signal?: AbortSignal;
  },
): Promise<ConsultResult | null> {
  const res = await fetch("/api/consult-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({
      message: input.message,
      state: input.state,
      llm: input.llm ?? undefined,
      memory: input.memory,
    }),
    signal: handlers.signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`consult-stream HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: ConsultResult | null = null;

  const flushBlock = (block: string) => {
    const lines = block.split("\n");
    let data = "";
    for (const line of lines) {
      if (line.startsWith("data:")) data += line.slice(5).trim();
    }
    if (!data) return;
    try {
      const ev = JSON.parse(data) as ConsultStreamEvent;
      handlers.onEvent(ev);
      if (ev.type === "result" && ev.result) finalResult = ev.result;
    } catch {
      /* ignore partial json */
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) flushBlock(part);
  }
  if (buffer.trim()) flushBlock(buffer);
  return finalResult;
}
