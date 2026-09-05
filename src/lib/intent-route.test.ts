import { describe, expect, it } from "vitest";
import { routeHomeIntent, takeHomeIntent, wantsCustomConsult } from "./intent-route";

describe("wantsCustomConsult", () => {
  it("routes ordinary state talk to conversation", () => {
    expect(wantsCustomConsult("开完会心跳很快，有十五分钟")).toBe(false);
    expect(routeHomeIntent("想放松一下再继续工作")).toBe("chat");
  });

  it("routes novelty / custom therapy talk to Tuno consult", () => {
    expect(wantsCustomConsult("我需要一些新的疗法")).toBe(true);
    expect(wantsCustomConsult("想要高度定制的方案")).toBe(true);
    expect(wantsCustomConsult("来点新鲜感，更新奇一点")).toBe(true);
    expect(routeHomeIntent("有没有更适配我的疗愈方式")).toBe("consult");
  });
});

describe("takeHomeIntent", () => {
  it("consumes the same intentId only once", () => {
    const state = { prefillMessage: "静不下来", autoStart: true, intentId: "once-1" };
    expect(takeHomeIntent(state)).toBe("静不下来");
    expect(takeHomeIntent(state)).toBe(null);
  });
});
