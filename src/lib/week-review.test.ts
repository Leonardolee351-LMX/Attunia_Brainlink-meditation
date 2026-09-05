import { describe, expect, it } from "vitest";
import { buildWeekReview, isInLocalDay, lastNLocalDays, startOfLocalDay } from "./week-review";
import type { SessionRecord } from "@contracts/agents";

function rec(at: string, extra: Partial<SessionRecord> = {}): SessionRecord {
  return {
    planId: "breath-478",
    planName: "4-7-8 生理刹车",
    goalId: "calm",
    durationMin: 8,
    at,
    arousalStart: 70,
    arousalEnd: 55,
    ...extra,
  };
}

describe("week-review", () => {
  it("lists seven local days ending today", () => {
    const now = new Date(2026, 8, 5, 12, 0, 0);
    const days = lastNLocalDays(now, 7);
    expect(days).toHaveLength(7);
    expect(days[6]).toEqual(startOfLocalDay(now));
    expect(days[0]).toEqual(new Date(2026, 8, 5 - 6));
  });

  it("counts only sessions inside the last 7 local days", () => {
    const now = new Date(2026, 8, 5, 18, 0, 0);
    const today = rec(now.toISOString());
    const eightDaysAgo = rec(new Date(2026, 7, 28, 10, 0, 0).toISOString(), { planId: "old" });
    const review = buildWeekReview([today, eightDaysAgo], now);
    expect(review.count).toBe(1);
    expect(review.totalMin).toBe(8);
    expect(review.topPlanName).toBe("4-7-8 生理刹车");
    expect(review.days[6].count).toBe(1);
  });

  it("treats a session as in-day using local midnight bounds", () => {
    const day = new Date(2026, 8, 5);
    expect(isInLocalDay(new Date(2026, 8, 5, 0, 0, 0).toISOString(), day)).toBe(true);
    expect(isInLocalDay(new Date(2026, 8, 6, 0, 0, 0).toISOString(), day)).toBe(false);
  });
});
