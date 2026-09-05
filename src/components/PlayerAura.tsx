import { useEffect, useRef } from "react";
import type { LiveBio } from "@/components/BioOrb";
import type { WorkSceneId } from "@/lib/scenes";

const PALETTE: Record<WorkSceneId, { bg: [number, number, number]; glow: [number, number, number]; kind: "rings" | "orb" | "oval" | "ripple" | "slit" }> = {
  "clock-in": { bg: [18, 28, 24], glow: [245, 229, 107], kind: "rings" },
  "post-meet": { bg: [16, 18, 32], glow: [184, 242, 201], kind: "rings" },
  "lunch-tide": { bg: [32, 20, 14], glow: [245, 193, 107], kind: "oval" },
  overload: { bg: [14, 28, 26], glow: [255, 107, 74], kind: "orb" },
  "drift-back": { bg: [24, 20, 32], glow: [184, 242, 201], kind: "ripple" },
  "clock-out": { bg: [12, 10, 14], glow: [245, 200, 120], kind: "orb" },
};

/** 深色播放器中央光场：随唤醒 / 专注 / 平静呼吸。 */
export default function PlayerAura({
  liveRef,
  sceneId,
}: {
  liveRef: React.RefObject<LiveBio>;
  sceneId: WorkSceneId;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef(sceneId);
  sceneRef.current = sceneId;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let t = 0;

    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const onResize = () => fit();
    window.addEventListener("resize", onResize);

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const bio = liveRef.current ?? { arousal: 60, focus: 55, calm: 50 };
      const spec = PALETTE[sceneRef.current];
      t += reduce ? 0.004 : 0.012;

      ctx.fillStyle = `rgb(${spec.bg[0]}, ${spec.bg[1]}, ${spec.bg[2]})`;
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h * 0.46;
      const calm = bio.calm / 100;
      const focus = bio.focus / 100;
      const arousal = bio.arousal / 100;
      const breath = 0.5 + 0.5 * Math.sin(t * (0.55 + calm * 0.35));
      const [gr, gg, gb] = spec.glow;
      const warm = arousal * 0.45;
      const r = Math.round(gr + (255 - gr) * warm * 0.25);
      const g = Math.round(gg * (1 - warm * 0.15));
      const b = Math.round(gb * (1 - warm * 0.35));

      const field = ctx.createRadialGradient(cx, cy, 8, cx, cy, Math.max(w, h) * 0.72);
      field.addColorStop(0, `rgba(${r},${g},${b},${0.22 + calm * 0.28})`);
      field.addColorStop(0.45, `rgba(${r},${g},${b},${0.08 + calm * 0.1})`);
      field.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = field;
      ctx.fillRect(0, 0, w, h);

      if (spec.kind === "rings" || spec.kind === "ripple") {
        const count = spec.kind === "ripple" ? 7 : 5;
        for (let i = 0; i < count; i++) {
          const k = (t * (0.12 + focus * 0.18) + i / count) % 1;
          const rad = 28 + k * (90 + focus * 70) * (spec.kind === "ripple" ? 1.15 : 1);
          ctx.beginPath();
          ctx.arc(cx, cy, rad, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${r},${g},${b},${(1 - k) * (0.14 + focus * 0.28)})`;
          ctx.lineWidth = spec.kind === "ripple" ? 1.6 : 2.2 - k;
          ctx.stroke();
        }
      }

      if (spec.kind === "oval") {
        ctx.beginPath();
        ctx.ellipse(cx, cy, 78 + breath * 18 + calm * 22, 36 + breath * 8, 0, 0, Math.PI * 2);
        const oval = ctx.createRadialGradient(cx, cy, 6, cx, cy, 110);
        oval.addColorStop(0, `rgba(255,255,255,${0.35 + calm * 0.25})`);
        oval.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = oval;
        ctx.fill();
      } else {
        const core = 34 + breath * 10 + calm * 16;
        const orb = ctx.createRadialGradient(cx, cy - core * 0.2, 4, cx, cy, core * 2.1);
        orb.addColorStop(0, `rgba(255,255,255,${0.55 + calm * 0.25})`);
        orb.addColorStop(0.35, `rgba(${r},${g},${b},${0.55 + focus * 0.2})`);
        orb.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = orb;
        ctx.beginPath();
        ctx.arc(cx, cy, core * 2.1, 0, Math.PI * 2);
        ctx.fill();
      }

      if (spec.kind === "slit") {
        ctx.beginPath();
        ctx.ellipse(cx, cy, 92, 8 + breath * 3, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245,229,107,${0.55 + calm * 0.25})`;
        ctx.filter = "blur(6px)";
        ctx.fill();
        ctx.filter = "none";
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [liveRef]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
