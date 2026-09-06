import { useEffect, useRef } from "react";

/**
 * 校准第二 / 三段的中央画面：
 * Focus 盯小球、Meditation 松弛下沉。检测用光晕与微粒表达，不在球下挂进度条或数字。
 * 脑电数值经指数平滑，避免 10Hz 采样导致球径一帧一跳。
 */
export function FocusDetectVisual({ focus }: { focus: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const focusRef = useRef(focus);
  focusRef.current = focus;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dots = Array.from({ length: 18 }, (_, i) => ({
      a: (i / 18) * Math.PI * 2,
      r: 0.72 + (i % 5) * 0.08,
      s: 0.004 + (i % 7) * 0.0012,
      size: 1.1 + (i % 4) * 0.45,
    }));

    let raf = 0;
    let last = performance.now();
    let smoothF = Math.max(0, Math.min(100, focusRef.current)) / 100;
    const TAU = 0.32; // 秒，越大越柔

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const target = Math.max(0, Math.min(100, focusRef.current)) / 100;
      smoothF += (target - smoothF) * (1 - Math.exp(-dt / TAU));
      const f = smoothF;

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
      const cy = cssH / 2;
      const ball = 11 + f * 10;
      const breath = 0.5 + 0.5 * Math.sin(now / 1400);

      const glow = ctx.createRadialGradient(cx, cy, ball * 0.2, cx, cy, 118 + f * 40);
      glow.addColorStop(0, `rgba(201, 162, 39, ${0.28 + f * 0.35})`);
      glow.addColorStop(0.45, `rgba(245, 229, 107, ${0.12 + f * 0.18})`);
      glow.addColorStop(1, "rgba(245, 229, 107, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, cssW, cssH);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(now * 0.00018);
      for (let i = 0; i < 2; i++) {
        const rr = 36 + i * 18 + breath * 4 + f * 10;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(17, 17, 17, ${0.08 + f * 0.16 - i * 0.03})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 7]);
        ctx.arc(0, 0, rr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();

      const speed = 0.35 + f * 1.4;
      for (const d of dots) {
        d.a += d.s * speed * (dt * 60);
        const pr = (42 + f * 16) * d.r;
        const px = cx + Math.cos(d.a) * pr;
        const py = cy + Math.sin(d.a) * pr * 0.72;
        ctx.beginPath();
        ctx.arc(px, py, d.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(17, 17, 17, ${0.12 + f * 0.45})`;
        ctx.fill();
      }

      const orb = ctx.createRadialGradient(cx - ball * 0.28, cy - ball * 0.32, ball * 0.1, cx, cy, ball);
      orb.addColorStop(0, "#2a2a2a");
      orb.addColorStop(1, "#111111");
      ctx.beginPath();
      ctx.arc(cx, cy, ball, 0, Math.PI * 2);
      ctx.fillStyle = orb;
      ctx.shadowColor = `rgba(201, 162, 39, ${0.25 + f * 0.55})`;
      ctx.shadowBlur = 18 + f * 22;
      ctx.fill();
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} className="h-[min(232px,32vh)] w-full" aria-hidden />;
}

export { MeditateDetectVisual } from "./MeditateDetectVisual";
