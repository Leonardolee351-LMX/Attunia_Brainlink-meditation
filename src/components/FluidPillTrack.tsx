import { useEffect, useRef, useState, type ReactNode } from "react";
import { edgesSettled, stepFluidEdges, type FluidEdges } from "@/lib/fluid-pill";

type Props = {
  /** 当前选中项 index */
  activeIndex: number;
  /** 子项数量（与 children 一致） */
  count: number;
  className?: string;
  pillClassName?: string;
  children: ReactNode;
};

/**
 * 水平轨道 + 流体指示条：选中切换时前沿快、后沿慢。
 */
export default function FluidPillTrack({
  activeIndex,
  count,
  className = "",
  pillClassName = "bg-ink/8",
  children,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<FluidEdges>({ left: 0, right: 0 });
  const targetRef = useRef({ left: 0, right: 0 });
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  const measure = () => {
    const track = trackRef.current;
    if (!track) return;
    const item = track.querySelector<HTMLElement>(`[data-fluid-i="${activeIndex}"]`);
    if (!item) return;
    const tr = track.getBoundingClientRect();
    const ir = item.getBoundingClientRect();
    targetRef.current = {
      left: ir.left - tr.left,
      right: ir.right - tr.left,
    };
  };

  useEffect(() => {
    // 首帧对齐，避免指示条从 0 弹出
    measure();
    const t = targetRef.current;
    if (t.right > t.left) {
      const init = { left: t.left, right: t.right };
      edgesRef.current = init;
      setEdges(init);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, count]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      measure();
      const t = targetRef.current;
      const next = stepFluidEdges(edgesRef.current, t.left, t.right);
      edgesRef.current = next;
      setEdges(next);
      if (!edgesSettled(next, t.left, t.right)) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  const width = Math.max(0, edges.right - edges.left);

  return (
    <div ref={trackRef} className={`relative ${className}`}>
      <div
        aria-hidden
        className={`pointer-events-none absolute top-0 bottom-0 rounded-[18px] ${pillClassName}`}
        style={{
          left: edges.left,
          width,
          transform: "translateZ(0)",
        }}
      />
      {children}
    </div>
  );
}
