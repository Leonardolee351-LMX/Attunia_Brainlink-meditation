/**
 * 从 eval/user_data 真机 CSV 生成 eval_No.2 的 10 分钟检测窗，并承接 eval_No.1 主集。
 *
 *   node eval/build_eval_no2.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const userData = path.join(root, "eval", "user_data");
const src1 = path.join(root, "eval", "eval_No.1", "eval");
const out = path.join(root, "eval", "eval_No.2", "eval");

const WINDOW_SEC = 600;

function parseCsv(file) {
  const text = fs.readFileSync(file, "utf8").trim().split(/\r?\n/);
  const headers = text[0].split(",");
  return text.slice(1).map((line) => {
    const cols = line.split(",");
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i];
    });
    return row;
  });
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function toLive(att, med) {
  const focus = clamp(Number(att) || 50, 0, 100);
  const calm = clamp(Number(med) || 50, 0, 100);
  const arousal = clamp(Math.round(100 - calm * 0.85), 8, 97);
  return { arousal, focus, calm };
}

/** 把短标签窗铺成约 10 分钟，带轻微抖动（诚实标注 synthetic_tile） */
function tileToWindow(points, windowSec = WINDOW_SEC) {
  if (points.length === 0) return [];
  const outPts = [];
  let t = 0;
  let i = 0;
  while (t < windowSec) {
    const src = points[i % points.length];
    const jitter = (n) => clamp(Math.round(n + ((i * 17) % 7) - 3), 0, 100);
    const live = toLive(jitter(src.focus), jitter(src.calm));
    outPts.push({ t, ...live, signal: src.signal ?? 0 });
    t += 1;
    i += 1;
  }
  return outPts;
}

function expectForLabel(label) {
  if (label === "overload") {
    return { need: "rest", sceneId: "overload", goalId: "calm" };
  }
  if (label === "drowsy") {
    return { need: "rest", sceneId: "lunch-tide", goalId: "calm" };
  }
  if (label === "focused") {
    return { need: "none", sceneId: null, goalId: null };
  }
  // baseline：工位低专注 → 走神回笼
  return { need: "focus", sceneId: "drift-back", goalId: "focus" };
}

function copyTree(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from)) {
    const a = path.join(from, name);
    const b = path.join(to, name);
    if (fs.statSync(a).isDirectory()) copyTree(a, b);
    else fs.copyFileSync(a, b);
  }
}

fs.rmSync(out, { recursive: true, force: true });
copyTree(src1, out);

const windows = [];
const files = fs.readdirSync(userData).filter((f) => f.endsWith("_eeg.csv")).sort();

for (const file of files) {
  const rows = parseCsv(path.join(userData, file)).filter(
    (r) => r.attention !== "" && r.meditation !== "",
  );
  if (rows.length < 10) continue;
  const label = rows[0].label;
  const labelZh = rows[0].label_zh || label;
  const native = rows.map((r, idx) => {
    const live = toLive(r.attention, r.meditation);
    return {
      t: Math.round(Number(r.elapsed_ms) / 1000) || idx,
      ...live,
      signal: Number(r.signal) || 0,
    };
  });
  // 归一到从 0 起的相对秒
  const t0 = native[0].t;
  const normalized = native.map((s) => ({ ...s, t: s.t - t0 }));

  const tiled = tileToWindow(
    normalized.map((s) => ({ focus: s.focus, calm: s.calm, signal: s.signal })),
  );
  const expect = expectForLabel(label);
  windows.push({
    id: `ud-${file.replace(/_eeg\.csv$/, "")}`,
    sourceFile: `user_data/${file}`,
    username: rows[0].username,
    label,
    labelZh,
    nativeSec: normalized[normalized.length - 1].t - normalized[0].t + 1,
    sampleCount: tiled.length,
    samples: tiled,
    expect,
    meta: {
      source: "user_data_tiled_10min",
      note: "短真机标签窗铺成 600s，供 10 分钟检测机制评测；非连续 10 分钟实录。",
    },
  });
}

fs.writeFileSync(
  path.join(out, "work_windows.jsonl"),
  windows.map((w) => JSON.stringify(w)).join("\n") + "\n",
  "utf8",
);

fs.writeFileSync(
  path.join(out, "REPORT.md"),
  `# eval_No.2

- 承接 eval_No.1 的 states / dialog / adversarial / timeseries。
- 新增 \`work_windows.jsonl\`：由 \`eval/user_data\` 真机 CSV（focused / overload / drowsy / baseline）铺成 10 分钟窗。
- 用途：评测 \`detectWorkNeed\`（超载→冥想减压，走神→专注回笼）。
- 生成：\`node eval/build_eval_no2.mjs\`

共 ${windows.length} 条工作窗。
`,
  "utf8",
);

console.log(`Wrote ${windows.length} work windows → ${path.relative(root, out)}`);
