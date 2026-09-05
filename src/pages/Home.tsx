import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import PlanMiniCard from "@/components/PlanMiniCard";
import { ComplianceFinePrint } from "@/components/ComplianceNote";
import { trpc } from "@/providers/trpc";
import { loadBaseline } from "@/lib/baseline";
import { loadUserName, saveUserName } from "@/lib/user";
import { getLiveSnapshot, isLiveHardware, subscribeLive } from "@/lib/live-device";
import { WORK_SCENES, recommendWorkScene, type BioHint } from "@/lib/scenes";
import AbstractSceneArt from "@/components/AbstractSceneArt";
import { makeHomeIntentState, routeHomeIntent } from "@/lib/intent-route";
import { planCoverSrc, planCrop } from "@/lib/plan-covers";
import { IconArrow } from "@/components/icons/IconArrow";
import { ONBOARD_BLEED, ONBOARD_SAFE_TOP } from "@/lib/onboarding-layout";

/** 前 7 天新用户场景:按校准日期推算「第 N 天」 */
function daySince(iso: string): number {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) + 1;
  return Math.max(1, Math.min(7, days));
}

/** 一日节律问候:work-life 切换，不含睡前/起床 */
function circadianGreeting(hour: number): { greet: string; hint: string } {
  if (hour >= 22 || hour < 6)
    return { greet: "还在工位?", hint: "先把工作模式卸下来，再决定要不要休息" };
  if (hour < 9)
    return { greet: "早上好", hint: "开工前，给注意力热个身" };
  if (hour < 12)
    return { greet: "上午好", hint: "把注意力慢慢收拢，准备工作" };
  if (hour < 14)
    return { greet: "中午好", hint: "午间适合一段短短的恢复" };
  if (hour < 17)
    return { greet: "下午好", hint: "下半场，保持住自己的节奏" };
  if (hour < 19)
    return { greet: "下班了", hint: "把工作状态卸下来，切回自己" };
  return { greet: "晚上好", hint: "今天可以收工了，给身心一个仪式" };
}

function liveBioHint(): BioHint | null {
  const snap = getLiveSnapshot();
  if (!isLiveHardware() || !snap.last) return null;
  return { arousal: snap.last.arousal, focus: snap.last.focus, calm: snap.last.calm };
}

export default function Home() {
  const presets = trpc.agent.presets.useQuery();
  const navigate = useNavigate();
  const baseline = loadBaseline();
  const [name, setName] = useState(loadUserName());
  const [editingName, setEditingName] = useState(false);
  const [intent, setIntent] = useState("");
  const [live, setLive] = useState<BioHint | null>(() => liveBioHint());
  const hour = new Date().getHours();
  const circadian = circadianGreeting(hour);

  useEffect(() => {
    return subscribeLive((sample) => {
      if (!isLiveHardware()) return;
      const next = { arousal: sample.arousal, focus: sample.focus, calm: sample.calm };
      setLive((prev) => {
        const now = new Date().getHours();
        if (!prev) return next;
        if (recommendWorkScene(now, prev) !== recommendWorkScene(now, next)) return next;
        return prev;
      });
    });
  }, []);

  const bio = live ?? (baseline ? { arousal: baseline.arousal, focus: baseline.focus, calm: baseline.calm } : null);
  const recommendedId = useMemo(() => recommendWorkScene(hour, bio), [hour, bio]);
  const recommended = WORK_SCENES.find((s) => s.id === recommendedId) ?? WORK_SCENES[0];
  const quickPlan = presets.data?.plans.find((p) => p.id === recommended.planId);
  const darkHero = recommended.dark || recommended.id === "post-meet" || recommended.id === "lunch-tide" || recommended.id === "overload" || recommended.id === "clock-out";

  const goWithIntent = () => {
    const text = intent.trim();
    if (!text) return;
    const state = makeHomeIntentState(text);
    navigate(routeHomeIntent(text) === "consult" ? "/consult" : "/chat", { state });
  };

  const openRecommend = () => {
    navigate(`/session/${recommended.planId}`, { state: { sceneId: recommended.id } });
  };

  return (
    <div className="flex min-h-full flex-col bg-cream">
      {/* 此刻推荐：封顶全幅英雄区 */}
      <section className={`${ONBOARD_BLEED} bg-ink`}>
        <div className="absolute inset-0" aria-hidden>
          {quickPlan ? (
            <img
              src={planCoverSrc(recommended.planId)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: planCrop(recommended.planId) }}
            />
          ) : (
            <AbstractSceneArt sceneId={recommended.id} className="absolute inset-0 h-full w-full" />
          )}
          <div
            className="absolute inset-0"
            style={{
              background: darkHero
                ? "linear-gradient(180deg, rgba(12,12,14,0.55) 0%, rgba(12,12,14,0.25) 38%, rgba(12,12,14,0.72) 68%, rgba(12,12,14,0.94) 100%)"
                : "linear-gradient(180deg, rgba(246,247,249,0.72) 0%, rgba(246,247,249,0.35) 36%, rgba(12,12,14,0.45) 70%, rgba(12,12,14,0.88) 100%)",
            }}
          />
        </div>

        <div
          className={`relative z-10 flex min-h-[min(68vh,560px)] flex-1 flex-col px-5 pb-6 ${ONBOARD_SAFE_TOP}`}
        >
          <div className={darkHero ? "text-white" : "text-ink"}>
            <p className={`text-[12px] font-medium ${darkHero ? "text-white/50" : "text-ink/45"}`}>
              {baseline ? `第 ${daySince(baseline.calibratedAt)} 天 · 共 7 天` : "Attunia"}
            </p>
            <h1 className="font-display mt-1 text-[clamp(1.7rem,7vw,2rem)] leading-[1.12] font-extrabold">
              {circadian.greet}
            </h1>
            {editingName ? (
              <input
                autoFocus
                defaultValue={name}
                maxLength={12}
                placeholder="怎么称呼你"
                onBlur={(e) => {
                  saveUserName(e.target.value);
                  setName(e.target.value.trim());
                  setEditingName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                className={`font-display mt-1 w-40 rounded-full px-3 py-1 text-[1.25rem] font-extrabold outline-none ${
                  darkHero
                    ? "bg-white/15 text-white placeholder:text-white/40"
                    : "bg-white text-ink shadow-[0_6px_18px_-12px_rgba(17,17,17,0.4)]"
                }`}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingName(true)}
                title="点一下,告诉我怎么称呼你"
                className="font-display mt-1 block min-h-10 text-left text-[1.25rem] font-extrabold transition hover:opacity-70"
              >
                {name || "朋友"}
              </button>
            )}
            <p className={`mt-1.5 max-w-[32ch] text-[13px] leading-relaxed ${darkHero ? "text-white/55" : "text-ink/50"}`}>
              {circadian.hint}
            </p>
          </div>

          <button
            type="button"
            onClick={openRecommend}
            className="mt-auto w-full text-left transition active:scale-[0.995]"
          >
            <p className="text-[11px] font-semibold tracking-wide text-white/55 uppercase">
              此刻推荐 · {recommended.occasion}
            </p>
            <h2 className="font-display mt-1.5 text-[1.55rem] leading-tight font-extrabold text-white">
              {recommended.name}
              {quickPlan ? ` · ${quickPlan.name}` : ""}
            </h2>
            <p className="mt-1.5 max-w-[34ch] text-[13px] leading-relaxed text-white/60">
              {recommended.hook}
              {quickPlan ? ` · ${quickPlan.durationMin} 分钟` : ""}
            </p>
            <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white py-2.5 pr-2.5 pl-5 text-[13px] font-semibold text-ink shadow-[0_12px_32px_-16px_rgba(0,0,0,0.45)]">
              开始练习
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white">
                <IconArrow direction="right" className="h-4 w-4" />
              </span>
            </span>
          </button>
        </div>
      </section>

      <main className="flex-1 px-5 pt-5 pb-6">
        <section className="rounded-[24px] bg-butter px-4 py-3.5">
          <label htmlFor="home-intent" className="text-[11px] font-semibold text-ink/50">
            此刻想调适什么
          </label>
          <div className="mt-2 flex items-end gap-2">
            <input
              id="home-intent"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  goWithIntent();
                }
              }}
              placeholder="比如：开完会静不下来，有十五分钟"
              className="min-h-11 min-w-0 flex-1 rounded-full bg-white/80 px-4 text-[14px] text-ink placeholder:text-ink/30 outline-none focus:ring-2 focus:ring-ink/10"
            />
            <button
              type="button"
              onClick={goWithIntent}
              disabled={!intent.trim()}
              className="min-h-11 shrink-0 rounded-full bg-ink px-4 text-[12px] font-semibold text-white disabled:opacity-35"
            >
              开始
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-ink/45">
            直接进入对话。如果提到新疗法、新鲜感或高度定制，会交给 Tuno & Friends。
          </p>
        </section>

        <section className="nf-section">
          <div className="mb-3">
            <h3 className="mb-0 text-[13px] font-semibold text-ink/70">预设场景</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-ink/45">选一个仪式，在工作与生活之间换挡。</p>
          </div>
          <div className="grid grid-cols-3 gap-x-2 gap-y-4">
            {WORK_SCENES.map((s) => {
              const now = s.id === recommendedId;
              return (
                <Link
                  key={s.id}
                  to={`/scene/${s.id}`}
                  className="flex flex-col items-center gap-1.5 py-0.5 text-center active:scale-[0.97]"
                >
                  <span
                    className={`relative h-[56px] w-[56px] overflow-hidden rounded-full shadow-[0_8px_20px_-12px_rgba(17,17,17,0.45)] ${
                      now ? "ring-2 ring-ink/80 ring-offset-2 ring-offset-[#F6F7F9]" : ""
                    }`}
                  >
                    <AbstractSceneArt sceneId={s.id} className="h-full w-full" />
                    {now && (
                      <span className="absolute right-0.5 bottom-0.5 h-2.5 w-2.5 rounded-full bg-mint ring-2 ring-white" />
                    )}
                  </span>
                  <span className="max-w-[7.5em] text-[11px] leading-tight font-semibold text-ink">{s.name}</span>
                  <span className="text-[10px] leading-tight text-ink/40">{s.occasion}</span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="nf-section">
          <div className="mb-3 flex items-baseline justify-between">
            <div>
              <h3 className="text-[13px] font-semibold text-ink/70">探索训练</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-ink/45">具体方法都可以点进去试。</p>
            </div>
            <span className="text-[11px] text-ink/40">{presets.data?.plans.length ?? "…"} 个</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {presets.data?.plans.map((p) => (
              <PlanMiniCard key={p.id} plan={p} />
            ))}
          </div>
        </section>

        <footer className="pt-6">
          <ComplianceFinePrint />
        </footer>
      </main>
    </div>
  );
}
