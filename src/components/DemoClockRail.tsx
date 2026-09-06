/**
 * 工作室画板右侧：上班→下班时间轴。
 * 整轨可拖；靠近节点时磁力吸附 + 轻微回弹动效。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEMO_CLOCK_HOUR_MAX,
  DEMO_CLOCK_HOUR_MIN,
  DEMO_CLOCK_MARKS,
  clampDemoWorkHour,
  demoHourToTrackRatio,
  formatDemoClock,
  getDemoHour,
  isDemoHourOverridden,
  setDemoHour,
  subscribeDemoHour,
} from "@/lib/demo-clock";
import { recommendWorkScene, WORK_SCENES } from "@/lib/scenes";

/** 连续小时 → 吸附到最近工时节点（阈值内） */
function snapHour(raw: number, force = false): number {
  const h = clampDemoWorkHour(raw);
  let best = DEMO_CLOCK_MARKS[0]!.hour;
  let bestDist = Infinity;
  for (const m of DEMO_CLOCK_MARKS) {
    const d = Math.abs(m.hour - h);
    if (d < bestDist) {
      bestDist = d;
      best = m.hour;
    }
  }
  // 拖动中：距节点 ≤0.45h 才吸；松手时强制吸到最近节点
  if (force || bestDist <= 0.45) return best;
  return h;
}

export default function DemoClockRail({ visible }: { visible: boolean }) {
  const [hour, setHour] = useState(() => getDemoHour());
  const [overridden, setOverridden] = useState(() => isDemoHourOverridden());
  /** 拖动时用浮点小时画游标，松手再吸附 */
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const [snapping, setSnapping] = useState(false);
  const [magnetHour, setMagnetHour] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastRaw = useRef(getDemoHour());
  const startY = useRef(0);
  const moved = useRef(false);

  useEffect(() => {
    return subscribeDemoHour((h, on) => {
      setHour(h);
      setOverridden(on);
      if (!dragging.current) setDragRatio(null);
    });
  }, []);

  const ratioFromClientY = useCallback((clientY: number) => {
    const el = trackRef.current;
    if (!el) return demoHourToTrackRatio(getDemoHour());
    const rect = el.getBoundingClientRect();
    const pad = 8;
    const usable = Math.max(1, rect.height - pad * 2);
    return Math.max(0, Math.min(1, (clientY - rect.top - pad) / usable));
  }, []);

  const applyDrag = (clientY: number) => {
    const t = ratioFromClientY(clientY);
    const continuous = DEMO_CLOCK_HOUR_MIN + t * (DEMO_CLOCK_HOUR_MAX - DEMO_CLOCK_HOUR_MIN);
    lastRaw.current = continuous;
    setDragRatio(t);

    const soft = snapHour(continuous, false);
    const nearMark = DEMO_CLOCK_MARKS.some((m) => Math.abs(m.hour - continuous) <= 0.45);
    setMagnetHour(nearMark ? soft : null);
    // 跟手推送小数小时 → 首页 recommendWorkScene 即时重算
    setDemoHour(nearMark ? soft : continuous);
  };

  const finishToHour = (h: number) => {
    const snapped = snapHour(h, true);
    setSnapping(true);
    setMagnetHour(snapped);
    setDemoHour(snapped);
    setDragRatio(demoHourToTrackRatio(snapped));
    window.setTimeout(() => {
      setSnapping(false);
      setDragRatio(null);
      setMagnetHour(null);
    }, 280);
  };

  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    // 几乎没移动 = 点选：吸到最近节点
    if (!moved.current) {
      finishToHour(snapHour(lastRaw.current, true));
      return;
    }
    finishToHour(snapHour(lastRaw.current, true));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragging.current = true;
    moved.current = false;
    startY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
    setSnapping(false);
    applyDrag(e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    if (Math.abs(e.clientY - startY.current) > 4) moved.current = true;
    applyDrag(e.clientY);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    endDrag();
  };

  if (!visible) return null;

  const railHour = clampDemoWorkHour(hour);
  const sceneId = recommendWorkScene(railHour, null);
  const scene = WORK_SCENES.find((s) => s.id === sceneId);
  const displayRatio =
    dragRatio ?? demoHourToTrackRatio(overridden ? railHour : clampDemoWorkHour(hour));
  const thumbTop = `${displayRatio * 100}%`;
  const outsideWork =
    !overridden && (hour < DEMO_CLOCK_HOUR_MIN || hour > DEMO_CLOCK_HOUR_MAX);

  return (
    <aside
      className="pointer-events-auto fixed top-[52px] right-6 z-[70] hidden h-[min(720px,calc(100dvh-5.5rem))] w-[100px] flex-col sm:flex"
      aria-label="演示时间轴 · 上班到下班"
    >
      <div className="flex min-h-0 flex-1 flex-col rounded-[22px] bg-white px-2.5 py-3 shadow-[0_12px_32px_-14px_rgba(17,17,17,0.28)] ring-1 ring-ink/5">
        <p className="text-center text-[10px] font-semibold tracking-wide text-ink/40 uppercase">
          工时轴
        </p>
        <p className="font-display mt-1 text-center text-[1.15rem] font-extrabold text-ink tabular-nums">
          {formatDemoClock(overridden || dragRatio !== null ? railHour : hour)}
        </p>
        <p className="mt-0.5 line-clamp-2 min-h-[2.2em] text-center text-[10px] leading-snug text-ink/45">
          {outsideWork && dragRatio === null
            ? "轴外时段 · 拖入工时"
            : magnetHour !== null
              ? `吸附 · ${DEMO_CLOCK_MARKS.find((m) => m.hour === magnetHour)?.label ?? ""}`
              : scene
                ? `推荐 · ${scene.occasion}`
                : "拖动选择时刻"}
        </p>

        {/* 可拖整轨：节点不拦截指针 */}
        <div
          ref={trackRef}
          className="relative mt-3 min-h-0 flex-1 cursor-ns-resize touch-none select-none px-1"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          role="slider"
          aria-valuemin={DEMO_CLOCK_HOUR_MIN}
          aria-valuemax={DEMO_CLOCK_HOUR_MAX}
          aria-valuenow={Math.round(railHour)}
          aria-label="拖动选择工时"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowRight") {
              e.preventDefault();
              const i = DEMO_CLOCK_MARKS.findIndex((m) => m.hour >= railHour - 0.01);
              const at = DEMO_CLOCK_MARKS[i];
              const next =
                at && Math.abs(at.hour - railHour) < 0.05
                  ? DEMO_CLOCK_MARKS[Math.min(DEMO_CLOCK_MARKS.length - 1, i + 1)]
                  : at;
              if (next) {
                setSnapping(true);
                setDemoHour(next.hour);
                window.setTimeout(() => setSnapping(false), 280);
              }
            }
            if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
              e.preventDefault();
              const marks = [...DEMO_CLOCK_MARKS].reverse();
              const i = marks.findIndex((m) => m.hour <= railHour + 0.01);
              const at = marks[i];
              const next =
                at && Math.abs(at.hour - railHour) < 0.05
                  ? marks[Math.min(marks.length - 1, i + 1)]
                  : at;
              if (next) {
                setSnapping(true);
                setDemoHour(next.hour);
                window.setTimeout(() => setSnapping(false), 280);
              }
            }
          }}
        >
          <div className="pointer-events-none absolute top-2 bottom-2 left-1/2 w-1.5 -translate-x-1/2 rounded-full bg-ink/10" />

          {DEMO_CLOCK_MARKS.map((m) => {
            const top = `${demoHourToTrackRatio(m.hour) * 100}%`;
            const on = Math.abs(railHour - m.hour) < 0.08;
            const magnet = magnetHour === m.hour;
            return (
              <div
                key={m.hour}
                className="pointer-events-none absolute left-1/2 z-[1] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                style={{ top }}
              >
                <span
                  className={`rounded-full ring-2 ring-white transition-all duration-200 ${
                    magnet
                      ? "h-3.5 w-3.5 scale-125 bg-ink shadow-[0_0_0_6px_rgba(17,17,17,0.12)]"
                      : on
                        ? "h-3 w-3 bg-ink"
                        : "h-2 w-2 bg-ink/30"
                  }`}
                />
                <span
                  className={`mt-0.5 max-w-[4.8rem] text-center text-[9px] leading-tight font-semibold transition-colors ${
                    on || magnet ? "text-ink" : "text-ink/35"
                  }`}
                >
                  {m.label}
                </span>
              </div>
            );
          })}

          {/* 游标：可点可拖（父级已捕获指针） */}
          <div
            className={`pointer-events-none absolute left-1/2 z-[3] -translate-x-1/2 -translate-y-1/2 ${
              snapping ? "transition-all duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)]" : dragging.current ? "" : "transition-[top] duration-150 ease-out"
            } ${outsideWork && dragRatio === null ? "opacity-40" : ""}`}
            style={{ top: thumbTop }}
          >
            <div
              className={`h-5 w-5 rounded-full bg-ink shadow-[0_6px_16px_-4px_rgba(17,17,17,0.55)] ring-[3px] ring-white ${
                magnetHour !== null ? "scale-110" : ""
              } ${snapping ? "scale-125" : ""} transition-transform duration-200`}
            />
          </div>
        </div>

        <p className="mt-1 text-center text-[9px] text-ink/30">
          {DEMO_CLOCK_HOUR_MIN}:00–{DEMO_CLOCK_HOUR_MAX}:00 · 拖动吸附
        </p>

        <button
          type="button"
          onClick={() => setDemoHour(null)}
          disabled={!overridden}
          className="mt-1.5 rounded-full bg-ink/5 px-2 py-1.5 text-[10px] font-semibold text-ink/55 transition enabled:hover:bg-mint enabled:active:scale-[0.98] disabled:opacity-35"
          title="恢复真实本地时间"
        >
          {overridden ? "恢复此刻" : "跟随时钟"}
        </button>
      </div>
    </aside>
  );
}
