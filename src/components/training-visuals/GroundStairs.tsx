import { useEffect, useRef } from "react";
import type { TrainingVisualProps } from "./types";
import { bioNorm, clamp01, useReducedMotion } from "./types";
import { OVERLOAD_CLAY, OVERLOAD_INK, OVERLOAD_SAGE } from "@/lib/training-visual-registry";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rw: number,
  rh: number,
  r: number,
) {
  const rr = Math.min(r, rw / 2, rh / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + rw, y, x + rw, y + rh, rr);
  ctx.arcTo(x + rw, y + rh, x, y + rh, rr);
  ctx.arcTo(x, y + rh, x, y, rr);
  ctx.arcTo(x, y, x + rw, y, rr);
  ctx.closePath();
}

/** 五级楼梯 + 标签残片（协议钟按阶段；脑电只改品质） */
export default function GroundStairs({
  phaseIndex,
  phaseElapsedSec,
  running,
  liveRef,
}: TrainingVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(phaseIndex);
  const elapsedRef = useRef(phaseElapsedSec);
  const runRef = useRef(running);
  phaseRef.current = phaseIndex;
  elapsedRef.current = phaseElapsedSec;
  runRef.current = running;
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let t = 0;

    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    window.addEventListener("resize", fit);

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const bio = bioNorm(liveRef.current);
      const pi = phaseRef.current;
      const pe = elapsedRef.current;
      const runningNow = runRef.current;
      t += reduce ? 0.008 : 0.016;

      let activeLevel = 5 - Math.min(4, pi);
      if (pi >= 3 && pe >= 80) activeLevel = 1;

      let litDots = 0;
      if (pi === 0) litDots = Math.min(5, 1 + Math.floor(pe / 12));
      else if (pi === 1) litDots = Math.min(4, 1 + Math.floor(pe / 14));
      else if (pi === 2) litDots = Math.min(3, 1 + Math.floor(pe / 18));
      else litDots = pe >= 50 ? 2 : 1;

      const longExhale = pi >= 3 && pe >= 80;
      const sink = longExhale ? clamp01((pe - 80) / 20) * 18 : 0;
      const tagCount = Math.round(4 + bio.arousal * 14 * (longExhale ? 1 - sink / 18 : 1));
      const sageFloor = 0.12 + bio.calm * 0.45;
      const edgeClarity = 0.35 + bio.focus * 0.65;

      ctx.clearRect(0, 0, w, h);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, OVERLOAD_INK);
      bg.addColorStop(1, `rgba(168,191,176,${sageFloor})`);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < tagCount; i++) {
        const seed = i * 17.13;
        const x = ((Math.sin(seed) * 0.5 + 0.5) * w * 0.9 + w * 0.05 + Math.sin(t * 0.2 + i) * 4) % w;
        const y = ((Math.cos(seed * 1.3) * 0.5 + 0.5) * h * 0.55 + 20) % (h * 0.7);
        ctx.globalAlpha = 0.12 + bio.arousal * 0.22 * (1 - sink / 22);
        ctx.fillStyle = OVERLOAD_CLAY;
        roundRect(ctx, x, y, 18 + (i % 5) * 6, 8 + (i % 3) * 2, 3);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const cy = h * 0.52 + sink;
      for (let L = 5; L >= 1; L--) {
        const i = 5 - L;
        const width = w * (0.72 - i * 0.1);
        const height = 22 + (L === activeLevel ? 6 : 0);
        const y = cy - i * 28;
        const x = (w - width) / 2;
        const isActive = L === activeLevel;
        const thick = pi === 1 && isActive ? 1.35 : 1;
        const soft = pi === 2 && isActive;
        const footSink = pi === 1 && isActive && pe >= 40 ? 4 : 0;

        ctx.save();
        ctx.globalAlpha = isActive ? 0.55 + edgeClarity * 0.4 : 0.18;
        ctx.fillStyle = isActive ? OVERLOAD_SAGE : "rgba(255,255,255,0.12)";
        ctx.strokeStyle = isActive
          ? `rgba(245,237,224,${0.35 + edgeClarity * 0.5})`
          : "rgba(255,255,255,0.08)";
        ctx.lineWidth = (isActive ? 2.2 : 1) * thick;
        roundRect(ctx, x, y + footSink, width, height * thick, soft ? 14 : 6);
        ctx.fill();
        ctx.stroke();

        if (isActive && litDots > 0) {
          for (let d = 0; d < litDots; d++) {
            const px = x + width * ((d + 1) / (litDots + 1));
            const py = y + height * 0.45 + footSink;
            ctx.beginPath();
            ctx.arc(
              px,
              py,
              3.2 + (runningNow && !reduce ? Math.sin(t * 2 + d) * 0.4 : 0),
              0,
              Math.PI * 2,
            );
            ctx.fillStyle = OVERLOAD_CLAY;
            ctx.globalAlpha = 0.85;
            ctx.fill();
          }
        }
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, [liveRef, reduce]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />;
}
