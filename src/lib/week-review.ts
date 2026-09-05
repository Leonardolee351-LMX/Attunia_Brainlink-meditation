import type { SessionRecord } from "@contracts/agents";

const WEEKDAY = ["日", "一", "二", "三", "四", "五", "六"];

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function lastNLocalDays(now = new Date(), n = 7): Date[] {
  const today = startOfLocalDay(now);
  const days: Date[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }
  return days;
}

function dayEnd(day: Date): Date {
  const next = new Date(day);
  next.setDate(day.getDate() + 1);
  return next;
}

export function isInLocalDay(iso: string, day: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= day.getTime() && t < dayEnd(day).getTime();
}

export interface WeekDayCell {
  date: Date;
  weekday: string;
  count: number;
}

export interface WeekReview {
  count: number;
  totalMin: number;
  improveRate: number | null;
  topPlanName: string | null;
  days: WeekDayCell[];
  rangeLabel: string;
}

function md(d: Date): string {
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function buildWeekReview(sessions: SessionRecord[], now = new Date()): WeekReview {
  const days = lastNLocalDays(now, 7).map((date) => ({
    date,
    weekday: WEEKDAY[date.getDay()],
    count: sessions.filter((s) => isInLocalDay(s.at, date)).length,
  }));
  const from = days[0]?.date ?? startOfLocalDay(now);
  const weekSessions = sessions.filter((s) => {
    const t = new Date(s.at).getTime();
    return t >= from.getTime() && t < dayEnd(days[days.length - 1]!.date).getTime();
  });
  const byPlan = new Map<string, { name: string; n: number }>();
  for (const s of weekSessions) {
    const cur = byPlan.get(s.planId) ?? { name: s.planName, n: 0 };
    cur.n += 1;
    byPlan.set(s.planId, cur);
  }
  let topPlanName: string | null = null;
  let topN = 0;
  for (const v of byPlan.values()) {
    if (v.n > topN) {
      topN = v.n;
      topPlanName = v.name;
    }
  }
  const improved = weekSessions.filter((s) => s.arousalEnd < s.arousalStart).length;
  const last = days[days.length - 1]!.date;
  return {
    count: weekSessions.length,
    totalMin: weekSessions.reduce((n, s) => n + s.durationMin, 0),
    improveRate: weekSessions.length > 0 ? improved / weekSessions.length : null,
    topPlanName,
    days,
    rangeLabel: `${md(from)} – ${md(last)}`,
  };
}
