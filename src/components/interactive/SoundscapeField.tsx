import { useEffect, useRef } from "react";
import type { LiveBio } from "@/components/BioOrb";

export type SoundscapeTone = "rest" | "focus";

const NODES = [
  { key: "arousal" as const, code: "ar", label: "arousal" },
  { key: "focus" as const, code: "fo", label: "focus" },
  { key: "calm" as const, code: "ca", label: "calm" },
];

/**
 * Odio 式音景场：半透明流体团 + 细轨道 + 状态节点。
 * rest = 近黑深场；focus = 浅雾光场。只驱动视觉，不改采样协议。
 */
export default function SoundscapeField({
  liveRef,
  tone,
}: {
  liveRef: React.RefObject<LiveBio>;
  tone: SoundscapeTone;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rest = tone === "rest";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let t = 0;

    const blobs = [
      { x: 0.42, y: 0.46, r: 0.28, hue: rest ? [255, 92, 64] : [255, 107, 74], phase: 0.2 },
      { x: 0.58, y: 0.4, r: 0.24, hue: rest ? [46, 140, 92] : [184, 242, 201], phase: 1.1 },
      { x: 0.5, y: 0.58, r: 0.22, hue: rest ? [201, 162, 39] : [197, 162, 39], phase: 2.4 },
      { x: 0.36, y: 0.62, r: 0.16, hue: rest ? [80, 60, 140] : [215, 228, 255], phase: 3.3 },
    ];

    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const bio = liveRef.current ?? { arousal: 60, focus: 55, calm: 50 };
      const speed = reduce ? 0.12 : 1;
      t += 0.008 * speed;

      ctx.fillStyle = rest ? "#050505" : "#F3F0E8";
      ctx.fillRect(0, 0, w, h);

      const bg = ctx.createRadialGradient(w * 0.5, h * 0.18, 20, w * 0.5, h * 0.45, h * 0.85);
      if (rest) {
        bg.addColorStop(0, "rgba(70, 40, 90, 0.45)");
        bg.addColorStop(0.45, "rgba(12, 18, 28, 0.35)");
        bg.addColorStop(1, "rgba(5, 5, 5, 0)");
      } else {
        bg.addColorStop(0, "rgba(255, 255, 255, 0.7)");
        bg.addColorStop(0.5, "rgba(184, 242, 201, 0.28)");
        bg.addColorStop(1, "rgba(243, 240, 232, 0)");
      }
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = rest ? "screen" : "multiply";
      blobs.forEach((b, i) => {
        const drive = i === 0 ? bio.arousal : i === 1 ? bio.calm : bio.focus;
        const ox = Math.sin(t * (0.35 + i * 0.12) + b.phase) * w * 0.06;
        const oy = Math.cos(t * (0.28 + i * 0.09) + b.phase) * h * 0.05;
        const cx = b.x * w + ox;
        const cy = b.y * h + oy;
        const rad = Math.min(w, h) * b.r * (0.82 + drive / 280);
        const g = ctx.createRadialGradient(cx - rad * 0.2, cy - rad * 0.25, rad * 0.08, cx, cy, rad);
        const [r, gch, bl] = b.hue;
        const a0 = rest ? 0.55 : 0.42;
        g.addColorStop(0, `rgba(${r},${gch},${bl},${a0})`);
        g.addColorStop(0.45, `rgba(${r},${gch},${bl},${rest ? 0.18 : 0.16})`);
        g.addColorStop(1, `rgba(${r},${gch},${bl},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rad, rad * 0.86, t * 0.15 + i, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalCompositeOperation = "source-over";

      const cx = w * 0.5;
      const cy = h * 0.46;
      const rx = Math.min(w, h) * 0.34;
      const ry = rx * 0.72;
      ctx.strokeStyle = rest ? "rgba(255,255,255,0.18)" : "rgba(17,17,17,0.16)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, -0.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 0.62, ry * 0.55, 0.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = rest ? "#fff" : "#111";
      ctx.beginPath();
      ctx.arc(cx, cy, 3.2, 0, Math.PI * 2);
      ctx.fill();

      NODES.forEach((n, i) => {
        const ang = t * 0.22 + i * ((Math.PI * 2) / 3);
        const px = cx + Math.cos(ang) * rx;
        const py = cy + Math.sin(ang) * ry;
        const v = bio[n.key];
        ctx.fillStyle = rest ? "rgba(8,8,8,0.72)" : "rgba(255,255,255,0.88)";
        ctx.beginPath();
        ctx.arc(px, py, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rest ? "rgba(255,255,255,0.55)" : "rgba(17,17,17,0.35)";
        ctx.stroke();
        ctx.fillStyle = rest ? "#fff" : "#111";
        ctx.font = "600 9px Outfit, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(n.code, px, py - 1);
        ctx.font = "500 8px 'Plus Jakarta Sans', sans-serif";
        ctx.fillStyle = rest ? "rgba(255,255,255,0.45)" : "rgba(17,17,17,0.4)";
        ctx.fillText(String(Math.round(v)), px, py + 22);
      });

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", fit);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, [liveRef, tone]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
