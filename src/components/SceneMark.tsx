import { WORK_SCENE_BY_ID, isWorkSceneId, type WorkSceneId } from "@/lib/scenes";

/** 场景几何标识：深底/浅底圆 + 色点，不用 emoji。 */
export default function SceneMark({
  sceneId,
  size = "sm",
  breathing = false,
}: {
  sceneId: WorkSceneId;
  size?: "sm" | "lg";
  breathing?: boolean;
}) {
  const visual = isWorkSceneId(sceneId) ? WORK_SCENE_BY_ID[sceneId] : WORK_SCENE_BY_ID["clock-in"];
  const dim = size === "lg" ? "h-[168px] w-[168px]" : "h-12 w-12";
  const core = size === "lg" ? "h-16 w-16" : "h-5 w-5";
  const ring = size === "lg" ? "h-28 w-28" : "h-8 w-8";

  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-full ${dim} ${
        visual.dark ? "bg-ink" : "bg-white"
      } ${breathing ? "nf-breathe" : ""} ${
        visual.dark
          ? "shadow-[0_18px_40px_-16px_rgba(17,17,17,0.55)]"
          : "shadow-[0_16px_36px_-18px_rgba(17,17,17,0.28)]"
      }`}
      aria-hidden
    >
      <span
        className={`absolute rounded-full opacity-35 ${ring}`}
        style={{ background: visual.accent }}
      />
      <span className={`relative rounded-full ${core}`} style={{ background: visual.accent }} />
    </span>
  );
}
