import { useEffect, useRef, useState } from "react";

/**
 * 呼吸之花 —— Vibes 式的"有意为之"按压交互:
 * 按住 = 吸气,花瓣绽开;松开 = 呼气,花瓣合拢。
 * rAF 插值让开合永远丝滑,不做生硬跳变。
 */
export default function BreathBloom() {
  const [pressing, setPressing] = useState(false);
  const [cycles, setCycles] = useState(0);
  const scaleRef = useRef(0.8);
  const targetRef = useRef(0.8);
  const flowerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      targetRef.current = pressing ? 1.45 : 0.8;
      scaleRef.current += (targetRef.current - scaleRef.current) * 0.045;
      if (flowerRef.current) {
        flowerRef.current.style.transform = `scale(${scaleRef.current.toFixed(3)})`;
      }
      if (glowRef.current) {
        const s = scaleRef.current;
        glowRef.current.style.opacity = `${((s - 0.8) / 0.65) * 0.5 + 0.1}`;
        glowRef.current.style.transform = `scale(${(s * 1.6).toFixed(3)})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pressing]);

  const release = () => {
    if (pressing) setCycles((c) => c + 1);
    setPressing(false);
  };

  return (
    <div
      className="absolute inset-0 flex touch-none flex-col items-center justify-center select-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setPressing(true);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
    >
      {/* 光晕 */}
      <div
        ref={glowRef}
        className="absolute h-56 w-56 rounded-full bg-mint/50 blur-2xl transition-none"
      />
      {/* 花:12 瓣 */}
      <div ref={flowerRef} className="relative h-40 w-40 will-change-transform">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 h-20 w-7 origin-bottom rounded-full"
            style={{
              background: `linear-gradient(to top, #111111, ${i % 2 ? "#7EE0A8" : "#B8F2C9"})`,
              transform: `translate(-50%, -100%) rotate(${i * 30}deg)`,
              opacity: 0.85,
            }}
          />
        ))}
        <div className="absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cream shadow-inner" />
      </div>

      <div className="pointer-events-none mt-10 text-center">
        <div className="font-display text-xl text-ink/75">
          {pressing ? "吸气——让花打开" : "松开,呼气——让花合拢"}
        </div>
        <div className="mt-1 text-xs text-ink/40">
          {cycles === 0 ? "按住屏幕中央,开始第一个呼吸" : `已完成 ${cycles} 个呼吸循环`}
        </div>
      </div>
    </div>
  );
}
