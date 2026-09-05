import { describe, expect, it } from "vitest";
import { loadLlmApiRegistry, resetLlmApiRegistry } from "./llm-apis";

describe("llm-apis markdown registry", () => {
  it("reads local Kimi/MiniMax endpoints without exposing keys in assertions", () => {
    resetLlmApiRegistry();
    const reg = loadLlmApiRegistry();
    expect(reg.defaultProvider).toBe("minimax");
    expect(reg.endpoints.kimi?.baseUrl).toContain("moonshot");
    expect(reg.endpoints.minimax?.baseUrl).toContain("minimaxi");
    expect((reg.endpoints.kimi?.apiKey ?? "").length).toBeGreaterThan(8);
    expect((reg.endpoints.minimax?.apiKey ?? "").length).toBeGreaterThan(8);
  });
});
