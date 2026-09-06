/**
 * 跨页面的真机数据总线。
 * 连接页挂上串口/BLE 后，校准页继续读同一路样本，而不是再走模拟曲线。
 */

export type DeviceFamily = "brainlink" | "neurosky" | "muse" | "neurosity" | "emotiv" | "openbci" | "unknown";

export interface ScannedDevice {
  port: string;
  description: string;
  hwid: string;
  mac: string;
  bluetoothName: string;
  family: DeviceFamily | string;
  role: string;
  preferredLite: boolean;
  eegLikely: boolean;
  score: number;
}

export interface LiveBio {
  arousal: number;
  focus: number;
  calm: number;
  attention: number | null;
  meditation: number | null;
  signal: number | null;
  at: number;
}

export type LiveSource = "serial" | "ble" | "webserial" | "demo";

type Listener = (bio: LiveBio) => void;

const KEY = "nf-live-device";

let bleHold: { disconnect: () => void } | null = null;
let source: LiveSource | null = null;
let deviceName = "";
let last: LiveBio | null = null;
let lastRaw: number[] = [];
let serialTimer: number | null = null;
const listeners = new Set<Listener>();
const rawListeners = new Set<(raw: number[]) => void>();

export function serialBridgeBase(): string {
  return "/serial-bridge";
}

export function getLiveSnapshot(): {
  source: LiveSource | null;
  deviceName: string;
  last: LiveBio | null;
} {
  return { source, deviceName, last };
}

export function isLiveHardware(): boolean {
  return source === "serial" || source === "ble" || source === "webserial";
}

export function subscribeLive(cb: Listener): () => void {
  listeners.add(cb);
  if (last) cb(last);
  return () => listeners.delete(cb);
}

export function subscribeRaw(cb: (raw: number[]) => void): () => void {
  rawListeners.add(cb);
  if (lastRaw.length) cb(lastRaw);
  return () => rawListeners.delete(cb);
}

export function getLiveRaw(): number[] {
  return lastRaw;
}

/** 校准页挂载时把 session 里的真机连接拉回来，并继续轮询串口桥。 */
export function resumeLiveSession(): LiveSource | null {
  if (source === "serial" || source === "ble" || source === "webserial") return source;
  try {
    const stored = sessionStorage.getItem(KEY);
    if (!stored) return source;
    const j = JSON.parse(stored) as {
      source?: LiveSource;
      deviceName?: string;
      last?: LiveBio;
    };
    if (j.source === "serial" || j.source === "ble" || j.source === "webserial") {
      source = j.source;
      deviceName = j.deviceName ?? "";
      if (j.last) last = j.last;
      if (j.source === "serial" && serialTimer == null) {
        void startSerialLive();
      }
    } else if (j.source === "demo") {
      source = "demo";
      deviceName = j.deviceName ?? "演示信号";
      if (j.last) last = j.last;
    }
  } catch {
    /* ignore */
  }
  return source;
}

function persist() {
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ source, deviceName, last, at: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

export function restoreLiveMeta(): { source: LiveSource | null; deviceName: string } {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return { source: null, deviceName: "" };
    const j = JSON.parse(raw) as { source?: LiveSource; deviceName?: string };
    return { source: j.source ?? null, deviceName: j.deviceName ?? "" };
  } catch {
    return { source: null, deviceName: "" };
  }
}

function emit(bio: LiveBio) {
  last = bio;
  persist();
  listeners.forEach((cb) => cb(bio));
}

export function metricToBio(m: {
  attention?: number | null;
  meditation?: number | null;
  signal?: number | null;
  at?: number;
}): LiveBio {
  const attention = m.attention ?? null;
  const meditation = m.meditation ?? null;
  const signal = m.signal ?? null;
  const focus = attention ?? 50;
  const calm = meditation ?? 50;
  const contactPenalty = signal != null && signal >= 150 ? 12 : 0;
  const arousal = Math.max(8, Math.min(97, Math.round(100 - calm * 0.85 + contactPenalty)));
  return {
    arousal,
    focus,
    calm,
    attention,
    meditation,
    signal,
    at: m.at ?? Date.now(),
  };
}

function stopSerialPoll() {
  if (serialTimer != null) {
    window.clearInterval(serialTimer);
    serialTimer = null;
  }
}

export function stopLive(): void {
  stopSerialPoll();
  bleHold?.disconnect();
  bleHold = null;
  source = null;
  deviceName = "";
  last = null;
  persist();
}

export async function scanEegDevices(): Promise<{
  devices: ScannedDevice[];
  preferredPorts: string[];
  bridgeError?: string;
  livePort?: string;
}> {
  try {
    const res = await fetch(`${serialBridgeBase()}/devices`);
    if (!res.ok) throw new Error(`bridge ${res.status}`);
    const j = (await res.json()) as {
      devices?: ScannedDevice[];
      preferredPorts?: string[];
      bridge?: { port?: string; error?: string };
    };
    return {
      devices: j.devices ?? [],
      preferredPorts: j.preferredPorts ?? ["COM23", "COM22"],
      livePort: j.bridge?.port,
      bridgeError: j.bridge?.error || undefined,
    };
  } catch {
    return {
      devices: [],
      preferredPorts: ["COM23", "COM22"],
      bridgeError: "本机串口桥未启动（BrainLink Lite 走 COM，不是 Web Bluetooth）",
    };
  }
}

export async function startSerialLive(port?: string): Promise<{ name: string; port: string }> {
  const requested = (port || "COM23").toUpperCase();
  const order = [
    requested,
    ...["COM23", "COM22"].filter((p) => p !== requested),
    "auto",
  ];
  const peek = async () => {
    const res = await fetch(`${serialBridgeBase()}/latest`);
    return (await res.json()) as {
      ok?: boolean;
      port?: string;
      baud?: number;
      error?: string;
      bytes?: number;
      packets?: number;
      bytes_delta?: number;
      metric?: { attention?: number | null; meditation?: number | null; signal?: number | null; at?: number };
      raw_tail?: number[];
    };
  };

  const ingest = (j: {
    raw_tail?: number[];
    metric?: { attention?: number | null; meditation?: number | null; signal?: number | null; at?: number };
  }) => {
    if (Array.isArray(j.raw_tail) && j.raw_tail.length) {
      lastRaw = j.raw_tail;
      rawListeners.forEach((cb) => cb(lastRaw));
    }
    if (j.metric) emit(metricToBio(j.metric));
  };

  const attach = (j: {
    port: string;
    baud?: number;
    raw_tail?: number[];
    metric?: { attention?: number | null; meditation?: number | null; signal?: number | null; at?: number };
  }) => {
    source = "serial";
    deviceName = `BrainLink Lite · ${j.port} @${j.baud ?? 57600}`;
    ingest(j);
    persist();
    if (!serialTimer) {
      serialTimer = window.setInterval(async () => {
        try {
          ingest(await peek());
        } catch {
          /* 下一拍 */
        }
      }, 120);
    }
  };

  const already = await peek().catch(() => null);
  if (already?.ok && already.port && (already.bytes_delta ?? 0) > 0) {
    attach(already as { port: string; baud?: number; raw_tail?: number[]; metric?: typeof already.metric });
    return { name: deviceName, port: already.port };
  }

  // 桥若卡在 switching port（COM23/COM22 互顶），先用 auto 解开
  if (already?.error === "switching port") {
    await fetch(`${serialBridgeBase()}/api/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ port: "auto", baud: 57600 }),
    }).catch(() => null);
    await new Promise((r) => setTimeout(r, 600));
  }

  stopSerialPoll();
  let lastErr = "没有读到 ThinkGear 数据。请确认头环已开机并配对，本机桥默认 COM23。";
  for (const target of order) {
    await fetch(`${serialBridgeBase()}/api/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ port: target, baud: 57600 }),
    }).catch(() => null);

    let baseBytes: number | null = null;
    for (let i = 0; i < 50; i++) {
      const j = await peek().catch(() => null);
      if (!j) {
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }
      const livePort = (j.port || "").toUpperCase();
      const want = target.toUpperCase();
      const portMatch = want === "AUTO" || livePort === want;
      const streaming = (j.bytes_delta ?? 0) > 0 || (baseBytes != null && (j.bytes ?? 0) > baseBytes);

      if (j.ok && livePort && (portMatch || streaming)) {
        attach(j as { port: string; baud?: number; raw_tail?: number[]; metric?: typeof j.metric });
        if (baseBytes == null) baseBytes = j.bytes ?? 0;
        if (streaming) return { name: deviceName, port: j.port! };
      }
      if (j.error && j.error !== "switching port") lastErr = j.error;
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  // 最后再试一次 auto，避免请求口把桥锁死在 switching
  await fetch(`${serialBridgeBase()}/api/open`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ port: "auto", baud: 57600 }),
  }).catch(() => null);
  throw new Error(lastErr);
}

function attachBleLive(
  name: string,
  sample: { attention: number | null; meditation: number | null; signal: number | null; at: number },
) {
  source = "ble";
  deviceName = name;
  emit(metricToBio(sample));
}

export function holdBleConnection(conn: { name: string; onSample: (cb: (s: { attention: number | null; meditation: number | null; signal: number | null; at: number }) => void) => () => void; disconnect: () => void }) {
  bleHold?.disconnect();
  const off = conn.onSample((s) => attachBleLive(conn.name, s));
  bleHold = {
    disconnect() {
      off();
      conn.disconnect();
    },
  };
  source = "ble";
  deviceName = conn.name;
  persist();
}

export function holdWebSerialConnection(conn: {
  name: string;
  onSample: (cb: (s: { attention: number | null; meditation: number | null; signal: number | null; at: number }) => void) => () => void;
  disconnect: () => void;
}) {
  bleHold?.disconnect();
  const off = conn.onSample((s) => {
    source = "webserial";
    deviceName = conn.name;
    emit(metricToBio(s));
  });
  bleHold = {
    disconnect() {
      off();
      conn.disconnect();
    },
  };
  source = "webserial";
  deviceName = conn.name;
  persist();
}

export function startDemoLive(name = "演示信号"): void {
  stopSerialPoll();
  source = "demo";
  deviceName = name;
  emit({
    arousal: 62,
    focus: 55,
    calm: 50,
    attention: 55,
    meditation: 50,
    signal: 0,
    at: Date.now(),
  });
}

/**
 * 演示态手动调三通道。真机连接时拒绝写入。
 * 改 focus/calm 时按 live 公式重算 arousal；也可单独覆写 arousal。
 */
export function setDemoBio(patch: {
  focus?: number;
  calm?: number;
  arousal?: number;
}): boolean {
  if (source === "serial" || source === "ble" || source === "webserial") return false;
  if (source !== "demo") startDemoLive();
  const focus = Math.round(patch.focus ?? last?.focus ?? 55);
  const calm = Math.round(patch.calm ?? last?.calm ?? 50);
  const arousal =
    patch.arousal != null
      ? Math.round(patch.arousal)
      : Math.max(8, Math.min(97, Math.round(100 - calm * 0.85)));
  emit({
    arousal: Math.max(0, Math.min(100, arousal)),
    focus: Math.max(0, Math.min(100, focus)),
    calm: Math.max(0, Math.min(100, calm)),
    attention: Math.max(0, Math.min(100, focus)),
    meditation: Math.max(0, Math.min(100, calm)),
    signal: 0,
    at: Date.now(),
  });
  return true;
}

/** 是否可用演示滑条（未接真机） */
export function canAdjustDemoBio(): boolean {
  return source !== "serial" && source !== "ble" && source !== "webserial";
}

export function pickDefaultDevice(devices: ScannedDevice[], preferredPorts: string[]): ScannedDevice | null {
  const order = preferredPorts.length ? preferredPorts : ["COM23", "COM22"];
  for (const port of order) {
    const hit = devices.find((d) => d.port.toUpperCase() === port.toUpperCase());
    if (hit) return hit;
  }
  const lite = devices.find((d) => d.family === "brainlink");
  if (lite) return lite;
  const eeg = devices.find((d) => d.eegLikely);
  return eeg ?? devices[0] ?? null;
}

export function familyLabel(family: string): string {
  const map: Record<string, string> = {
    brainlink: "BrainLink",
    neurosky: "NeuroSky / TGAM",
    muse: "Muse",
    neurosity: "Neurosity",
    emotiv: "Emotiv",
    openbci: "OpenBCI",
    unknown: "未识别",
  };
  return map[family] ?? family;
}
