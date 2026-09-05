import { Link } from "react-router";
import type { BioSample, SessionDebrief } from "@contracts/agents";
import { IconArrow } from "@/components/icons/IconArrow";

/** 三条曲线的颜色:arousal=clay,calm=pine,focus=暗沙 */
const LINES = [
  { key: "arousal", label: "Arousal", color: "#FF6B4A" },
  { key: "calm", label: "Calm", color: "#111111" },
  { key: "focus", label: "Focus", color: "#C9A227" },
] as const;

function MiniChart({ samples }: { samples: BioSample[] }) {
  if (samples.length < 2) return null;
  // 降采样到 ~80 个点
  const step = Math.max(1, Math.floor(samples.length / 80));
  const pts = samples.filter((_, i) => i % step === 0);
  const W = 600;
  const H = 150;
  const x = (i: number) => (i / (pts.length - 1)) * W;
  const y = (v: number) => H - (v / 100) * H;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0, 25, 50, 75, 100].map((g) => (
          <line key={g} x1={0} y1={y(g)} x2={W} y2={y(g)} stroke="#E8EAEE" strokeWidth={1} />
        ))}
        {LINES.map((l) => (
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
      <div className="mt-2 flex gap-4">
        {LINES.map((l) => (
          <span key={l.key} className="flex items-center gap-1.5 text-[11px] text-ink/50">
            <span className="h-1.5 w-4 rounded-full" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
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
  return (
    <div className="space-y-5">
      {/* Tuno 的开场解读 */}
      <div className="rounded-[32px] bg-ink p-6 text-white">
        <div className="flex items-center gap-1.5 text-[11px] tracking-[0.14em] text-white/50 uppercase">
          <span>✦</span> Tuno 的训练解读
        </div>
        <p className="mt-3 font-display text-lg leading-relaxed">{debrief.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {debrief.highlights.map((h) => (
            <span key={h.label} className="rounded-full bg-white/10 px-3 py-1.5 text-xs">
              {h.label} <span className="font-semibold">{h.value}</span>
            </span>
          ))}
        </div>
      </div>

      {/* 状态曲线(训练中隐形记录的数据,此刻才呈现) */}
      <div className="nf-card p-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="label-caps">本次训练的状态曲线</span>
          <span className="text-[10px] text-ink/35">
            {samples.length} 个采样点 · 由训练中的隐形记录器采集
          </span>
        </div>
        <MiniChart samples={samples} />
      </div>

      {/* 友情提示 */}
      <div className="grid gap-3 @md:grid-cols-2">
        {debrief.insights.map((ins, i) => (
          <div
            key={i}
            className={`nf-card p-5 ${ins.tone === "nudge" ? "border-clay/20 bg-[#faf0e8]/50" : ""}`}
          >
            <div className="flex items-center gap-2">
              <span>{ins.icon}</span>
              <span className="text-sm font-medium text-ink">{ins.title}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink/60">{ins.detail}</p>
          </div>
        ))}
      </div>

      {/* 下一步 */}
      <div className="nf-card space-y-4 p-5">
        <div>
          <span className="label-caps">下一步建议</span>
          <p className="mt-1.5 text-sm leading-relaxed text-ink/70">{debrief.nextSuggestion.reason}</p>
        </div>
        <div className="flex flex-col gap-2">
          {debrief.nextSuggestion.consultSuggested ? (
            <Link to="/consult" className="nf-btn-primary !py-2.5 text-center text-xs">
              ✦ 发起 A2A 会诊
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
            <button
              onClick={onRestart}
              className="nf-btn-ghost flex-1 !py-2.5 text-xs"
            >
              再练一次
            </button>
            <Link
              to="/home"
              className="nf-btn-ghost flex-1 !py-2.5 text-center text-xs"
            >
              回到首页
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
