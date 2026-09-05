import type { WorkSceneId } from "@/lib/scenes";

const FIELD: Record<
  WorkSceneId,
  { bg: string; shape: "orb" | "rect" | "oval" | "slit" | "swirl"; glow: string }
> = {
  "clock-in": { bg: "linear-gradient(165deg, #eef6f1 0%, #d5ebe0 55%, #cfe4d4 100%)", shape: "orb", glow: "#F5E56B" },
  "post-meet": { bg: "linear-gradient(165deg, #3a3558 0%, #2a3348 100%)", shape: "rect", glow: "#B8F2C9" },
  "lunch-tide": { bg: "linear-gradient(165deg, #6b3a28 0%, #3d2218 100%)", shape: "oval", glow: "#F5C16B" },
  overload: { bg: "linear-gradient(165deg, #1c3d38 0%, #0f2422 100%)", shape: "orb", glow: "#FF6B4A" },
  "drift-back": { bg: "linear-gradient(165deg, #ece4f4 0%, #d5cce4 100%)", shape: "swirl", glow: "#B8F2C9" },
  "clock-out": { bg: "linear-gradient(165deg, #1a1814 0%, #0c0c0c 100%)", shape: "slit", glow: "#F5E56B" },
};

const RASTER: Record<WorkSceneId, string> = {
  "clock-in": "/scenes/clock-in.jpg",
  "post-meet": "/scenes/post-meet.jpg",
  "lunch-tide": "/scenes/lunch-tide.jpg",
  overload: "/scenes/overload.jpg",
  "drift-back": "/scenes/drift-back.jpg",
  "clock-out": "/scenes/clock-out.jpg",
};

/** 把六景抽象成几何光斑：不是实景照片。 */
export default function AbstractSceneArt({
  sceneId,
  className = "",
}: {
  sceneId: WorkSceneId;
  className?: string;
}) {
  const spec = FIELD[sceneId];
  const raster = RASTER[sceneId];
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: spec.bg }} aria-hidden>
      {raster ? (
        <img src={raster} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          {spec.shape === "orb" && (
            <span
              className="nf-breathe h-[62%] w-[62%] rounded-full"
              style={{
                background: `radial-gradient(circle at 42% 38%, #ffffffaa, ${spec.glow} 44%, transparent 72%)`,
                filter: "blur(10px)",
              }}
            />
          )}
          {spec.shape === "rect" && (
            <span
              className="nf-breathe h-[64%] w-[30%] rounded-[28%]"
              style={{
                background: `linear-gradient(180deg, ${spec.glow}d9, ${spec.glow}66)`,
                filter: "blur(8px)",
                boxShadow: `0 0 40px ${spec.glow}66`,
              }}
            />
          )}
          {spec.shape === "oval" && (
            <span
              className="nf-breathe h-[36%] w-[76%] rounded-full"
              style={{
                background: `radial-gradient(ellipse at 50% 45%, #fff8, ${spec.glow} 52%, transparent 78%)`,
                filter: "blur(8px)",
              }}
            />
          )}
          {spec.shape === "slit" && (
            <span
              className="h-[10%] w-[72%] rounded-full"
              style={{
                background: spec.glow,
                filter: "blur(6px)",
                boxShadow: `0 0 40px ${spec.glow}`,
              }}
            />
          )}
          {spec.shape === "swirl" && (
            <span className="relative h-[78%] w-[78%]">
              <span
                className="nf-spin-slow absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(from 40deg, transparent, ${spec.glow}bb, transparent 62%)`,
                  filter: "blur(16px)",
                }}
              />
              <span
                className="absolute top-1/2 left-1/2 h-[28%] w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ background: `${spec.glow}aa`, filter: "blur(8px)" }}
              />
            </span>
          )}
        </div>
      )}
      <span className="nf-local-grain pointer-events-none absolute inset-0 opacity-25 mix-blend-soft-light" />
    </div>
  );
}

export function AbstractPlanWash({ from, to, category }: { from: string; to: string; category: string }) {
  const shape =
    category === "breathwork"
      ? "orb"
      : category === "soundscape"
        ? "oval"
        : category === "guided_imagery"
          ? "rect"
          : category === "yoga_nidra"
            ? "slit"
            : "wave";
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
      {shape === "orb" && (
        <span
          className="pointer-events-none absolute -top-4 -right-2 h-24 w-24 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.55), transparent 68%)", filter: "blur(6px)" }}
        />
      )}
      {shape === "oval" && (
        <span
          className="pointer-events-none absolute top-1/2 right-3 h-8 w-20 -translate-y-1/2 rounded-full bg-white/35"
          style={{ filter: "blur(6px)" }}
        />
      )}
      {shape === "rect" && (
        <span
          className="pointer-events-none absolute top-3 right-5 h-14 w-8 rounded-lg bg-white/30"
          style={{ filter: "blur(5px)" }}
        />
      )}
      {shape === "slit" && (
        <span
          className="pointer-events-none absolute top-1/2 right-4 h-2 w-16 -translate-y-1/2 rounded-full bg-white/50"
          style={{ filter: "blur(3px)" }}
        />
      )}
      {shape === "wave" && (
        <span
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12 opacity-40"
          style={{
            background:
              "repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255,255,255,0.35) 8px, rgba(255,255,255,0.35) 9px)",
            maskImage: "linear-gradient(to top, black, transparent)",
          }}
        />
      )}
    </div>
  );
}
