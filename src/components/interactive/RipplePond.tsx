import { useEffect, useRef, useState } from "react";

interface Ripple {
  x: number;
  y: number;
  r: number;
  alpha: number;
  hue: number;
}

/** 五声音阶(C 宫):怎么弹都和谐——生成式音乐的安全网 */
const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];

/**
 * 涟漪音池 —— Vibes 的核心交互范式:触摸 = 音符 + 视觉涟漪。
 * WebAudio 生成正弦音(带泛音与衰减包络),无需任何音频文件。
 */
export default function RipplePond() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const audioRef = useRef<AudioContext | null>(null);
  const [taps, setTaps] = useState(0);

  const playNote = (freq: number) => {
    try {
      audioRef.current ??= new AudioContext();
      const ctx = audioRef.current;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      overtone.type = "sine";
      overtone.frequency.value = freq * 2;
      const oGain = ctx.createGain();
      oGain.gain.value = 0.15;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.28, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      osc.connect(gain);
      overtone.connect(oGain).connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      overtone.start(t);
      osc.stop(t + 2.3);
      overtone.stop(t + 2.3);
    } catch {
      // 浏览器拒绝音频时静默降级:只剩视觉涟漪
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const draw = (t: number) => {
      const w = (canvas.width = canvas.clientWidth * devicePixelRatio);
      const h = (canvas.height = canvas.clientHeight * devicePixelRatio);

      // 水面
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#dce8e4");
      bg.addColorStop(1, "#7ba394");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // 缓慢的水波光带
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 10) {
          const y =
            h * (0.25 + i * 0.18) + Math.sin(x * 0.006 + t * 0.0003 + i * 1.7) * h * 0.02;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "rgba(255,255,255,0.13)";
        ctx.lineWidth = 2 * devicePixelRatio;
        ctx.stroke();
      }

      // 涟漪
      ripplesRef.current = ripplesRef.current.filter((r) => r.alpha > 0.01);
      for (const r of ripplesRef.current) {
        r.r += 1.6 * devicePixelRatio;
        r.alpha *= 0.985;
        for (let ring = 0; ring < 3; ring++) {
          ctx.beginPath();
          ctx.arc(r.x, r.y, Math.max(r.r - ring * 14 * devicePixelRatio, 0), 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${r.hue}, 30%, 90%, ${r.alpha * (1 - ring * 0.28)})`;
          ctx.lineWidth = 1.6 * devicePixelRatio;
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    // 环境涟漪:偶尔自己泛起(对应引导语"那是环境的声音")
    const ambient = setInterval(() => {
      const w = canvas.clientWidth * devicePixelRatio;
      const h = canvas.clientHeight * devicePixelRatio;
      ripplesRef.current.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 4,
        alpha: 0.25,
        hue: 160,
      });
    }, 3200);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(ambient);
    };
  }, []);

  return (
    <div className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-pointer touch-none"
        onPointerDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const dpr = devicePixelRatio;
          ripplesRef.current.push({
            x: (e.clientX - rect.left) * dpr,
            y: (e.clientY - rect.top) * dpr,
            r: 6,
            alpha: 0.85,
            hue: 150 + Math.random() * 30,
          });
          playNote(PENTA[Math.floor(Math.random() * PENTA.length)]);
          setTaps((n) => n + 1);
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-8 text-center">
        <div className="font-display text-lg text-white/85 drop-shadow">轻触水面,激起一个音符</div>
        <div className="mt-1 text-xs text-white/50">
          {taps === 0 ? "五声音阶,怎么弹都好听" : `你已弹奏 ${taps} 个音符`}
        </div>
      </div>
    </div>
  );
}
