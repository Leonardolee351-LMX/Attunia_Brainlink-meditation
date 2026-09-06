/**
 * 工作室画板左侧三栏（贴窗口最左 24px）：开屏入口 / 提醒机制 / 模拟脑电。
 * 不进手机内 UI。
 */
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { IconArrow } from "@/components/icons/IconArrow";
import {
  canAdjustDemoBio,
  getLiveSnapshot,
  isLiveHardware,
  setDemoBio,
  startDemoLive,
  subscribeLive,
  type LiveBio,
} from "@/lib/live-device";
import { WORK_SCENES } from "@/lib/scenes";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import {
  publishWorkReminder,
  shortReminderLine,
} from "@/lib/work-reminder-bus";

const CASES: {
  id: string;
  title: string;
  blurb: string;
  focus: number;
  calm: number;
  expect: string;
}[] = [
  {
    id: "overload",
    title: "认知超负荷",
    blurb: "注意力还在硬撑，平静塌陷、唤醒偏高",
    focus: 55,
    calm: 34,
    expect: "→ 冥想减压 · 超载减负",
  },
  {
    id: "wander",
    title: "工作走神",
    blurb: "近窗大量落在低专注区，像在工位上漂着",
    focus: 22,
    calm: 48,
    expect: "→ 专注回笼 · 摸鱼回笼",
  },
  {
    id: "focused",
    title: "深度专注带",
    blurb: "注意力稳定在专注带，不必打断",
    focus: 76,
    calm: 42,
    expect: "→ 不提醒",
  },
];

type PanelKind = "detect" | "sim" | null;

function tileSamples(bio: { arousal: number; focus: number; calm: number }, sec = 180) {
  return Array.from({ length: sec }, (_, t) => {
    const wobble = ((t * 13) % 7) - 3;
    return {
      t,
      arousal: Math.max(0, Math.min(100, Math.round(bio.arousal + wobble * 0.4))),
      focus: Math.max(0, Math.min(100, Math.round(bio.focus + wobble * 0.5))),
      calm: Math.max(0, Math.min(100, Math.round(bio.calm - wobble * 0.3))),
    };
  });
}

function RailCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[22px] bg-white shadow-[0_12px_32px_-14px_rgba(17,17,17,0.28)] ring-1 ring-ink/5 ${className}`}
    >
      {children}
    </div>
  );
}

export default function StudioSideRail({ showSplash }: { showSplash: boolean }) {
  const detect = trpc.agent.detectWorkNeed.useMutation();
  const recordReminder = trpc.agent.recordWorkReminder.useMutation();
  const [panel, setPanel] = useState<PanelKind>(null);
  const [bio, setBio] = useState<LiveBio | null>(() => getLiveSnapshot().last);
  const [hardware, setHardware] = useState(() => isLiveHardware());

  useEffect(() => {
    return subscribeLive((b) => {
      setBio(b);
      setHardware(isLiveHardware());
    });
  }, []);

  const demoOk = canAdjustDemoBio();

  const toggle = (kind: PanelKind) => {
    setPanel((cur) => (cur === kind ? null : kind));
  };

  const applyCase = (c: (typeof CASES)[number]) => {
    if (!demoOk) return;
    startDemoLive("演示信号");
    setDemoBio({ focus: c.focus, calm: c.calm });
  };

  const triggerReminder = async (preset?: (typeof CASES)[number]) => {
    const snap = preset
      ? {
          arousal: Math.max(8, Math.min(97, Math.round(100 - preset.calm * 0.85))),
          focus: preset.focus,
          calm: preset.calm,
        }
      : bio
        ? { arousal: bio.arousal, focus: bio.focus, calm: bio.calm }
        : { arousal: 70, focus: 55, calm: 34 };

    if (demoOk) {
      startDemoLive("演示信号");
      setDemoBio({ focus: snap.focus, calm: snap.calm, arousal: snap.arousal });
    }

    const result = await detect.mutateAsync({
      samples: tileSamples(snap, 180),
      atWork: true,
      sinceLastNotifySec: 3600,
    });

    const scene = result.sceneId
      ? WORK_SCENES.find((s) => s.id === result.sceneId)
      : null;
    const sceneName = scene?.name ?? null;
    const line = shortReminderLine({
      need: result.need,
      label: result.label,
      sceneName,
    });

    // 收起侧栏，避免挡住手机框内信息条
    setPanel(null);
    publishWorkReminder({
      need: result.need,
      label: result.label,
      line,
      planId: result.planId,
      sceneId: result.sceneId,
      sceneName,
    });

    // 异常态才落盘；平稳/不足也记一条便于回放演示
    void recordReminder.mutateAsync({
      need: result.need,
      label: result.label,
      line,
      sceneId: result.sceneId,
      planId: result.planId,
      source: "studio",
    });
  };

  return (
    <>
      <aside
        className="pointer-events-auto fixed top-[52px] left-6 z-[70] hidden w-[72px] flex-col gap-3 sm:flex"
        aria-label="工作室画板侧栏"
      >
        {showSplash ? (
          <RailCard className="transition hover:bg-mint active:scale-[0.98]">
            <Link
              to="/"
              className="flex flex-col items-center gap-1.5 px-2 py-3 text-ink"
              title="回到开屏页"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white">
                <IconArrow direction="left" className="h-4 w-4" />
              </span>
              <span className="max-w-[4.5rem] text-center text-[11px] leading-snug font-semibold">
                开屏页
              </span>
            </Link>
          </RailCard>
        ) : (
          <div className="h-[76px]" aria-hidden />
        )}

        <RailCard>
          <button
            type="button"
            onClick={() => toggle("detect")}
            className={`flex w-full flex-col items-center gap-1.5 px-2 py-3 text-ink transition hover:bg-mint/60 ${
              panel === "detect" ? "bg-mint/40" : ""
            }`}
            title="提醒状态的触发机制"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF6B4A]/15 text-[15px] font-bold text-[#FF6B4A]">
              !
            </span>
            <span className="max-w-[4.5rem] text-center text-[11px] leading-snug font-semibold">
              提醒机制
            </span>
          </button>
        </RailCard>

        <RailCard>
          <button
            type="button"
            onClick={() => {
              if (!demoOk && hardware) return;
              if (demoOk && !getLiveSnapshot().source) startDemoLive();
              toggle("sim");
            }}
            className={`flex w-full flex-col items-center gap-1.5 px-2 py-3 text-ink transition ${
              demoOk ? "hover:bg-butter/80" : "cursor-not-allowed opacity-45"
            } ${panel === "sim" ? "bg-butter/50" : ""}`}
            title={demoOk ? "调节模拟脑电" : "真机连接中，不可调模拟值"}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/8 text-[13px] font-semibold">
              EEG
            </span>
            <span className="max-w-[4.5rem] text-center text-[11px] leading-snug font-semibold">
              模拟脑电
            </span>
          </button>
        </RailCard>
      </aside>

      {panel === "detect" && (
        <div className="pointer-events-auto fixed top-[52px] left-[108px] z-[70] hidden max-h-[min(780px,calc(100dvh-4rem))] w-[min(320px,calc(100vw-140px))] overflow-y-auto rounded-[24px] bg-white p-4 shadow-[0_20px_48px_-20px_rgba(17,17,17,0.35)] ring-1 ring-ink/8 sm:block">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] tracking-[0.14em] text-ink/40 uppercase">Work detect · 10 min</p>
              <h2 className="font-display mt-1 text-lg font-extrabold text-ink">提醒触发机制</h2>
            </div>
            <button
              type="button"
              className="rounded-full px-2 py-1 text-xs text-ink/45 hover:bg-ink/5"
              onClick={() => setPanel(null)}
            >
              收起
            </button>
          </div>

          <p className="mt-2 text-[12px] leading-relaxed text-ink/55">
            不以秒级尖峰打扰。看最近 <strong className="text-ink">10 分钟</strong>
            聚合：超载 → 冥想减压；走神 → 专注回笼。机内顶部信息条约 5 秒；可关、可跳训练。有效跨度不足 2 分钟不提醒；冷静期 30 分钟。
          </p>

          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-semibold text-ink/70">判定 → 建议</p>
            <ul className="space-y-1.5 text-[11px] leading-relaxed text-ink/60">
              <li className="rounded-xl bg-[#FFF1EC] px-3 py-2">
                <span className="font-semibold text-[#FF6B4A]">认知超负荷</span>
                ：唤醒偏高 + 平静偏低 + 注意力仍在线 →「超载减负」
              </li>
              <li className="rounded-xl bg-[#EEF8F1] px-3 py-2">
                <span className="font-semibold text-ink">工作走神</span>
                ：大量低专注且非困倦关机 →「摸鱼回笼」
              </li>
              <li className="rounded-xl bg-[#F4F1EA] px-3 py-2">
                <span className="font-semibold text-ink">困倦走低</span>
                ：极低专注 + 高平静 → 短恢复
              </li>
              <li className="rounded-xl bg-ink/[0.04] px-3 py-2">深度专注带 → 不打扰</li>
            </ul>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-semibold text-ink/70">案例演示（点选写入模拟脑电）</p>
            {CASES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => applyCase(c)}
                disabled={!demoOk}
                className="w-full rounded-xl border border-ink/8 px-3 py-2.5 text-left transition hover:border-ink/20 hover:bg-cream disabled:opacity-40"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[12px] font-semibold text-ink">{c.title}</span>
                  <span className="text-[10px] text-ink/40">{c.expect}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-ink/50">{c.blurb}</p>
                <p className="mt-1 font-mono text-[10px] text-ink/35">
                  focus {c.focus} · calm {c.calm} · arousal ~
                  {Math.round(100 - c.calm * 0.85)}
                </p>
              </button>
            ))}
          </div>

          <Button
            type="button"
            className="mt-4 w-full rounded-full bg-ink text-white hover:bg-ink/90"
            disabled={detect.isPending}
            onClick={() => void triggerReminder()}
          >
            {detect.isPending ? "判定中…" : "触发机内提醒（当前模拟值）"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="mt-2 w-full rounded-full"
            disabled={detect.isPending}
            onClick={() => void triggerReminder(CASES[0])}
          >
            演示：超负荷提醒
          </Button>
        </div>
      )}

      {panel === "sim" && (
        <div className="pointer-events-auto fixed top-[220px] left-[108px] z-[70] hidden w-[min(280px,calc(100vw-140px))] rounded-[24px] bg-white p-4 shadow-[0_20px_48px_-20px_rgba(17,17,17,0.35)] ring-1 ring-ink/8 sm:block">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] tracking-[0.14em] text-ink/40 uppercase">Demo bio</p>
              <h2 className="font-display mt-1 text-base font-extrabold text-ink">模拟脑电调节</h2>
            </div>
            <button
              type="button"
              className="rounded-full px-2 py-1 text-xs text-ink/45 hover:bg-ink/5"
              onClick={() => setPanel(null)}
            >
              收起
            </button>
          </div>
          {!demoOk ? (
            <p className="mt-3 text-[11px] leading-relaxed text-ink/45">
              当前为真机数据源，模拟滑条已锁定。断开头环或改用演示信号后可调。
            </p>
          ) : (
            <>
              <p className="mt-2 text-[10px] leading-relaxed text-ink/40">
                实机演示若走预制模拟数据（非真机），可在此调节。改专注/平静后自动重算唤醒。
              </p>
              <SimSlider
                label="Focus 专注"
                value={bio?.focus ?? 55}
                onChange={(v) => setDemoBio({ focus: v })}
              />
              <SimSlider
                label="Calm 平静"
                value={bio?.calm ?? 50}
                onChange={(v) => setDemoBio({ calm: v })}
              />
              <SimSlider
                label="Arousal 唤醒"
                value={bio?.arousal ?? 62}
                onChange={(v) => setDemoBio({ arousal: v })}
              />
              <button
                type="button"
                className="mt-3 text-[11px] font-semibold text-ink/55 underline-offset-2 hover:text-ink hover:underline"
                onClick={() => startDemoLive()}
              >
                重置为默认演示信号
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

function SimSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mt-3">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[11px] text-ink/55">{label}</span>
        <span className="font-display text-sm font-semibold text-ink">{Math.round(value)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-ink"
      />
    </div>
  );
}
