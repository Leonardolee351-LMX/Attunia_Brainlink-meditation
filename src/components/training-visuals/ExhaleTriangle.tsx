import { useEffect, useRef } from "react";
import type { TrainingVisualProps } from "./types";
import { bioNorm, clamp01, useReducedMotion } from "./types";
import { OVERLOAD_CLAY, OVERLOAD_INK, OVERLOAD_SAGE } from "@/lib/training-visual-registry";

const CYCLE = 19;
const INHALE = 4;
const HOLD = 7;
const EXHALE = 8;

type Mode = "empty" | "inhale" | "hold" | "exhale" | "soft";

/** 协议钟位置 → 波形高度 0..1（吸升 / 停平 / 呼落） */
function waveY01(u: number): number {
  const x = ((u % CYCLE) + CYCLE) % CYCLE;
  if (x < INHALE) {
    const p = x / INHALE;
    // 缓升
    return p * p * (3 - 2 * p);
  }
  if (x < INHALE + HOLD) return 1;
  const p = (x - INHALE - HOLD) / EXHALE;
  const s = p * p * (3 - 2 * p);
  return 1 - s;
}

function modeAt(ct: number): { mode: Mode; local: number; beatTotal: number; beatLeft: number } {
  if (ct < INHALE) {
    const floor = Math.floor(ct);
    return {
      mode: "inhale",
      local: ct / INHALE,
      beatTotal: INHALE,
      beatLeft: Math.max(0, INHALE - floor),
    };
  }
  if (ct < INHALE + HOLD) {
    const floor = Math.floor(ct - INHALE);
    return {
      mode: "hold",
      local: (ct - INHALE) / HOLD,
      beatTotal: HOLD,
      beatLeft: Math.max(0, HOLD - floor),
    };
  }
  const floor = Math.floor(ct - INHALE - HOLD);
  return {
    mode: "exhale",
    local: (ct - INHALE - HOLD) / EXHALE,
    beatTotal: EXHALE,
    beatLeft: Math.max(0, EXHALE - floor),
  };
}

/**
 * 4-7-8：前进贝塞尔曲线（升→平→落）+ 下方倒数圆点；
 * 几何三角跟在游标上。协议钟驱动；脑电只改品质。
 */
export default function ExhaleTriangle({
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
    let lastWall = -1;
    let frac = 0;
    let lastPerf = performance.now();

    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    window.addEventListener("resize", fit);

    const draw = (now: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const bio = bioNorm(liveRef.current);
      const phaseIndex = phaseRef.current;
      const phaseElapsedSec = elapsedRef.current;
      const running = runRef.current;
      const dt = Math.min(0.05, (now - lastPerf) / 1000);
      lastPerf = now;
      t += reduce ? dt * 0.4 : dt;

      if (phaseElapsedSec !== lastWall) {
        lastWall = phaseElapsedSec;
        frac = 0;
      } else if (running) {
        frac = Math.min(0.999, frac + dt);
      }

      const natural = phaseIndex >= 2;
      const settle = phaseIndex === 0;
      const looping = phaseIndex === 1 && running;

      let mode: Mode = "soft";
      let local = 0;
      let beatTotal = 0;
      let beatLeft = 0;
      let ct = 0;
      let playhead = 0;

      if (natural) {
        mode = "soft";
        local = (Math.sin(t * 0.7) * 0.5 + 0.5) * 0.25;
        playhead = (t * 0.35) % CYCLE;
        ct = playhead;
      } else if (settle) {
        // 安顿：先空，后做一次泄气落线
        if (phaseElapsedSec + frac < 20) {
          mode = "empty";
          local = 0.15;
          playhead = 0;
        } else {
          mode = "exhale";
          local = clamp01((phaseElapsedSec + frac - 20) / 16);
          playhead = INHALE + HOLD + local * EXHALE;
          beatTotal = EXHALE;
          beatLeft = Math.max(0, EXHALE - Math.floor(local * EXHALE));
        }
        ct = playhead;
      } else if (looping) {
        ct = (phaseElapsedSec % CYCLE) + frac;
        playhead = ct;
        const m = modeAt(ct);
        mode = m.mode;
        local = m.local;
        beatTotal = m.beatTotal;
        beatLeft = m.beatLeft;
      } else if (phaseIndex === 1) {
        // 暂停在循环阶段
        ct = phaseElapsedSec % CYCLE;
        playhead = ct;
        const m = modeAt(ct);
        mode = m.mode;
        local = m.local;
        beatTotal = m.beatTotal;
        beatLeft = m.beatLeft;
      }

      const dustN = Math.round((natural ? 2 : 5) + bio.arousal * 14);
      const emptySage =
        0.06 + bio.calm * 0.38 * (mode === "exhale" ? 0.35 + local * 0.65 : natural ? 0.55 : 0.18);
      const trail = 0.35 + bio.focus * 0.65;

      // —— 背景 ——
      ctx.clearRect(0, 0, w, h);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, OVERLOAD_INK);
      bg.addColorStop(1, `rgba(168,191,176,${emptySage})`);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // 黏土标签尘（品质）
      for (let i = 0; i < dustN; i++) {
        const fall =
          mode === "exhale" ? local * h * 0.22 * (0.35 + (i % 5) * 0.1) : Math.sin(t * 0.35 + i) * 5;
        const x = ((i * 97) % (w * 0.72)) + w * 0.14;
        const y = h * 0.12 + ((i * 53) % (h * 0.28)) + fall;
        ctx.globalAlpha = (0.08 + bio.arousal * 0.2) * (natural ? 0.35 : 1);
        ctx.fillStyle = OVERLOAD_CLAY;
        ctx.fillRect(x, y, 9 + (i % 3) * 3, 4);
      }
      ctx.globalAlpha = 1;

      // —— 曲线图区域 ——
      const chartL = w * 0.1;
      const chartR = w * 0.9;
      const chartT = h * 0.22;
      const chartB = h * 0.52;
      const chartW = chartR - chartL;
      const chartH = chartB - chartT;

      // 几何框 + 水平导轨
      ctx.strokeStyle = "rgba(245,237,224,0.12)";
      ctx.lineWidth = 1;
      ctx.strokeRect(chartL, chartT, chartW, chartH);
      for (let g = 0; g < 3; g++) {
        const gy = chartT + chartH * ((g + 1) / 4);
        ctx.beginPath();
        ctx.moveTo(chartL, gy);
        ctx.lineTo(chartR, gy);
        ctx.strokeStyle = "rgba(168,191,176,0.08)";
        ctx.stroke();
      }

      // 段色带：4 / 7 / 8 在可视窗内的语义分区（相对当前游标）
      const windowSec = CYCLE * 1.15;
      const scroll = playhead;
      const xOf = (sec: number) => chartL + ((sec - (scroll - windowSec * 0.28)) / windowSec) * chartW;
      const yOf = (u: number) => chartB - waveY01(u) * chartH * 0.82 - chartH * 0.08;

      // 填充区（曲线下）
      const samples = 96;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= samples; i++) {
        const sec = scroll - windowSec * 0.28 + (i / samples) * windowSec;
        const x = xOf(sec);
        const y = yOf(sec);
        if (!started) {
          ctx.moveTo(x, chartB);
          ctx.lineTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.lineTo(xOf(scroll - windowSec * 0.28 + windowSec), chartB);
      ctx.closePath();
      const fill = ctx.createLinearGradient(0, chartT, 0, chartB);
      fill.addColorStop(0, `rgba(168,191,176,${0.12 + bio.calm * 0.22})`);
      fill.addColorStop(1, "rgba(12,12,14,0)");
      ctx.fillStyle = fill;
      ctx.fill();

      // 前进贝塞尔折线：用三次贝塞尔逼近 4-7-8 段
      const drawBezierWave = (alpha: number, width: number) => {
        ctx.beginPath();
        const step = 0.35;
        let first = true;
        for (let sec = scroll - windowSec * 0.28; sec <= scroll + windowSec * 0.72; sec += step) {
          const a = sec;
          const b = sec + step;
          const mid = (a + b) / 2;
          const x0 = xOf(a);
          const y0 = yOf(a);
          const x1 = xOf(b);
          const y1 = yOf(b);
          const xm = xOf(mid);
          // 控制点：水平推进 + 高度插值，形成平滑贝塞尔感
          const c1x = x0 + (xm - x0) * 0.55;
          const c1y = y0;
          const c2x = x1 - (x1 - xm) * 0.55;
          const c2y = y1;
          if (first) {
            ctx.moveTo(x0, y0);
            first = false;
          }
          ctx.bezierCurveTo(c1x, c1y, c2x, c2y, x1, y1);
        }
        ctx.strokeStyle =
          mode === "inhale"
            ? `rgba(255,107,74,${alpha})`
            : mode === "hold"
              ? `rgba(168,191,176,${alpha})`
              : mode === "exhale"
                ? `rgba(232,220,200,${alpha * trail})`
                : `rgba(168,191,176,${alpha * 0.55})`;
        ctx.lineWidth = width;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke();
      };
      drawBezierWave(0.2, 6);
      drawBezierWave(0.55 + bio.focus * 0.35, 2.2);

      // 段标注竖线（当前周期内 0 / 4 / 11 / 19）
      const cycleBase = Math.floor(playhead / CYCLE) * CYCLE;
      for (const mark of [0, INHALE, INHALE + HOLD, CYCLE]) {
        const sx = xOf(cycleBase + mark);
        if (sx < chartL || sx > chartR) continue;
        ctx.beginPath();
        ctx.moveTo(sx, chartT);
        ctx.lineTo(sx, chartB);
        ctx.strokeStyle = "rgba(245,237,224,0.1)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // 游标 + 几何三角
      const px = xOf(playhead);
      const py = yOf(playhead);
      ctx.beginPath();
      ctx.moveTo(px, chartT);
      ctx.lineTo(px, chartB);
      ctx.strokeStyle = `rgba(255,107,74,${0.25 + trail * 0.35})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      const tri = Math.min(w, h) * (mode === "hold" ? 0.028 : 0.034);
      ctx.save();
      ctx.translate(px, py);
      if (mode === "inhale") ctx.rotate((-12 + local * 8) * (Math.PI / 180));
      if (mode === "exhale") ctx.rotate((8 + local * 10) * (Math.PI / 180));
      ctx.globalAlpha = natural ? 0.35 : 0.9;
      ctx.beginPath();
      ctx.moveTo(0, -tri * 1.1);
      ctx.lineTo(tri * 0.95, tri * 0.7);
      ctx.lineTo(-tri * 0.95, tri * 0.7);
      ctx.closePath();
      const tg = ctx.createLinearGradient(0, -tri, 0, tri);
      tg.addColorStop(0, OVERLOAD_SAGE);
      tg.addColorStop(1, OVERLOAD_CLAY);
      ctx.fillStyle = tg;
      ctx.fill();
      ctx.restore();

      // 游标光点
      ctx.beginPath();
      ctx.arc(px, py, 3.5 + (reduce ? 0 : Math.sin(t * 4) * 0.6), 0, Math.PI * 2);
      ctx.fillStyle = OVERLOAD_CLAY;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;

      // —— 下方 4 / 7 / 8 倒数点 ——
      const dotsY = h * 0.64;
      const labelY = h * 0.58;
      ctx.textAlign = "center";
      ctx.font = `500 ${Math.max(11, Math.round(w * 0.032))}px ui-sans-serif, system-ui, sans-serif`;

      if (beatTotal > 0 && !natural) {
        const label =
          mode === "inhale" ? "吸 · 4" : mode === "hold" ? "停 · 7" : mode === "exhale" ? "呼 · 8" : "";
        ctx.fillStyle = "rgba(245,237,224,0.55)";
        ctx.fillText(label, w * 0.5, labelY);

        const gap = Math.min(28, (w * 0.72) / Math.max(beatTotal, 1));
        const totalW = (beatTotal - 1) * gap;
        const startX = w * 0.5 - totalW / 2;
        for (let i = 0; i < beatTotal; i++) {
          const on = i < beatLeft;
          const dx = startX + i * gap;
          // 几何：吸=小三角点，停=菱形，呼=圆
          ctx.globalAlpha = on ? 0.9 : 0.12;
          ctx.fillStyle = on
            ? mode === "hold"
              ? OVERLOAD_SAGE
              : mode === "exhale"
                ? "rgba(232,220,200,0.95)"
                : OVERLOAD_CLAY
            : "rgba(245,237,224,0.25)";
          if (mode === "inhale") {
            const s = on ? 6.5 : 5;
            ctx.beginPath();
            ctx.moveTo(dx, dotsY - s);
            ctx.lineTo(dx + s * 0.85, dotsY + s * 0.55);
            ctx.lineTo(dx - s * 0.85, dotsY + s * 0.55);
            ctx.closePath();
            ctx.fill();
          } else if (mode === "hold") {
            const s = on ? 5.5 : 4.5;
            ctx.beginPath();
            ctx.moveTo(dx, dotsY - s);
            ctx.lineTo(dx + s, dotsY);
            ctx.lineTo(dx, dotsY + s);
            ctx.lineTo(dx - s, dotsY);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(dx, dotsY, on ? 5.2 : 4.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;

        // 当前拍轻微下沉提示「刚数过」
        if (beatLeft < beatTotal && beatLeft >= 0) {
          const just = startX + beatLeft * gap;
          ctx.globalAlpha = 0.25;
          ctx.strokeStyle = OVERLOAD_CLAY;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(just, dotsY, 9, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      } else if (natural) {
        ctx.fillStyle = "rgba(245,237,224,0.4)";
        ctx.fillText("自然呼吸", w * 0.5, labelY);
        // 三点淡脉动
        for (let i = 0; i < 3; i++) {
          const dx = w * 0.5 + (i - 1) * 22;
          ctx.globalAlpha = 0.25 + local * 0.5;
          ctx.fillStyle = OVERLOAD_SAGE;
          ctx.beginPath();
          ctx.arc(dx, dotsY, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (mode === "empty") {
        ctx.fillStyle = "rgba(245,237,224,0.4)";
        ctx.fillText("先呼干净", w * 0.5, labelY);
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = OVERLOAD_SAGE;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(w * 0.5, dotsY - 10);
        ctx.lineTo(w * 0.42, dotsY + 8);
        ctx.lineTo(w * 0.58, dotsY + 8);
        ctx.closePath();
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // 底部几何构成：三条节奏刻度
      const baseY = h * 0.78;
      const segs = [
        { n: 4, c: OVERLOAD_CLAY },
        { n: 7, c: OVERLOAD_SAGE },
        { n: 8, c: "rgba(232,220,200,0.85)" },
      ];
      let acc = 0;
      const unit = (w * 0.7) / CYCLE;
      const baseX = w * 0.15;
      for (const s of segs) {
        ctx.fillStyle = s.c;
        ctx.globalAlpha =
          mode === "inhale" && s.n === 4
            ? 0.55
            : mode === "hold" && s.n === 7
              ? 0.55
              : mode === "exhale" && s.n === 8
                ? 0.55
                : 0.18;
        ctx.fillRect(baseX + acc * unit, baseY, s.n * unit - 3, 4);
        acc += s.n;
      }
      ctx.globalAlpha = 1;

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
