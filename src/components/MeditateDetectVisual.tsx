/**
 * 校准第三段：冥想态中央构成。
 * 黑白基调 — 慢呼吸椭圆 + 扩散环 + 微粒沉降，无彩色。
 * calm 经指数平滑，避免采样抖动传到半径与透明度。
 */
import { useEffect, useRef } from "react";

export function MeditateDetectVisual({ calm }: { calm: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const calmRef = useRef(calm);
  calmRef.current = calm;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const motes = Array.from({ length: 22 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + (i % 5) * 0.35,
      drift: 0.00012 + (i % 7) * 0.00004,
      phase: Math.random() * Math.PI * 2,
    }));

    let raf = 0;
    let last = performance.now();
    let smoothC = Math.max(0, Math.min(100, calmRef.current)) / 100;
    const TAU = 0.38;

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const target = Math.max(0, Math.min(100, calmRef.current)) / 100;
      smoothC += (target - smoothC) * (1 - Math.exp(-dt / TAU));
      const c = smoothC;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cssW = canvas.clientWidth || 280;
      const cssH = canvas.clientHeight || 232;
      if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      ctx.clearRect(0, 0, cssW, cssH);

      const cx = cssW / 2;
      const cy = cssH * 0.48;
      const period = 2800 - c * 700;
      const breath = 0.5 + 0.5 * Math.sin(now / period);
      const rx = 48 + c * 28 + breath * 10;
      const ry = 22 + c * 12 + breath * 6;

      const field = ctx.createRadialGradient(cx, cy, 4, cx, cy, Math.max(cssW, cssH) * 0.55);
      field.addColorStop(0, `rgba(255,255,255,${0.1 + c * 0.22})`);
      field.addColorStop(0.45, `rgba(255,255,255,${0.03 + c * 0.06})`);
      field.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = field;
      ctx.fillRect(0, 0, cssW, cssH);

      for (let i = 0; i < 4; i++) {
        const k = (now / 3600 + i * 0.25) % 1;
        const ox = rx * (1.05 + k * 1.55);
        const oy = ry * (1.05 + k * 1.55);
        ctx.beginPath();
        ctx.ellipse(cx, cy, ox, oy, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * (0.12 + c * 0.28)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(cx, cy);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(0, 0, rx * (0.55 + i * 0.28), ry * (0.55 + i * 0.28), 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${0.06 + c * 0.08 - i * 0.015})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();

      for (const m of motes) {
        m.y += m.drift * (0.4 + (1 - c) * 0.8) * (dt * 60);
        if (m.y > 1.08) m.y = -0.05;
        const px = m.x * cssW + Math.sin(now * 0.0004 + m.phase) * 6;
        const py = m.y * cssH;
        ctx.beginPath();
        ctx.arc(px, py, m.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.08 + c * 0.22})`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      const core = ctx.createRadialGradient(cx, cy - ry * 0.35, 2, cx, cy, rx);
      core.addColorStop(0, `rgba(255,255,255,${0.55 + c * 0.35})`);
      core.addColorStop(0.55, `rgba(220,220,220,${0.22 + c * 0.2})`);
      core.addColorStop(1, `rgba(255,255,255,${0.04 + breath * 0.06})`);
      ctx.fillStyle = core;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx - rx * 1.6, cy);
      ctx.lineTo(cx + rx * 1.6, cy);
      ctx.strokeStyle = `rgba(255,255,255,${0.06 + c * 0.1})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} className="h-[min(232px,32vh)] w-full" aria-hidden />;
}
