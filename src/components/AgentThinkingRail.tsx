import { useEffect, useState } from "react";
import { getLiveSnapshot, isLiveHardware, subscribeLive, type LiveBio } from "@/lib/live-device";

const DEFAULT_STEPS = [
  "采集数据ing",
  "理解用户状态ing",
  "思考对策ing",
  "编排训练任务ing",
] as const;

/** 轻量脑电条：三通道高度随 live / 演示抖动 */
function MiniBioBars({ bio }: { bio: { arousal: number; focus: number; calm: number } }) {
  const bars = [
    { key: "a", v: bio.arousal, color: "#FF6B4A" },
    { key: "f", v: bio.focus, color: "#C9A227" },
    { key: "c", v: bio.calm, color: "#111111" },
  ];
  return (
    <div className="flex h-10 items-end justify-center gap-1.5" aria-hidden>
      {bars.map((b) => (
        <span
          key={b.key}
          className="w-2 rounded-full transition-[height] duration-700 ease-out"
          style={{
            height: `${Math.max(18, Math.min(100, b.v))}%`,
            background: b.color,
            opacity: 0.75,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Agent 思考过程：状态语轮播 + 轻量脑电条。
 * liveLabel 有值时锁定为后端真实阶段文案（不再假轮播）。
 */
export default function AgentThinkingRail({
  steps = DEFAULT_STEPS,
  title = "Tuno 正在想",
  liveLabel,
  className = "",
}: {
  steps?: readonly string[];
  title?: string;
  /** 后端推送的真实阶段，优先显示 */
  liveLabel?: string | null;
  className?: string;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [bio, setBio] = useState(() => {
    const snap = getLiveSnapshot().last;
    if (isLiveHardware() && snap) return { arousal: snap.arousal, focus: snap.focus, calm: snap.calm };
    return { arousal: 62, focus: 54, calm: 48 };
  });

  useEffect(() => {
    if (liveLabel) return;
    const t = window.setInterval(() => {
      setStepIdx((i) => (i + 1) % steps.length);
    }, 1600);
    return () => window.clearInterval(t);
  }, [steps.length, liveLabel]);

  useEffect(() => {
    const off = subscribeLive((b: LiveBio) => {
      if (!isLiveHardware()) return;
      setBio({ arousal: b.arousal, focus: b.focus, calm: b.calm });
    });
    const demo = window.setInterval(() => {
      if (isLiveHardware()) return;
      setBio((prev) => ({
        arousal: Math.max(20, Math.min(90, prev.arousal + (Math.random() - 0.5) * 6)),
        focus: Math.max(20, Math.min(90, prev.focus + (Math.random() - 0.5) * 5)),
        calm: Math.max(20, Math.min(90, prev.calm + (Math.random() - 0.5) * 5)),
      }));
    }, 900);
    return () => {
      off();
      window.clearInterval(demo);
    };
  }, []);

  const headline = liveLabel?.trim() || steps[stepIdx];

  return (
    <div className={`rounded-[22px] bg-white px-4 py-4 ring-1 ring-ink/5 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-end justify-center rounded-[14px] bg-sand/60 px-2 py-1.5">
          <MiniBioBars bio={bio} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink" />
            <p className="text-[12px] font-semibold text-ink">{title}</p>
          </div>
          <p className="font-display mt-1 text-[15px] font-bold text-ink/80 transition-opacity duration-300">
            {headline}
          </p>
          {!liveLabel && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {steps.map((s, i) => (
                <li
                  key={s}
                  className={`rounded-full px-2 py-0.5 text-[9px] ${
                    i === stepIdx ? "bg-mint text-ink" : i < stepIdx ? "bg-sand text-ink/45" : "bg-sand/40 text-ink/30"
                  }`}
                >
                  {s.replace(/ing$/, "")}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
