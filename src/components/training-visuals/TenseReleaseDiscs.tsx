import { useEffect, useRef } from "react";
import type { TrainingVisualProps } from "./types";
import { bioNorm, clamp01, useReducedMotion } from "./types";
import { OVERLOAD_CLAY, OVERLOAD_INK, OVERLOAD_SAGE, OVERLOAD_SAND } from "@/lib/training-visual-registry";

const CYCLE = 13; // 紧 5 + 松 8
const TENSE = 5;

/**
 * 黏土小圆（紧）vs 沙色大圆（松）。协议钟 13s/组；阶段 0 待命，1 循环，2 沉静。
 */
export default function TenseReleaseDiscs({
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
      const phaseIndex = phaseRef.current;
      const phaseElapsedSec = elapsedRef.current;
      const running = runRef.current;
      t += reduce ? 0.006 : 0.014;

      const settle = phaseIndex >= 2;
      const prep = phaseIndex === 0;
      const inCycle = phaseIndex === 1 && running;
      const cycleT = inCycle ? phaseElapsedSec % CYCLE : 0;
      const tensePhase = inCycle && cycleT < TENSE;
      const releasePhase = inCycle && cycleT >= TENSE;
      const tenseP = tensePhase ? clamp01(cycleT / TENSE) : prep ? 0.15 + Math.sin(t) * 0.04 : 0;
      const releaseP = releasePhase ? clamp01((cycleT - TENSE) / (CYCLE - TENSE)) : settle ? 0.55 : 0;

      const dead = 0.45 + bio.arousal * 0.55;
      const fill = 0.4 + bio.calm * 0.55;
      const focusGlow = 0.3 + bio.focus * 0.7;

      ctx.clearRect(0, 0, w, h);
      const bg = ctx.createRadialGradient(w * 0.5, h * 0.48, 20, w * 0.5, h * 0.5, w * 0.7);
      bg.addColorStop(0, settle ? `rgba(168,191,176,0.25)` : "rgba(20,18,16,1)");
      bg.addColorStop(1, OVERLOAD_INK);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.48;

      if (releaseP > 0.02 || settle) {
        const R = Math.min(w, h) * 0.12 * (1 + releaseP * 1.8 * fill);
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fillStyle = OVERLOAD_SAND;
        ctx.globalAlpha = (0.35 + releaseP * 0.5) * (settle ? 0.55 : 1);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      if (!settle && (prep || tensePhase || (releasePhase && releaseP < 0.35))) {
        const r0 = Math.min(w, h) * 0.07;
        const r = r0 * (1 - tenseP * 0.55 * dead);
        const jitter = prep && !reduce ? Math.sin(t * 6) * 1.2 : 0;
        ctx.beginPath();
        ctx.arc(cx + jitter, cy, Math.max(4, r), 0, Math.PI * 2);
        ctx.fillStyle = OVERLOAD_CLAY;
        ctx.globalAlpha = 0.55 + tenseP * 0.4 * dead;
        ctx.fill();
        if (tensePhase) {
          ctx.strokeStyle = `rgba(255,107,74,${0.3 + focusGlow * 0.4})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      if (settle) {
        ctx.fillStyle = OVERLOAD_SAGE;
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.min(w, h) * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, [liveRef, reduce]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
