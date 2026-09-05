import { describe, expect, it } from "vitest";
import { iconForExpert } from "./expert-icons";

describe("expert icons", () => {
  it("maps Mira and Sona by id, and aliases 创作 to 艺术", () => {
    expect(iconForExpert({ expertId: "expert_counsel" })).toBe("◐");
    expect(iconForExpert({ expertId: "expert_art" })).toBe("❋");
    expect(iconForExpert({ domain: "艺术与创作" })).toBe("❋");
    expect(iconForExpert({ reason: "本次需要创作视角" })).toBe("❋");
    expect(iconForExpert({ reason: "心理咨询取向" })).toBe("◐");
  });
});
