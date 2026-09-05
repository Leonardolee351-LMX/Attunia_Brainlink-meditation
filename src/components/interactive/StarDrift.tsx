import { useEffect, useRef } from "react";

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

/**
 * 星尘漂流 —— Endel 式的极简注视训练。
 * 零操作要求;手指靠近时星尘被轻轻牵引(引力,不是控制)。
 */
export default function StarDrift() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const motes: Mote[] = Array.from({ length: 130 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00012,
      vy: 0.00012 + Math.random() * 0.0003,
      size: 0.6 + Math.random() * 2.2,
      alpha: 0.25 + Math.random() * 0.6,
    }));

    let raf = 0;
    const draw = (t: number) => {
      const w = (canvas.width = canvas.clientWidth * devicePixelRatio);
      const h = (canvas.height = canvas.clientHeight * devicePixelRatio);

      // 暮色渐变
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#2b3a40");
      bg.addColorStop(1, "#101d1b");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // 中央微光
      const glow = ctx.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, h * 0.5);
      glow.addColorStop(0, "rgba(200, 220, 205, 0.07)");
      glow.addColorStop(1, "rgba(200, 220, 205, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      const p = pointerRef.current;
      for (const m of motes) {
        // 指尖引力
        if (p) {
          const dx = p.x - m.x;
          const dy = p.y - m.y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < 0.03) {
            m.vx += dx * 0.0000025;
            m.vy += dy * 0.0000025;
          }
        }
        m.x += m.vx + Math.sin(t * 0.0002 + m.y * 20) * 0.00006;
        m.y += m.vy;
        // 速度衰减回漂移态
        m.vx *= 0.995;
        m.vy = m.vy * 0.995 + 0.0000002;
        if (m.y > 1.02) {
          m.y = -0.02;
          m.x = Math.random();
        }
        if (m.x > 1.02) m.x = -0.02;
        if (m.x < -0.02) m.x = 1.02;

        const twinkle = 0.7 + Math.sin(t * 0.001 + m.x * 50) * 0.3;
        ctx.beginPath();
        ctx.arc(m.x * w, m.y * h, m.size * devicePixelRatio, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226, 234, 222, ${m.alpha * twinkle})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none"
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          pointerRef.current = {
            x: (e.clientX - rect.left) / rect.width,
            y: (e.clientY - rect.top) / rect.height,
          };
        }}
        onPointerLeave={() => (pointerRef.current = null)}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-8 text-center">
        <div className="font-display text-lg text-white/70">只看着,就很好</div>
        <div className="mt-1 text-xs text-white/35">手指靠近时,星尘会被轻轻牵引</div>
      </div>
    </div>
  );
}
