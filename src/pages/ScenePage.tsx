import { Link, Navigate, useNavigate, useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { WORK_SCENE_BY_ID, isWorkSceneId, resolveWorkSceneId } from "@/lib/scenes";
import AbstractSceneArt from "@/components/AbstractSceneArt";
import { pathForScene } from "@/lib/scene-paths";
import { planCoverSrc, planCrop } from "@/lib/plan-covers";
import type { TrainingPlan } from "@contracts/agents";
import type { WorkSceneId } from "@/lib/scenes";
import { IconArrow } from "@/components/icons/IconArrow";
import { PHONE_BLEED, PHONE_SAFE_TOP } from "@/lib/onboarding-layout";

const SHIFT: Record<string, string> = {
  down: "↓",
  up: "↑",
  keep: "=",
};

/** 头图用路径上的训练封面：主模块全幅，其余叠角，与下方路径一一对应。 */
function ScenePathHero({
  sceneId,
  primaryId,
  planIds,
}: {
  sceneId: WorkSceneId;
  primaryId: string | undefined;
  planIds: string[];
}) {
  const heroId = primaryId && planIds.includes(primaryId) ? primaryId : planIds[0];
  const extras = planIds.filter((id) => id !== heroId).slice(0, 3);

  if (!heroId) {
    return <AbstractSceneArt sceneId={sceneId} className="absolute inset-0 h-full w-full" />;
  }

  return (
    <div className="absolute inset-0 bg-ink" aria-hidden>
      <img
        src={planCoverSrc(heroId)}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: planCrop(heroId) }}
      />
      {extras.length > 0 && (
        <div className="absolute top-20 right-4 flex flex-col gap-2 sm:top-[56px]">
          {extras.map((id, i) => (
            <span
              key={id}
              className="relative block h-14 w-14 overflow-hidden rounded-[16px] shadow-[0_10px_24px_-10px_rgba(0,0,0,0.55)] ring-1 ring-white/25"
              style={{ transform: `rotate(${(i - 1) * 4}deg)` }}
            >
              <img
                src={planCoverSrc(id)}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: planCrop(id) }}
              />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ScenePage() {
  const { sceneId } = useParams();
  const navigate = useNavigate();
  const presets = trpc.agent.presets.useQuery();
  const resolved = resolveWorkSceneId(sceneId);

  if (!resolved) {
    return <Navigate to="/home" replace />;
  }

  if (sceneId && !isWorkSceneId(sceneId) && resolved) {
    return <Navigate to={`/scene/${resolved}`} replace />;
  }

  const scene = WORK_SCENE_BY_ID[resolved];
  const path = pathForScene(scene.id);
  const pathPlanIds = path?.map((s) => s.planId) ?? scene.relatedPlanIds;
  const modules = pathPlanIds
    .map((id) => presets.data?.plans.find((p) => p.id === id))
    .filter((p): p is TrainingPlan => !!p);

  const primaryId = path?.find((s) => s.primary)?.planId ?? scene.planId;
  const primaryPlan = modules.find((p) => p.id === primaryId) ?? modules[0];
  const totalMin = modules.reduce((n, p) => n + p.durationMin, 0);

  const enter = (planId: string) =>
    navigate(`/session/${planId}`, { state: { sceneId: scene.id } });

  const isOverload = scene.id === "overload";
  const displayName = isOverload ? "大脑超载" : scene.name;
  const blurb = isOverload
    ? "太多窗口同时开着。先落地，回到此时此地——不用再上一层认知任务。"
    : scene.description;

  return (
    <div className="flex min-h-full flex-col bg-cream">
      {/* 全幅头图顶满 Island */}
      <section className={`${PHONE_BLEED} bg-ink`}>
        <div className="relative min-h-[min(48vh,420px)] w-full flex-1">
          <ScenePathHero
            sceneId={scene.id}
            primaryId={primaryId}
            planIds={pathPlanIds}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(12,12,14,0.28) 0%, transparent 38%, rgba(12,12,14,0.55) 72%, rgba(12,12,14,0.82) 100%)",
            }}
            aria-hidden
          />

          <div className={`absolute inset-x-0 top-0 z-10 px-4 ${PHONE_SAFE_TOP}`}>
            <Link
              to="/home"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-ink shadow-[0_8px_24px_-14px_rgba(17,17,17,0.45)]"
              aria-label="返回首页"
            >
              <IconArrow direction="left" />
            </Link>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-10 flex items-end gap-3 px-5 pb-5 pt-16">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium tracking-wide text-white/65">{scene.occasion}</p>
              <h1 className="font-display mt-1 text-[1.75rem] leading-[1.12] font-extrabold text-white">
                {displayName}
              </h1>
              {isOverload && (
                <p className="mt-0.5 text-[12px] font-semibold text-white/45">目录名 · 超载减负</p>
              )}
              <p className="mt-2 max-w-[28ch] text-[13px] leading-relaxed text-white/75">{blurb}</p>
            </div>
            <button
              type="button"
              disabled={!primaryPlan}
              onClick={() => primaryPlan && enter(primaryPlan.id)}
              className="mb-0.5 shrink-0 rounded-full bg-white px-4 py-3 text-[13px] font-semibold text-ink shadow-[0_12px_28px_-12px_rgba(0,0,0,0.45)] transition active:scale-[0.98] disabled:opacity-40"
            >
              进入训练
            </button>
          </div>
        </div>
      </section>

      <div className="flex-1 px-5 pt-4 pb-6">
      {/* 元信息：夹在头图与场景路径之间 */}
      <p className="text-[12px] leading-relaxed text-ink/40">
        唤醒 {SHIFT[scene.desiredShift.arousal]} · 专注 {SHIFT[scene.desiredShift.focus]} · 平静{" "}
        {SHIFT[scene.desiredShift.calm]}
        {modules.length > 0 ? ` · 路径 ${modules.length} 步 · 约 ${totalMin} 分钟` : ""}
      </p>

      <hr className="my-5 border-0 border-t border-ink/10" />

      <section>
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <h2 className="text-[13px] font-semibold text-ink/70">
            {isOverload ? "着陆路径" : "场景路径"}
          </h2>
          <span className="text-[11px] text-ink/35">按需选一步，也可顺着走</span>
        </div>
        {isOverload && (
          <p className="mb-4 max-w-[40ch] text-[12px] leading-relaxed text-ink/45">
            主方法是感官着陆。身体仍紧用肌肉放松；心口仍热用 4-7-8；念头停不下来再去安全岛。
          </p>
        )}

        <ol className="mt-2">
          {modules.map((plan, i) => {
            const step = path?.find((s) => s.planId === plan.id);
            const isPrimary = step?.primary || plan.id === primaryId;
            return (
              <li key={plan.id}>
                <button
                  type="button"
                  onClick={() => enter(plan.id)}
                  className="flex w-full items-center gap-3 py-3.5 text-left transition active:scale-[0.99]"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                      isPrimary ? "bg-[#FF6B4A] text-white" : "bg-ink/8 text-ink/55"
                    }`}
                    style={
                      isPrimary && !isOverload
                        ? { background: scene.accent, color: scene.dark ? "#F6F7F9" : "#111" }
                        : undefined
                    }
                  >
                    {i + 1}
                  </span>
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[14px] bg-ink">
                    <img
                      src={planCoverSrc(plan.id)}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{
                        objectPosition: planCrop(plan.id),
                        transform: "scale(1.25)",
                        transformOrigin: planCrop(plan.id),
                      }}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="font-display truncate text-[15px] font-bold text-ink">
                        {plan.name}
                      </span>
                      {isPrimary && (
                        <span className="shrink-0 text-[10px] font-semibold tracking-wide text-[#FF6B4A]">
                          建议
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-ink/45">
                      {step ? (
                        <>
                          <span className="font-medium text-ink/55">{step.role}</span>
                          {" · "}
                          {step.when}
                        </>
                      ) : (
                        plan.subtitle
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12px] tabular-nums text-ink/35">
                    {plan.durationMin}′
                  </span>
                </button>
                {i < modules.length - 1 && <div className="ml-4 h-px bg-ink/8" />}
              </li>
            );
          })}
        </ol>
      </section>

      <p className="mt-5 pb-2 text-center text-[11px] leading-relaxed text-ink/35">
        训练里可用上一首 / 下一首在路径间切换，不必一次做完。
      </p>
      </div>
    </div>
  );
}
