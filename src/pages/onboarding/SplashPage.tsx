import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { ONBOARD_BLEED } from "@/lib/onboarding-layout";

const HOLD_MS = 3200;

/**
 * Attunia 开屏 → /purpose（四页说明书）→ /onboarding（设备认识你）→ 校准。
 * 无点击按钮，停留后自动进入说明书。
 * 背景用视频 attunia-splash.mp4；原图 attunia-splash.png 仍保留作 poster / 日后复用。
 */
export default function SplashPage() {
  const navigate = useNavigate();
  const gone = useRef(false);

  useEffect(() => {
    const enter = () => {
      if (gone.current) return;
      gone.current = true;
      navigate("/purpose");
    };
    const t = window.setTimeout(enter, HOLD_MS);
    return () => window.clearTimeout(t);
  }, [navigate]);

  return (
    <div className={`${ONBOARD_BLEED} bg-[#0c0c0e]`}>
      <video
        className="nf-splash-kenburns pointer-events-none absolute inset-0 h-full w-full origin-center object-cover will-change-transform"
        src="/brand/attunia-splash.mp4"
        poster="/brand/attunia-splash.png"
        autoPlay
        muted
        playsInline
        loop
        preload="auto"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(12,12,14,0.15) 0%, transparent 42%, rgba(12,12,14,0.55) 78%, rgba(12,12,14,0.88) 100%)",
        }}
        aria-hidden
      />

      <div
        className="nf-splash-glow pointer-events-none absolute top-[38%] left-1/2 h-[42vmin] w-[42vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(184,242,201,0.22) 0%, rgba(184,242,201,0.06) 42%, transparent 70%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 mt-auto flex w-full flex-col items-center px-8 pt-24 pb-14">
        <p
          className="nf-splash-rise text-[11px] font-semibold tracking-[0.28em] text-white/50 uppercase"
          style={{ animationDelay: "0.18s" }}
        >
          Brain Attunement
        </p>
        <h1
          className="nf-splash-rise font-display mt-3 text-[3.4rem] leading-none font-extrabold tracking-[-0.04em] text-white"
          style={{ animationDelay: "0.36s" }}
        >
          Attunia
        </h1>
        <p
          className="nf-splash-rise mt-4 max-w-[24ch] text-center text-[14px] leading-relaxed text-white/60"
          style={{ animationDelay: "0.54s" }}
        >
          让冥想疗法和人的大脑进行调律。
        </p>
      </div>
    </div>
  );
}
