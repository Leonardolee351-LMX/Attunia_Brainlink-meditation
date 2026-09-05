import { useEffect, useRef } from "react";
import type { TrainingVisualProps } from "./types";
import { bioNorm, clamp01, useReducedMotion } from "./types";
import {
  OVERLOAD_CLAY,
  OVERLOAD_CREAM,
  OVERLOAD_INK,
  OVERLOAD_SAGE,
} from "@/lib/training-visual-registry";

/** 左侧奶油门洞 + 门内几何色块（不生风景） */
export default function SafePortal({
  phaseIndex,
  phaseElapsedSec,
  liveRef,
}: TrainingVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(phaseIndex);
  const elapsedRef = useRef(phaseElapsedSec);
  phaseRef.current = phaseIndex;
  elapsedRef.current = phaseElapsedSec;
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
      const phaseIndex = phaseRef.current;
      const phaseElapsedSec = elapsedRef.current;
      t += reduce ? 0.006 : 0.012;

      let approach = 0.25;
      if (phaseIndex === 0) {
        const breaths = phaseElapsedSec >= 120 ? 3 : phaseElapsedSec >= 70 ? 2 : phaseElapsedSec >= 20 ? 1 : 0;
        approach = 0.2 + breaths * 0.18;
      } else if (phaseIndex === 1) {
        approach = 0.72 + clamp01(phaseElapsedSec / 400) * 0.15;
      } else {
        approach = 0.78;
      }
      approach = clamp01(approach + bio.calm * 0.18 - bio.arousal * 0.22);

      const clarity = clamp01(
        (phaseIndex === 0 ? 0.15 : phaseIndex === 1 ? 0.35 + phaseElapsedSec / 420 : 0.55) +
          bio.focus * 0.35,
      );
      const pushTags = phaseIndex === 1 && phaseElapsedSec >= 360;
      const anchor = phaseIndex >= 2;
      const roomReturn = phaseIndex >= 2;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = roomReturn ? "rgba(40,34,38,1)" : OVERLOAD_INK;
      ctx.fillRect(0, 0, w, h);

      const tagN = pushTags ? 2 : Math.round(3 + bio.arousal * 10);
      for (let i = 0; i < tagN; i++) {
        const x =
          w * 0.55 + ((i * 40) % (w * 0.4)) + (pushTags ? (phaseElapsedSec - 360) * 1.2 + i * 8 : 0);
        const y = 40 + (i % 6) * 28;
        ctx.globalAlpha = pushTags ? 0.08 : 0.12 + bio.arousal * 0.15;
        ctx.fillStyle = OVERLOAD_CLAY;
        ctx.fillRect(x, y, 22, 8);
      }
      ctx.globalAlpha = 1;

      const doorW = w * (0.28 + approach * 0.08);
      const doorH = h * (0.42 + approach * 0.12);
      const doorX = w * (0.08 + (1 - approach) * 0.06);
      const doorY = h * 0.28 - approach * 12;
      const blurFar = (1 - approach) * 2.5;

      ctx.save();
      if (blurFar > 0.2 && !reduce) ctx.filter = `blur(${blurFar}px)`;
      ctx.fillStyle = OVERLOAD_CREAM;
      ctx.globalAlpha = 0.55 + approach * 0.35;
      ctx.beginPath();
      ctx.moveTo(doorX, doorY + doorH);
      ctx.lineTo(doorX, doorY + doorH * 0.18);
      ctx.quadraticCurveTo(doorX + doorW / 2, doorY - doorH * 0.08, doorX + doorW, doorY + doorH * 0.18);
      ctx.lineTo(doorX + doorW, doorY + doorH);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(doorX + 8, doorY + doorH);
      ctx.lineTo(doorX + 8, doorY + doorH * 0.22);
      ctx.quadraticCurveTo(doorX + doorW / 2, doorY + 4, doorX + doorW - 8, doorY + doorH * 0.22);
      ctx.lineTo(doorX + doorW - 8, doorY + doorH);
      ctx.closePath();
      ctx.clip();

      const blocks = [
        { c: OVERLOAD_SAGE, x: 0.1, y: 0.15, w: 0.45, h: 0.35 },
        { c: "#C9B8A0", x: 0.4, y: 0.4, w: 0.4, h: 0.3 },
        { c: "#7A9E8E", x: 0.15, y: 0.55, w: 0.35, h: 0.28 },
        { c: "#E8C9A8", x: 0.5, y: 0.2, w: 0.3, h: 0.25 },
      ];
      const showN = Math.max(1, Math.round(1 + clarity * blocks.length));
      for (let i = 0; i < showN; i++) {
        const b = blocks[i]!;
        ctx.globalAlpha = 0.25 + clarity * 0.55;
        ctx.fillStyle = b.c;
        ctx.fillRect(doorX + doorW * b.x, doorY + doorH * b.y, doorW * b.w, doorH * b.h);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.filter = "none";

      if (anchor) {
        const ax = w * 0.72;
        const ay = h * 0.72;
        ctx.beginPath();
        ctx.arc(ax, ay, 7 + Math.sin(t) * (reduce ? 0 : 1.2), 0, Math.PI * 2);
        ctx.fillStyle = "rgba(245,237,224,0.75)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ax, ay, 16, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(168,191,176,0.35)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
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
