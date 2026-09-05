import type { LiveBio } from "@/components/BioOrb";

const METERS = [
  { key: "arousal" as const, label: "唤醒", color: "#FF6B4A", colorDark: "#FF6B4A" },
  { key: "focus" as const, label: "专注", color: "#C9A227", colorDark: "#F5E56B" },
  { key: "calm" as const, label: "平静", color: "#111111", colorDark: "#B8F2C9" },
] as const;

/** 训练页常驻三通道。quiet：盯球时只留光柱动效，不挂数字和进度标注。 */
export default function LiveTripleMeter({
  live,
  dark,
  hardware,
  quiet = false,
}: {
  live: LiveBio;
  dark: boolean;
  hardware: boolean;
  quiet?: boolean;
}) {
  return (
    <div className="w-full">
      {!quiet && (
        <div className="mb-3 flex items-center justify-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${hardware ? "bg-[#B8F2C9]" : dark ? "bg-white/30" : "bg-ink/25"}`} />
          <span className={`text-[10px] font-medium tracking-wide ${dark ? "text-white/45" : "text-ink/40"}`}>
            {hardware ? "NeuroBand · 实时" : "演示信号"}
          </span>
        </div>
      )}
      <div className="flex items-end justify-center gap-5">
        {METERS.map((m) => {
          const v = Math.round(live[m.key]);
          const color = dark ? m.colorDark : m.color;
          return (
            <div key={m.key} className="flex w-14 flex-col items-center gap-1.5">
              <div
                className={`relative overflow-hidden rounded-full ${quiet ? "h-20 w-2.5" : "h-16 w-3"} ${
                  dark ? "bg-white/10" : "bg-ink/10"
                }`}
              >
                <div
                  className="absolute inset-x-0 bottom-0 rounded-full transition-[height] duration-500"
                  style={{
                    height: `${Math.max(8, v)}%`,
                    background: color,
                    boxShadow: quiet ? `0 0 12px ${color}` : undefined,
                  }}
                />
              </div>
              {!quiet && (
                <>
                  <span
                    className="font-display text-[15px] tabular-nums font-semibold"
                    style={{ color: dark ? "#fff" : "#111" }}
                  >
                    {v}
                  </span>
                  <span className={`text-[10px] ${dark ? "text-white/45" : "text-ink/45"}`}>{m.label}</span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
