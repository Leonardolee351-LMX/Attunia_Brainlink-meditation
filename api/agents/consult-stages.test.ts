import { describe, expect, it } from "vitest";
import { UserAgent } from "./user-agent";
import { orderedGoalIds } from "./consult-stages";
import { DEMO_PROFILE, PLANS } from "./data/presets";

const state = {
  arousal: 62,
  focus: 40,
  calm: 48,
  sleepHours: 6.5,
  availableMinutes: 20,
};

describe("Multi-Agent stage consult", () => {
  it("orders 先停下工作 再睡前 as calm then sleep, not focus", () => {
    expect(
      orderedGoalIds("我现在很困，我需要先慢慢停下工作，然后再慢慢可以进入睡前准备的状态"),
    ).toEqual(["calm", "sleep"]);
  });

  it("stitches two catalog modules and does not invent", async () => {
    const nova = new UserAgent(DEMO_PROFILE);
    const result = await nova.consultMessage(
      "我现在很困，我需要先慢慢停下工作，然后再慢慢可以进入睡前准备的状态",
      state,
      { provider: "rule" },
    );
    expect(result.analysis.creativityNeeded).toBe(false);
    const ids = result.analysis.selectedExperts.map((e) => e.expertId);
    expect(ids).toContain("expert_counsel");
    expect(ids).toContain("expert_neuro");
    expect(ids).toContain("expert_art");
    expect(ids).not.toContain("expert_flow");
    expect(result.proposals.every((p) => p.planId !== "invented")).toBe(true);
    expect(result.decision.planId).not.toBe("invented");
    expect(PLANS.some((p) => p.id === result.decision.planId)).toBe(true);
    expect(result.decision.planName.includes("→")).toBe(true);
    expect(result.decision.customized.phases.length).toBeGreaterThan(3);
    expect(result.decision.adoptedFrom.some((a) => a.what.includes("第1步"))).toBe(true);
    expect(result.decision.adoptedFrom.some((a) => a.what.includes("第2步"))).toBe(true);
  });
});
