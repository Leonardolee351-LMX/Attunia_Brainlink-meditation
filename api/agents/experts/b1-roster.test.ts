import { describe, expect, it } from "vitest";
import { UserAgent } from "../user-agent";
import { createExperts } from "./experts";
import { buildTherapyCatalog } from "../data/therapy-catalog";
import { DEMO_PROFILE, GOALS, PLANS } from "../data/presets";
import { matchPlans } from "../matching/engine";
import { getLLMProvider } from "../llm/provider";

const state = {
  arousal: 78,
  focus: 44,
  calm: 38,
  sleepHours: 6.2,
  availableMinutes: 15,
};

describe("B-1 expert roster + therapy catalog", () => {
  it("has five experts: Mira=心理咨询, Sona=艺术与创作 and can invent", () => {
    const experts = createExperts();
    expect(experts).toHaveLength(5);
    expect(experts.map((e) => e.domain).sort()).toEqual(
      ["心流体验", "心理咨询", "艺术与创作", "脑科学", "认知科学"].sort(),
    );
    expect(experts.some((e) => e.domain === "创作")).toBe(false);
    const mira = experts.find((e) => e.name === "Mira");
    const sona = experts.find((e) => e.name === "Sona");
    expect(mira?.domain).toBe("心理咨询");
    expect(sona?.domain).toBe("艺术与创作");
    expect(sona?.id).toBe("expert_art");
  });

  it("gives every expert the full catalog; rule proposals start from 对照疗法目录", async () => {
    const catalog = buildTherapyCatalog(matchPlans(GOALS[0], state, PLANS, PLANS.length));
    expect(catalog).toHaveLength(PLANS.length);
    const experts = createExperts();
    const llm = getLLMProvider({ provider: "rule" });
    for (const expert of experts) {
      const proposal = await expert.propose({
        goal: GOALS[0],
        state,
        scored: matchPlans(GOALS[0], state, PLANS, PLANS.length),
        catalog,
        llm,
      });
      expect(proposal).toBeTruthy();
      expect(proposal!.rationale.startsWith("对照疗法目录")).toBe(true);
      expect(proposal!.domain).toBe(expert.domain);
    }
  });

  it("rule consult assigns by stage from catalog and never invents", async () => {
    const nova = new UserAgent(DEMO_PROFILE);
    const result = await nova.consultMessage("开会后心跳很快，帮我即兴写一个练习", state, {
      provider: "rule",
    });
    expect(result.analysis.creativityNeeded).toBe(false);
    expect(result.proposals.every((p) => p.planId !== "invented")).toBe(true);
    expect(result.decision.planId).not.toBe("invented");
    expect(result.transcript.some((m) => m.content.includes("不创作新练习"))).toBe(true);
    expect(result.transcript.some((m) => m.content.includes(`现有疗法目录共 ${PLANS.length} 项`))).toBe(
      true,
    );
  });
});
