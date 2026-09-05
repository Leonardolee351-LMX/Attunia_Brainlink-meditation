import { useEffect, useRef } from "react";

/** 训练中的实时生物状态(可变引用,避免每秒触发 React 重渲染) */
export interface LiveBio {
  arousal: number;
  focus: number;
  calm: number;
}

/**
 * BioOrb —— Endel 式的状态驱动慢视觉:
 *  - 中央呼吸球:半径随 8 秒呼吸节律起伏,颜色随 arousal 从暖(clay)过渡到冷(pine)
 *  - 轨道微粒:速度与密度随 focus 变化
 *  - 底部层叠沙丘:三层正弦波缓慢漂移,透明度随 calm 上升
 */
export default function BioOrb({
  liveRef,
  cover,
}: {
  liveRef: React.RefObject<LiveBio>;
  cover: { from: string; to: string };
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const particles = Array.from({ length: 46 }, () => ({
      a: Math.random() * Math.PI * 2,
      r: 0.35 + Math.random() * 0.55,
      s: 0.001 + Math.random() * 0.003,
      size: 1 + Math.random() * 2.2,
    }));

    const draw = (t: number) => {
      const w = (canvas.width = canvas.clientWidth * devicePixelRatio);
      const h = (canvas.height = canvas.clientHeight * devicePixelRatio);
      const bio = liveRef.current ?? { arousal: 60, focus: 55, calm: 50 };
      const cx = w / 2;
      const cy = h * 0.44;
      const base = Math.min(w, h) * 0.16;

      // 背景:模块封面渐变
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, cover.from);
      bg.addColorStop(1, cover.to);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // 层叠沙丘(Endel 式):三层缓慢正弦
      for (let layer = 0; layer < 3; layer++) {
        const yBase = h * (0.72 + layer * 0.09);
        const amp = h * 0.03 * (1 + layer * 0.5);
        const speed = t * (0.00004 + layer * 0.00002);
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 8) {
          ctx.lineTo(x, yBase + Math.sin(x * 0.004 + speed + layer * 2) * amp);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = `rgba(17, 17, 17, ${0.05 + layer * 0.04 + bio.calm / 2500})`;
        ctx.fill();
      }

      // 呼吸节律:8s 周期(4s 吸 / 4s 呼)
      const breath = (t % 8000) / 8000;
      const breathWave = breath < 0.5 ? breath * 2 : (1 - breath) * 2; // 0→1→0
      const radius = base * (0.82 + breathWave * 0.28 * (0.6 + bio.calm / 250));

      // arousal → 色相:高=暖珊瑚,低=薄荷绿
      const hue = 16 + ((100 - bio.arousal) / 100) * 132;
      const lightness = 38 + (bio.calm / 100) * 10;

      // 光晕
      const glow = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius * 2.6);
      glow.addColorStop(0, `hsla(${hue}, 32%, ${lightness}%, 0.32)`);
      glow.addColorStop(1, "hsla(150, 40%, 70%, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(cx - radius * 3, cy - radius * 3, radius * 6, radius * 6);

      // 球体
      const orb = ctx.createRadialGradient(
        cx - radius * 0.25,
        cy - radius * 0.25,
        radius * 0.1,
        cx,
        cy,
        radius,
      );
      orb.addColorStop(0, `hsla(${hue}, 38%, ${lightness + 22}%, 0.95)`);
      orb.addColorStop(1, `hsla(${hue}, 42%, ${lightness}%, 0.92)`);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = orb;
      ctx.fill();

      // 轨道微粒:focus 越高,越快越亮
      const speedK = 0.4 + bio.focus / 60;
      for (const p of particles) {
        p.a += p.s * speedK;
        const pr = radius * (1.35 + p.r);
        const px = cx + Math.cos(p.a) * pr;
        const py = cy + Math.sin(p.a) * pr * 0.62;
        ctx.beginPath();
        ctx.arc(px, py, p.size * devicePixelRatio, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 35%, ${lightness + 18}%, ${0.25 + (bio.focus / 100) * 0.5})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [liveRef, cover]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
