import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { detectWorkNeed } from "./work-detect";
import { evalDir, loadJSONL } from "../../eval/load";

type WorkWindow = {
  id: string;
  label: string;
  samples: { t: number; arousal: number; focus: number; calm: number; signal?: number }[];
  expect: { need: "none" | "rest" | "focus"; sceneId: string | null; goalId: string | null };
};

describe("work-detect 10min", () => {
  it("classifies user_data tiled windows", () => {
    const file = path.join(evalDir(), "work_windows.jsonl");
    if (!fs.existsSync(file)) {
      console.warn("skip: no work_windows.jsonl (not on this eval set)");
      return;
    }
    const windows = loadJSONL<WorkWindow>(file);
    expect(windows.length).toBeGreaterThanOrEqual(8);
    let hit = 0;
    for (const w of windows) {
      const r = detectWorkNeed(w.samples, { atWork: true, minSec: 120 });
      const ok = r.need === w.expect.need;
      if (ok) hit++;
      else console.log(`miss ${w.id} label=${w.label} expect=${w.expect.need} got=${r.need} ${r.label}`);
    }
    const acc = hit / windows.length;
    console.log(`  work-detect ${hit}/${windows.length} (${(acc * 100).toFixed(0)}%)`);
    expect(acc).toBeGreaterThanOrEqual(0.75);
  });

  it("does not notify inside cooldown", () => {
    const samples = Array.from({ length: 300 }, (_, t) => ({
      t,
      arousal: 72,
      focus: 58,
      calm: 32,
    }));
    const hot = detectWorkNeed(samples, { sinceLastNotifySec: 60 });
    expect(hot.need).toBe("rest");
    expect(hot.shouldNotify).toBe(false);
  });

  it("rejects short windows", () => {
    const samples = Array.from({ length: 40 }, (_, t) => ({
      t,
      arousal: 70,
      focus: 55,
      calm: 30,
    }));
    const r = detectWorkNeed(samples);
    expect(r.need).toBe("insufficient");
    expect(r.shouldNotify).toBe(false);
  });
});
