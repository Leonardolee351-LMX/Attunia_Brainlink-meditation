/**
 * 对话气泡里、Tuno 名头与正文之间的脑电状态条。
 * 呈现当时读到的唤醒 / 专注 / 平静，不喧宾夺主。
 */

const CHANNELS = [
  { key: "arousal" as const, label: "唤醒", color: "#FF6B4A" },
  { key: "focus" as const, label: "专注", color: "#C9A227" },
  { key: "calm" as const, label: "平静", color: "#111111" },
] as const;

export type ChatBioSnapshot = {
  arousal: number;
  focus: number;
  calm: number;
  live?: boolean;
};

export default function ChatBioStatus({ bio }: { bio: ChatBioSnapshot }) {
  return (
    <div className="mb-2.5 rounded-[16px] bg-white/80 px-3 py-2.5 ring-1 ring-ink/6">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold tracking-wide text-ink/40">
          {bio.live ? "此刻脑状态" : "当时脑状态"}
        </span>
        <span className="flex items-center gap-1 text-[9px] text-ink/30">
          <span className={`h-1 w-1 rounded-full ${bio.live ? "bg-mint" : "bg-ink/25"}`} />
          {bio.live ? "实时" : "快照"}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {CHANNELS.map((ch) => {
          const v = Math.max(0, Math.min(100, Math.round(bio[ch.key])));
          return (
            <div key={ch.key} className="min-w-0">
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-[10px] text-ink/45">{ch.label}</span>
                <span className="font-display text-[12px] font-bold tabular-nums text-ink">{v}</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-ink/8">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${v}%`, background: ch.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
