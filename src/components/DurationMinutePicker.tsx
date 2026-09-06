import { useCallback, useEffect, useRef } from "react";

const ITEM_H = 44;
const PAD = 2;

type Props = {
  value: number;
  min?: number;
  max?: number;
  onChange: (n: number) => void;
  label?: string;
};

/** 上下滑动选择分钟（吸附滚动） */
export default function DurationMinutePicker({
  value,
  min = 1,
  max = 30,
  onChange,
  label = "训练时长",
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const settleTimer = useRef(0);

  const scrollToValue = useCallback(
    (n: number, smooth: boolean) => {
      const el = scrollerRef.current;
      if (!el) return;
      const top = (n - min + PAD) * ITEM_H;
      el.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
    },
    [min],
  );

  useEffect(() => {
    scrollToValue(value, false);
  }, [value, scrollToValue]);

  const settle = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const raw = Math.round(el.scrollTop / ITEM_H) - PAD;
    const next = Math.min(max, Math.max(min, min + raw));
    scrollToValue(next, true);
    if (next !== value) onChange(next);
  }, [max, min, onChange, scrollToValue, value]);

  const onScroll = () => {
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(settle, 90);
  };

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  return (
    <div className="w-full">
      <p className="text-center text-[12px] font-semibold text-ink/50">{label}</p>
      <div className="relative mx-auto mt-3 h-[132px] w-full max-w-[200px]">
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 z-[1] h-11 -translate-y-1/2 rounded-[14px] bg-ink/[0.06] ring-1 ring-ink/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-10 bg-gradient-to-b from-cream to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-10 bg-gradient-to-t from-cream to-transparent"
          aria-hidden
        />
        <div
          ref={scrollerRef}
          className="h-full snap-y snap-mandatory overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={onScroll}
          role="listbox"
          aria-label={label}
          aria-activedescendant={`dur-min-${value}`}
        >
          {Array.from({ length: PAD }).map((_, i) => (
            <div key={`pad-t-${i}`} className="h-11 snap-center" aria-hidden />
          ))}
          {options.map((n) => {
            const active = n === value;
            return (
              <button
                key={n}
                id={`dur-min-${n}`}
                type="button"
                role="option"
                aria-selected={active}
                className={`flex h-11 w-full snap-center items-center justify-center text-[22px] transition ${
                  active ? "font-display font-extrabold text-ink" : "font-medium text-ink/30"
                }`}
                onClick={() => {
                  onChange(n);
                  scrollToValue(n, true);
                }}
              >
                {n}
                <span className={`ml-1 text-[13px] ${active ? "text-ink/55" : "text-ink/25"}`}>分钟</span>
              </button>
            );
          })}
          {Array.from({ length: PAD }).map((_, i) => (
            <div key={`pad-b-${i}`} className="h-11 snap-center" aria-hidden />
          ))}
        </div>
      </div>
    </div>
  );
}
