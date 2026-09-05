import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { ONBOARD_BLEED } from "@/lib/onboarding-layout";

const HOLD_MS = 2800;

/**
 * Attunia 开屏：全幅封面顶满机框；Ken Burns + 文案错落入场后进入体验。
 */
export default function SplashPage() {
  const navigate = useNavigate();
  const gone = useRef(false);

  const enter = () => {
    if (gone.current) return;
    gone.current = true;
    navigate("/onboarding", { replace: true });
  };

  useEffect(() => {
    const t = window.setTimeout(enter, HOLD_MS);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <button type="button" onClick={enter} className={`${ONBOARD_BLEED} bg-[#0c0c0e] text-left outline-none`} aria-label="进入 Attunia 体验">
      <img
        src="/brand/attunia-splash.png"
        alt=""
        className="nf-splash-kenburns pointer-events-none absolute inset-0 h-full w-full origin-center object-cover will-change-transform"
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
        <span
          className="nf-splash-rise mt-8 inline-flex h-8 w-8 items-center justify-center"
          style={{ animationDelay: "0.78s" }}
          aria-hidden
        >
          <span className="nf-splash-dot h-1.5 w-1.5 rounded-full bg-[#B8F2C9]" />
        </span>
      </div>
    </button>
  );
}
