import type { UserState } from "@contracts/agents";

interface Props {
  value: UserState;
  onChange: (s: UserState) => void;
  /** bare=true 时不渲染自带卡片外壳(由父级容器提供) */
  bare?: boolean;
}

function Row(props: {
  label: string;
  display: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs text-ink/60">{props.label}</span>
        <span className="font-display text-sm font-semibold text-ink">{props.display}</span>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="w-full accent-ink"
      />
    </div>
  );
}

/** 模拟 NeuroBand 读数面板(接硬件前作为状态输入) */
export default function StatePanel({ value, onChange, bare }: Props) {
  const set = (patch: Partial<UserState>) => onChange({ ...value, ...patch });
  const body = (
    <>
      <div className="space-y-3">
        <Row label="Arousal 唤醒度" display={`${value.arousal}`} min={0} max={100}
          value={value.arousal} onChange={(v) => set({ arousal: v })} />
        <Row label="Focus 专注" display={`${value.focus}`} min={0} max={100}
          value={value.focus} onChange={(v) => set({ focus: v })} />
        <Row label="Calm 冷静" display={`${value.calm}`} min={0} max={100}
          value={value.calm} onChange={(v) => set({ calm: v })} />
        <Row label="昨夜睡眠" display={`${value.sleepHours.toFixed(1)}h`} min={3} max={10} step={0.1}
          value={value.sleepHours} onChange={(v) => set({ sleepHours: v })} />
        <Row label="可用时长" display={`${value.availableMinutes} min`} min={5} max={60} step={5}
          value={value.availableMinutes} onChange={(v) => set({ availableMinutes: v })} />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-ink/40">
        接硬件后此面板由真实 EEG 数据流替换;对话中的状态线索只修正不覆盖。
      </p>
    </>
  );
  if (bare) return body;
  return (
    <div className="nf-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="label-caps">NeuroBand · 模拟状态</span>
        <span className="flex items-center gap-1.5 text-xs text-ink">
          <span className="h-1.5 w-1.5 rounded-full bg-ink" />
          Connected
        </span>
      </div>
      {body}
    </div>
  );
}
