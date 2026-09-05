import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BRIDGE = "http://127.0.0.1:8765/health";
let child: ChildProcess | null = null;

function collectorScript(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../../collector/serial_bridge.py");
}

async function bridgeUp(): Promise<boolean> {
  try {
    const res = await fetch(BRIDGE, { signal: AbortSignal.timeout(800) });
    return res.ok;
  } catch {
    return false;
  }
}

/** 开发时拉起本机 COM 桥；已在跑则复用。BrainLink Lite 默认 COM23。 */
export async function ensureSerialBridge(): Promise<void> {
  if (await bridgeUp()) {
    console.log("[eeg] serial bridge already on :8765");
    return;
  }
  const script = collectorScript();
  if (!fs.existsSync(script)) {
    console.warn("[eeg] missing", script);
    return;
  }
  const py = process.env.PYTHON || "python";
  child = spawn(py, ["-u", script, "--port", "auto", "--baud", "57600", "--http", "8765", "--no-browser"], {
    cwd: path.dirname(script),
    stdio: "inherit",
    windowsHide: true,
  });
  child.on("exit", (code) => {
    console.warn("[eeg] serial bridge exited", code);
    child = null;
  });
}
