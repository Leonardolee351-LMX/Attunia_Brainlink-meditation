import { describe, expect, it } from "vitest";
import { loadLlmApiRegistry, resetLlmApiRegistry } from "./llm-apis";

describe("llm-apis markdown registry", () => {
  it("loads bundled qiji endpoint for product distribution", () => {
    resetLlmApiRegistry();
    const reg = loadLlmApiRegistry();
    expect(reg.endpoints.qiji?.baseUrl).toContain("openai-next.com");
    expect((reg.endpoints.qiji?.apiKey ?? "").length).toBeGreaterThan(8);
    // local.md 可覆盖 default；无 local 时应为 qiji
    expect(["qiji", "kimi", "qwen", "minimax", "rule"]).toContain(reg.defaultProvider);
    expect(reg.endpoints.kimi?.baseUrl).toContain("moonshot");
    expect(reg.endpoints.minimax?.baseUrl).toContain("minimaxi");
  });
});
