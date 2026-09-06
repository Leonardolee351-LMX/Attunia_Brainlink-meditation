import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import type { BioSample, SessionDebrief } from "@contracts/agents";
import { IconArrow } from "@/components/icons/IconArrow";

/** 三条曲线: arousal=clay, calm=ink, focus=暗沙 */
const LINES = [
  { key: "arousal" as const, label: "唤醒", color: "#FF6B4A" },
  { key: "calm" as const, label: "平静", color: "#111111" },
  { key: "focus" as const, label: "专注", color: "#C9A227" },
] as const;

function avg(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
}

function std(xs: number[]) {
  const m = avg(xs);
  return Math.sqrt(avg(xs.map((x) => (x - m) ** 2)));
}

function MiniChart({ samples, keys }: { samples: BioSample[]; keys?: (typeof LINES)[number]["key"][] }) {
  if (samples.length < 2) return null;
  const step = Math.max(1, Math.floor(samples.length / 80));
  const pts = samples.filter((_, i) => i % step === 0);
  const W = 600;
  const H = 150;
  const x = (i: number) => (i / (pts.length - 1)) * W;
  const y = (v: number) => H - (v / 100) * H;
  const active = keys ? LINES.filter((l) => keys.includes(l.key)) : LINES;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="训练状态曲线">
        {[0, 25, 50, 75, 100].map((g) => (
          <line key={g} x1={0} y1={y(g)} x2={W} y2={y(g)} stroke="#E8EAEE" strokeWidth={1} />
        ))}
        {active.map((l) => (
          <polyline
            key={l.key}
            fill="none"
            stroke={l.color}
            strokeWidth={2}
            strokeLinejoin="round"
            points={pts.map((s, i) => `${x(i)},${y(s[l.key])}`).join(" ")}
          />
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3">
        {active.map((l) => (
          <span key={l.key} className="flex items-center gap-1.5 text-[11px] text-ink/50">
            <span className="h-1.5 w-4 rounded-full" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function derivedRows(samples: BioSample[]) {
  if (samples.length < 3) return [];
  const a = samples.map((s) => s.arousal);
  const f = samples.map((s) => s.focus);
  const c = samples.map((s) => s.calm);
  const mid = Math.floor(samples.length / 2);
  const early = samples.slice(0, Math.max(3, mid));
  const late = samples.slice(mid);
  return [
    {
      id: "focus-relax",
      label: "专注 / 平静比",
      value: (avg(f) / Math.max(8, avg(c))).toFixed(2),
      hint: "偏高像还在抓；偏低像已经交出去一点。",
    },
    {
      id: "arousal-vol",
      label: "唤醒波动",
      value: std(a).toFixed(1),
      hint: "数字小＝曲线更稳；大一点只说明今天情绪潮汐更明显。",
    },
    {
      id: "early-late-calm",
      label: "前后平静差",
      value: `${Math.round(avg(late.map((s) => s.calm)) - avg(early.map((s) => s.calm)))}`,
      hint: "后半程比前半程更平静时，练习往往「长进身体里了」。",
    },
    {
      id: "focus-lift",
      label: "专注前后差",
      value: `${Math.round(avg(late.map((s) => s.focus)) - avg(early.map((s) => s.focus)))}`,
      hint: "可正可负；负也不丢人，有时先放下才是在休息。",
    },
  ];
}

/** 点开高亮胶囊后的大脑变化详情层 */
function BrainDetailSheet({
  open,
  onClose,
  debrief,
  samples,
  focusKey,
}: {
  open: boolean;
  onClose: () => void;
  debrief: SessionDebrief;
  samples: BioSample[];
  focusKey: "arousal" | "calm" | "focus" | "all";
}) {
  if (!open) return null;
  const chartKeys =
    focusKey === "all" ? undefined : ([focusKey] as (typeof LINES)[number]["key"][]);
  const rows = derivedRows(samples);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-3 sm:items-center" role="dialog">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="关闭" onClick={onClose} />
      <div className="relative z-10 max-h-[88vh] w-full max-w-md overflow-y-auto rounded-[28px] bg-cream p-5 shadow-[0_24px_60px_-28px_rgba(17,17,17,0.55)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="label-caps">大脑变化详情</p>
            <h3 className="font-display mt-1 text-lg font-bold text-ink">把刚才的起伏轻轻摊开</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink/50 ring-1 ring-ink/8"
            aria-label="关闭详情"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {(
            [
              ["唤醒", debrief.deltas.arousal],
              ["专注", debrief.deltas.focus],
              ["平静", debrief.deltas.calm],
            ] as const
          ).map(([label, v]) => (
            <div key={label} className="rounded-[18px] bg-white px-3 py-3 text-center ring-1 ring-ink/5">
              <p className="text-[10px] text-ink/40">{label}</p>
              <p className="font-display mt-0.5 text-lg font-bold tabular-nums text-ink">
                {v > 0 ? "+" : ""}
                {v}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-[22px] bg-white p-4 ring-1 ring-ink/5">
          <p className="mb-2 text-[11px] font-semibold text-ink/45">
            {focusKey === "all" ? "三通道全程" : `聚焦 · ${LINES.find((l) => l.key === focusKey)?.label}`}
          </p>
          <MiniChart samples={samples} keys={chartKeys} />
        </div>

        <div className="mt-3 space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded-[18px] bg-white px-3.5 py-3 ring-1 ring-ink/5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold text-ink">{r.label}</span>
                <span className="font-display text-[15px] tabular-nums text-ink">{r.value}</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-ink/50">{r.hint}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FoldSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="nf-card overflow-hidden p-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-5 py-3.5 text-left"
      >
        <span>
          <span className="block text-[13px] font-semibold text-ink">{title}</span>
          {subtitle && <span className="mt-0.5 block text-[11px] text-ink/40">{subtitle}</span>}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] text-ink/35">
          {open ? "收起" : "展开"}
          <IconArrow direction={open ? "up" : "down"} className="h-3 w-3" />
        </span>
      </button>
      {open && <div className="border-t border-ink/6 px-5 pt-3 pb-5">{children}</div>}
    </div>
  );
}

function highlightFocus(label: string): "arousal" | "calm" | "focus" | "all" {
  if (label.includes("唤醒")) return "arousal";
  if (label.includes("平静") || label.includes("软")) return "calm";
  if (label.includes("专注") || label.includes("松")) return "focus";
  return "all";
}

export default function DebriefPanel({
  debrief,
  samples,
  onRestart,
}: {
  debrief: SessionDebrief;
  samples: BioSample[];
  onRestart: () => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [focusKey, setFocusKey] = useState<"arousal" | "calm" | "focus" | "all">("all");
  const derived = useMemo(() => derivedRows(samples), [samples]);

  const openSheet = (key: "arousal" | "calm" | "focus" | "all" = "all") => {
    setFocusKey(key);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[32px] bg-ink p-6 text-white">
        <div className="flex items-center gap-1.5 text-[11px] tracking-[0.14em] text-white/50 uppercase">
          <span>✦</span> Tuno 写给你
        </div>
        <p className="mt-3 font-display text-[1.05rem] leading-relaxed">{debrief.summary}</p>
        {debrief.discovery && (
          <p className="mt-3 rounded-[18px] bg-white/8 px-3.5 py-3 text-[12px] leading-relaxed text-white/70">
            <span className="text-white/45">挖到一点 · </span>
            {debrief.discovery}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {debrief.highlights.map((h) => (
            <button
              key={h.label}
              type="button"
              onClick={() => openSheet(highlightFocus(h.label))}
              className="rounded-full bg-white/10 px-3 py-1.5 text-left text-xs transition hover:bg-white/18 active:scale-[0.98]"
            >
              {h.label} <span className="font-semibold">{h.value}</span>
              <span className="ml-1 text-[10px] text-white/35">详情</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => openSheet("all")}
          className="mt-3 text-[11px] text-white/45 underline-offset-2 hover:text-white/75 hover:underline"
        >
          点开表格看大脑变化详情 →
        </button>
      </div>

      <div className="grid gap-3">
        {debrief.insights.map((ins, i) => (
          <div
            key={i}
            className={`rounded-[22px] bg-white p-5 ring-1 ring-ink/5 ${
              ins.tone === "nudge" ? "bg-[#faf0e8]/80 ring-clay/15" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <span aria-hidden>{ins.icon}</span>
              <span className="text-sm font-medium text-ink">{ins.title}</span>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-ink/60">{ins.detail}</p>
          </div>
        ))}
      </div>

      <FoldSection
        title="状态曲线"
        subtitle={`${samples.length} 个采样 · 训练中静静记下的`}
        defaultOpen={false}
      >
        <MiniChart samples={samples} />
        <button
          type="button"
          onClick={() => openSheet("all")}
          className="mt-3 text-[11px] font-semibold text-ink/45 hover:text-ink"
        >
          放大查看详情
        </button>
      </FoldSection>

      <FoldSection
        title="派生洞察"
        subtitle="辅助指数，可随时收起"
        defaultOpen={false}
      >
        <div className="space-y-2">
          {derived.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => openSheet("all")}
              className="flex w-full items-start justify-between gap-3 rounded-[16px] bg-sand/40 px-3 py-2.5 text-left transition hover:bg-sand/70"
            >
              <span>
                <span className="block text-[12px] font-semibold text-ink">{r.label}</span>
                <span className="mt-0.5 block text-[10px] leading-relaxed text-ink/45">{r.hint}</span>
              </span>
              <span className="font-display shrink-0 text-[15px] tabular-nums text-ink">{r.value}</span>
            </button>
          ))}
        </div>
      </FoldSection>

      <div className="nf-card space-y-4 p-5">
        <div>
          <span className="label-caps">接下来可以…</span>
          <p className="mt-1.5 text-sm leading-relaxed text-ink/70">{debrief.nextSuggestion.reason}</p>
        </div>
        <div className="flex flex-col gap-2">
          {debrief.nextSuggestion.consultSuggested ? (
            <Link to="/consult" className="nf-btn-primary !py-2.5 text-center text-xs">
              ✦ 交给 Tuno & Friends
            </Link>
          ) : (
            debrief.nextSuggestion.planId && (
              <Link
                to={`/session/${debrief.nextSuggestion.planId}`}
                className="nf-btn-primary inline-flex !py-2.5 items-center justify-center gap-1.5 text-center text-xs"
              >
                试试「{debrief.nextSuggestion.planName}」
                <IconArrow direction="right" className="h-3.5 w-3.5" />
              </Link>
            )
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onRestart} className="nf-btn-ghost flex-1 !py-2.5 text-xs">
              再练一次
            </button>
            <Link to="/home" className="nf-btn-ghost flex-1 !py-2.5 text-center text-xs">
              回到首页
            </Link>
          </div>
        </div>
        {debrief.engine && debrief.engine !== "rule" && (
          <p className="text-center text-[10px] text-ink/30">解读由 {debrief.engine} · 结合本次曲线</p>
        )}
      </div>

      <BrainDetailSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        debrief={debrief}
        samples={samples}
        focusKey={focusKey}
      />
    </div>
  );
}
