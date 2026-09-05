import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import Shell from "@/components/Shell";
import PageHeader from "@/components/PageHeader";
import LLMSettings from "@/components/LLMSettings";
import { ComplianceFinePrint } from "@/components/ComplianceNote";
import { loadBaseline, resetOnboarding } from "@/lib/baseline";
import { loadUserName, saveUserName } from "@/lib/user";
import { loadMemory } from "@/lib/memory";
import { buildWeekReview } from "@/lib/week-review";
import type { ConsultRecord, SessionRecord } from "@contracts/agents";

const GOAL_LABEL: Record<string, string> = {
  calm: "减压平复",
  focus: "提升专注",
  sleep: "睡前准备",
};

function Rule() {
  return <hr className="my-6 border-0 border-t border-ink/10" />;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const md = `${d.getMonth() + 1}月${d.getDate()}日`;
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (d.getFullYear() !== now.getFullYear()) return `${d.getFullYear()}年${md} ${hm}`;
  return `${md} ${hm}`;
}

type MemoryItem =
  | { kind: "session"; at: string; rec: SessionRecord }
  | { kind: "consult"; at: string; rec: ConsultRecord };

export default function ProfilePage() {
  const navigate = useNavigate();
  const baseline = loadBaseline();
  const [name, setName] = useState(loadUserName());
  const [editingName, setEditingName] = useState(false);
  const mem = loadMemory();
  const week = useMemo(() => buildWeekReview(mem.sessions), [mem.sessions]);

  const items: MemoryItem[] = useMemo(() => {
    const rows: MemoryItem[] = [
      ...mem.sessions.map((rec) => ({ kind: "session" as const, at: rec.at, rec })),
      ...mem.consults.map((rec) => ({ kind: "consult" as const, at: rec.at, rec })),
    ];
    rows.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
    return rows;
  }, [mem.sessions, mem.consults]);

  return (
    <Shell>
      <PageHeader
        kicker="Profile"
        title="你的空间"
        subtitle="称呼、训练记忆、一周回顾与模型接入都在这里。数据只留在这台设备上。"
      />

      <section>
        <span className="label-caps">怎么称呼你</span>
        {editingName ? (
          <input
            autoFocus
            defaultValue={name}
            maxLength={12}
            placeholder="留空则叫你朋友"
            onBlur={(e) => {
              saveUserName(e.target.value);
              setName(e.target.value.trim());
              setEditingName(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="mt-3 w-full rounded-full bg-white px-4 py-2.5 text-base shadow-[0_8px_24px_-16px_rgba(17,17,17,0.35)] outline-none focus:ring-2 focus:ring-ink/15"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingName(true)}
            className="mt-2 flex min-h-11 w-full items-center justify-between text-left"
          >
            <span className="font-display text-xl font-bold text-ink">{name || "朋友"}</span>
            <span className="text-[11px] font-semibold text-ink/35">编辑</span>
          </button>
        )}
      </section>

      <Rule />

      <section>
        <span className="label-caps">脑电波基线</span>
        <div className="mt-3 flex items-end justify-between gap-3">
          {baseline ? (
            <div className="flex flex-1 items-end justify-around">
              {(
                [
                  ["唤醒", baseline.arousal],
                  ["专注", baseline.focus],
                  ["平静", baseline.calm],
                ] as const
              ).map(([label, v]) => (
                <div key={label} className="text-center">
                  <div className="font-display text-[1.65rem] leading-none font-bold text-ink">{v}</div>
                  <div className="mt-1.5 text-[10px] text-ink/45">{label}</div>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-[13px] text-ink/40">还没有脑波基线</span>
          )}
          <button
            type="button"
            onClick={() => {
              resetOnboarding();
              navigate("/");
            }}
            className="min-h-11 shrink-0 rounded-full bg-ink px-4 text-[12px] font-semibold text-white"
          >
            重新校正
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-ink/40">
          重新跑一遍开屏校准，会覆盖当前这三个数字。
        </p>
      </section>

      <Rule />

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <span className="label-caps">一周回顾</span>
          <span className="text-[11px] text-ink/35">{week.rangeLabel}</span>
        </div>
        {week.count === 0 ? (
          <p className="mt-3 text-[14px] leading-relaxed text-ink/50">
            这一周还没有训练。完成一次，回顾就会出现在这里。
          </p>
        ) : (
          <>
            <p className="font-display mt-2 text-[1.35rem] leading-snug font-bold text-ink">
              {week.count} 次 · {week.totalMin} 分钟
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink/55">
              {week.topPlanName ? `最常练「${week.topPlanName}」` : "还没有固定偏好"}
              {week.improveRate !== null
                ? ` · ${Math.round(week.improveRate * 100)}% 训练后唤醒下降`
                : ""}
            </p>
          </>
        )}
        <div className="mt-4 grid grid-cols-7 gap-1">
          {week.days.map((d) => (
            <div key={d.date.toISOString()} className="text-center">
              <div
                className={`mx-auto flex h-8 items-center justify-center text-[13px] font-semibold ${
                  d.count > 0 ? "text-ink" : "text-ink/25"
                }`}
              >
                {d.count > 0 ? d.count : "·"}
              </div>
              <div className="mt-0.5 text-[10px] text-ink/40">{d.weekday}</div>
            </div>
          ))}
        </div>
      </section>

      <Rule />

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <span className="label-caps">训练记忆</span>
          <span className="text-[11px] text-ink/35">
            {mem.sessions.length} 次训练
            {mem.consults.length > 0 ? ` · ${mem.consults.length} 次会诊` : ""}
          </span>
        </div>
        {items.length === 0 ? (
          <p className="mt-3 text-[14px] leading-relaxed text-ink/50">
            还没有训练记录。练完一次，Tuno 会把这次记在这台设备上。
          </p>
        ) : (
          <ul className="mt-2">
            {items.map((item, i) =>
              item.kind === "session" ? (
                <li key={`s-${i}-${item.rec.at}`} className="border-b border-ink/10 last:border-0">
                  <Link
                    to={`/session/${item.rec.planId}`}
                    className="flex min-h-11 items-baseline justify-between gap-3 py-3"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-display text-[15px] font-bold text-ink">
                        {item.rec.planName}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-ink/45">
                        {formatWhen(item.rec.at)}
                        {item.rec.goalId ? ` · ${GOAL_LABEL[item.rec.goalId] ?? item.rec.goalId}` : ""}
                        {` · ${item.rec.durationMin} min`}
                      </span>
                    </span>
                    <span className="shrink-0 text-[12px] tabular-nums text-ink/40">
                      {item.rec.arousalEnd < item.rec.arousalStart
                        ? `唤醒 ↓${item.rec.arousalStart - item.rec.arousalEnd}`
                        : item.rec.arousalEnd > item.rec.arousalStart
                          ? `唤醒 ↑${item.rec.arousalEnd - item.rec.arousalStart}`
                          : "唤醒 —"}
                    </span>
                  </Link>
                </li>
              ) : (
                <li key={`c-${i}-${item.rec.at}`} className="border-b border-ink/10 last:border-0">
                  <div className="flex min-h-11 items-baseline justify-between gap-3 py-3">
                    <span className="min-w-0">
                      <span className="block truncate font-display text-[15px] font-bold text-ink">
                        会诊 · {item.rec.planName}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-ink/45">
                        {formatWhen(item.rec.at)}
                        {item.rec.goalId ? ` · ${GOAL_LABEL[item.rec.goalId] ?? item.rec.goalId}` : ""}
                      </span>
                    </span>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </section>

      <Rule />

      <LLMSettings defaultOpen bare />

      <footer className="pt-6 pb-4">
        <ComplianceFinePrint />
      </footer>
    </Shell>
  );
}
