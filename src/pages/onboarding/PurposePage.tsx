import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { IconArrow } from "@/components/icons/IconArrow";
import FluidPillTrack from "@/components/FluidPillTrack";
import { ONBOARD_BLEED, ONBOARD_SAFE_TOP } from "@/lib/onboarding-layout";

type PageId = "what" | "why" | "day" | "edge";

const PAGES: { id: PageId; kicker: string; cta: string }[] = [
  { id: "what", kicker: "01", cta: "继续" },
  { id: "why", kicker: "02", cta: "继续" },
  { id: "day", kicker: "03", cta: "继续" },
  { id: "edge", kicker: "04", cta: "去认识我的大脑" },
];

/**
 * 开屏说明书：四页图文翻页 → Cover（设备先认识你）。
 * 正文用奶油底 + 深色字，避免暗底上继承 body 黑字看不见。
 */
export default function PurposePage() {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const touchX = useRef<number | null>(null);
  const page = PAGES[idx]!;
  const isLast = idx === PAGES.length - 1;

  const go = useCallback((next: number) => {
    setIdx(Math.max(0, Math.min(PAGES.length - 1, next)));
  }, []);

  const next = () => {
    if (isLast) {
      navigate("/onboarding");
      return;
    }
    go(idx + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      }
      if (e.key === "ArrowLeft") go(idx - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, isLast]);

  return (
    <div
      className={`${ONBOARD_BLEED} bg-[#0c0c0e] text-white`}
      onTouchStart={(e) => {
        touchX.current = e.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        if (start == null) return;
        const dx = (e.changedTouches[0]?.clientX ?? start) - start;
        if (dx < -48) next();
        if (dx > 48) go(idx - 1);
      }}
    >
      {/* 上半：全幅图形 */}
      <div className="pointer-events-none absolute inset-0">
        <img
          src="/brand/attunia-purpose.png"
          alt=""
          className="absolute inset-0 h-[58%] w-full object-cover object-[center_30%]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(12,12,14,0.25) 0%, rgba(12,12,14,0.15) 32%, rgba(12,12,14,0.92) 52%, #0c0c0e 62%)",
          }}
          aria-hidden
        />
      </div>

      <div className={`relative z-10 flex min-h-0 flex-1 flex-col px-4 pb-4 ${ONBOARD_SAFE_TOP}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-white uppercase" style={{ opacity: 0.55 }}>
            Attunia · 说明书
          </p>
          <button
            type="button"
            onClick={() => navigate("/onboarding")}
            className="text-[11px] text-white transition hover:opacity-100"
            style={{ opacity: 0.5 }}
          >
            跳过
          </button>
        </div>

        <div className="mt-3 px-0.5" role="tablist" aria-label="说明书进度">
          <FluidPillTrack
            activeIndex={idx}
            count={PAGES.length}
            className="grid grid-cols-4 gap-1.5"
            pillClassName="rounded-full bg-white top-0 bottom-0"
          >
            {PAGES.map((p, i) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                data-fluid-i={i}
                aria-selected={i === idx}
                onClick={() => go(i)}
                className="relative z-[1] h-1.5 rounded-full"
                style={{ background: i < idx ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)" }}
              />
            ))}
          </FluidPillTrack>
        </div>

        {/* 图形区：每页不同视觉 */}
        <div key={`art-${page.id}`} className="nf-purpose-page relative mt-4 flex h-[min(28vh,220px)] items-end justify-center">
          <PageArt id={page.id} />
        </div>

        {/* 下半：奶油阅读卡 — 深字，保证可读 */}
        <div
          key={`copy-${page.id}`}
          className="nf-purpose-page mt-auto flex flex-col rounded-[28px] bg-[#F4F1EA] px-5 pt-5 pb-4 text-ink shadow-[0_-12px_40px_-20px_rgba(0,0,0,0.45)]"
        >
          <p className="text-[11px] font-semibold tracking-[0.16em] text-ink/40">
            {page.kicker} / 04
          </p>
          <div className="mt-2">
            {page.id === "what" && <PageWhat />}
            {page.id === "why" && <PageWhy />}
            {page.id === "day" && <PageDay />}
            {page.id === "edge" && <PageEdge />}
          </div>

          <div className="mt-3 flex items-center gap-2.5 pt-1">
            {idx > 0 ? (
              <button
                type="button"
                onClick={() => go(idx - 1)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink/70 active:scale-95"
                aria-label="上一页"
              >
                <IconArrow direction="left" className="h-4 w-4" />
              </button>
            ) : (
              <span className="w-12 shrink-0" />
            )}
            <button
              type="button"
              onClick={next}
              className="flex min-w-0 flex-1 items-center justify-between rounded-full bg-ink py-2 pr-2 pl-5 text-white active:scale-[0.98]"
            >
              <span className="truncate text-[14px] font-semibold">{page.cta}</span>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-ink">
                <IconArrow direction="right" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageArt({ id }: { id: PageId }) {
  if (id === "what") {
    return (
      <div className="flex items-center gap-3 pb-2">
        {[
          { label: "戴上", tone: "#F5E56B" },
          { label: "看见", tone: "#B8F2C9" },
          { label: "练习", tone: "#7B8CFF" },
        ].map((s, i) => (
          <div key={s.label} className="flex items-center gap-3">
            <div
              className="flex h-[72px] w-[72px] flex-col items-center justify-center rounded-[22px] ring-1 ring-white/20"
              style={{ background: `linear-gradient(145deg, ${s.tone}33, transparent)` }}
            >
              <span
                className="mb-1 h-2.5 w-2.5 rounded-full"
                style={{ background: s.tone, boxShadow: `0 0 16px ${s.tone}` }}
              />
              <span className="text-[12px] font-semibold text-white">{s.label}</span>
            </div>
            {i < 2 && <span className="text-white/35">→</span>}
          </div>
        ))}
      </div>
    );
  }
  if (id === "why") {
    return (
      <div className="grid w-full max-w-[320px] grid-cols-3 gap-2 px-2 pb-1">
        {[
          { t: "专注", d: "漂了再收回", c: "#F5E56B" },
          { t: "过载", d: "先落地", c: "#FF8A6A" },
          { t: "切换", d: "上下班", c: "#B8F2C9" },
        ].map((x) => (
          <div
            key={x.t}
            className="rounded-[20px] px-2 py-4 text-center ring-1 ring-white/15"
            style={{ background: `linear-gradient(180deg, ${x.c}28, rgba(12,12,14,0.35))` }}
          >
            <p className="font-display text-[18px] font-bold text-white">{x.t}</p>
            <p className="mt-1 text-[10px] text-white" style={{ opacity: 0.65 }}>
              {x.d}
            </p>
          </div>
        ))}
      </div>
    );
  }
  if (id === "day") {
    return (
      <div className="flex -space-x-3 pb-2">
        {[
          "/brand/friends/tuno.png",
          "/brand/friends/mira.png",
          "/brand/friends/kai.png",
        ].map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            className="h-[88px] w-[88px] rounded-full object-cover ring-2 ring-[#0c0c0e]"
            style={{ zIndex: 3 - i }}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="flex gap-3 pb-2">
      <div className="rounded-[22px] bg-[#B8F2C9]/20 px-5 py-4 ring-1 ring-[#B8F2C9]/35">
        <p className="text-[11px] font-semibold text-[#B8F2C9]">能</p>
        <p className="mt-1 font-display text-[20px] font-bold text-white">看见 · 推荐 · 练</p>
      </div>
      <div className="rounded-[22px] bg-white/5 px-5 py-4 ring-1 ring-white/15">
        <p className="text-[11px] font-semibold text-white" style={{ opacity: 0.45 }}>
          不
        </p>
        <p className="mt-1 font-display text-[20px] font-bold text-white" style={{ opacity: 0.75 }}>
          诊断 · 处方
        </p>
      </div>
    </div>
  );
}

function PageWhat() {
  return (
    <>
      <h1 className="font-display text-[1.7rem] leading-[1.12] font-extrabold text-ink">
        让疗法跟着大脑走
      </h1>
      <p className="mt-2.5 text-[14px] leading-relaxed text-ink/55">
        头环读出唤醒 / 专注 / 平静；Tuno 从目录里挑一段对得上的短练习。
      </p>
      <p className="mt-4 text-[12px] font-medium tracking-wide text-ink/40">
        戴上 → 看见 → 练几分钟，就这样。
      </p>
    </>
  );
}

function PageWhy() {
  return (
    <>
      <h1 className="font-display text-[1.7rem] leading-[1.12] font-extrabold text-ink">
        状态拧巴时，轻轻递一把
      </h1>
      <ul className="mt-4 space-y-2">
        {[
          { t: "想专注却一直漂", tone: "#C9A227" },
          { t: "消息会议叠在一起", tone: "#E07050" },
          { t: "上班难进、下班难出", tone: "#5A8F6E" },
        ].map((c) => (
          <li
            key={c.t}
            className="flex items-center gap-3 rounded-[16px] bg-white px-3.5 py-3 shadow-[0_6px_18px_-14px_rgba(17,17,17,0.35)]"
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.tone }} />
            <span className="text-[14px] font-semibold text-ink">{c.t}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function PageDay() {
  return (
    <>
      <h1 className="font-display text-[1.7rem] leading-[1.12] font-extrabold text-ink">
        几分钟，就够用
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-ink/55">打开场景，跟着 Friends 做一小段。</p>
      <div className="mt-4 space-y-2">
        {[
          { when: "开工", who: "Tuno", line: "热身注意力", img: "/brand/friends/tuno.png" },
          { when: "专注", who: "Mira", line: "漂了再收回", img: "/brand/friends/mira.png" },
          { when: "下班", who: "Kai", line: "工作留在工位", img: "/brand/friends/kai.png" },
        ].map((row) => (
          <div
            key={row.when}
            className="flex items-center gap-3 rounded-[18px] bg-white px-3 py-2.5 shadow-[0_6px_18px_-14px_rgba(17,17,17,0.35)]"
          >
            <img src={row.img} alt="" className="h-11 w-11 rounded-full object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-ink">
                {row.when}
                <span className="mx-1.5 font-normal text-ink/30">·</span>
                <span className="font-medium text-ink/50">{row.who}</span>
              </p>
              <p className="text-[12px] text-ink/45">{row.line}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function PageEdge() {
  return (
    <>
      <h1 className="font-display text-[1.7rem] leading-[1.12] font-extrabold text-ink">
        温柔，也有边界
      </h1>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-[18px] bg-[#E8F6EC] px-3.5 py-3.5">
          <p className="text-[11px] font-semibold text-[#3D7A52]">能做</p>
          <ul className="mt-2 space-y-1.5 text-[13px] leading-snug text-ink/70">
            <li>看见状态</li>
            <li>推荐练习</li>
            <li>拼接方案</li>
          </ul>
        </div>
        <div className="rounded-[18px] bg-ink/[0.04] px-3.5 py-3.5">
          <p className="text-[11px] font-semibold text-ink/40">不做</p>
          <ul className="mt-2 space-y-1.5 text-[13px] leading-snug text-ink/55">
            <li>诊断处方</li>
            <li>替代求助</li>
            <li>脑电上云</li>
          </ul>
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-ink/40">
        紧急请拨打 400-161-9995 或 120。
      </p>
    </>
  );
}
