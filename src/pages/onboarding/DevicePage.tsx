import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  BandConnectError,
  connectBrainLink,
  connectBrainLinkWebSerial,
  isBluetoothAvailable,
  isWebSerialAvailable,
} from "@/lib/neuroband";
import {
  familyLabel,
  getLiveSnapshot,
  holdBleConnection,
  holdWebSerialConnection,
  pickDefaultDevice,
  scanEegDevices,
  startDemoLive,
  startSerialLive,
  stopLive,
  subscribeLive,
  type LiveBio,
  type ScannedDevice,
} from "@/lib/live-device";
import { IconArrow } from "@/components/icons/IconArrow";
import { ONBOARD_BLEED, ONBOARD_SAFE_TOP } from "@/lib/onboarding-layout";

type Stage =
  | { kind: "scanning" }
  | { kind: "connecting"; label: string }
  | { kind: "connected"; deviceName: string; real: boolean }
  | { kind: "error"; message: string };

function statusLine(stage: Stage, deviceCount: number): string {
  if (stage.kind === "scanning") {
    return deviceCount
      ? `发现 ${deviceCount} 路串口，正在轻轻接入…`
      : "正在寻找你的头环，请稍候…";
  }
  if (stage.kind === "connecting") return stage.label;
  if (stage.kind === "connected") {
    return stage.real ? "信号已抵达。可以开始读此刻的状态。" : "演示信号已就绪，可先体验调律。";
  }
  return stage.message;
}

export default function DevicePage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>({ kind: "scanning" });
  const [devices, setDevices] = useState<ScannedDevice[]>([]);
  const [preferred, setPreferred] = useState<string[]>(["COM23", "COM22"]);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [live, setLive] = useState<LiveBio | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const btOk = isBluetoothAvailable();
  const serialOk = isWebSerialAvailable();

  useEffect(() => subscribeLive(setLive), []);

  const connectSerial = async (port?: string) => {
    const target = (port || "COM23").toUpperCase();
    const snap = getLiveSnapshot();
    if (snap.source === "serial" && snap.deviceName.toUpperCase().includes(target)) {
      setStage({ kind: "connected", deviceName: snap.deviceName, real: true });
      try {
        const conn = await startSerialLive(target);
        setStage({ kind: "connected", deviceName: conn.name, real: true });
      } catch {
        /* 已显示已连接，后台继续轮询 */
      }
      return;
    }
    if (snap.source && snap.source !== "serial") stopLive();
    setStage({ kind: "connecting", label: `正在打开 ${target}…` });
    try {
      const conn = await startSerialLive(target);
      setStage({ kind: "connected", deviceName: conn.name, real: true });
    } catch (e) {
      if (target === "COM23") {
        try {
          const fallback = await startSerialLive("COM22");
          setStage({ kind: "connected", deviceName: fallback.name, real: true });
          return;
        } catch {
          /* 下面报错 */
        }
      }
      setStage({
        kind: "error",
        message: e instanceof Error ? e.message : "还没连上头环。请确认已开机，本机默认走 COM23。",
      });
    }
  };

  const refreshScan = async () => {
    const result = await scanEegDevices();
    setDevices(result.devices);
    setPreferred(result.preferredPorts.length ? result.preferredPorts : ["COM23", "COM22"]);
    setBridgeError(result.bridgeError ?? null);
  };

  useEffect(() => {
    void connectSerial("COM23");
    void refreshScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectBle = async () => {
    stopLive();
    setStage({ kind: "connecting", label: "请在系统弹窗里选择头环" });
    try {
      const conn = await connectBrainLink();
      holdBleConnection(conn);
      setStage({ kind: "connected", deviceName: conn.name, real: true });
    } catch (e) {
      if (e instanceof BandConnectError && e.kind === "cancelled") {
        setStage({ kind: "scanning" });
        return;
      }
      setStage({
        kind: "error",
        message:
          e instanceof Error
            ? e.message
            : "蓝牙连不上。Lite 在 Windows 上多为经典串口，可试本机桥或 Chrome 直连。",
      });
    }
  };

  const connectWebSerial = async () => {
    stopLive();
    setStage({ kind: "connecting", label: "请在弹窗里选择 COM23（outgoing）" });
    try {
      const conn = await connectBrainLinkWebSerial();
      holdWebSerialConnection(conn);
      setStage({ kind: "connected", deviceName: conn.name, real: true });
    } catch (e) {
      if (e instanceof BandConnectError && e.kind === "cancelled") {
        setStage({ kind: "scanning" });
        return;
      }
      setStage({
        kind: "error",
        message:
          e instanceof Error
            ? e.message
            : "串口打开失败。请用 Chrome/Edge，先配对 Lite，再选 outgoing COM。",
      });
    }
  };

  const useDemo = () => {
    startDemoLive("演示信号");
    setStage({ kind: "connected", deviceName: "演示信号", real: false });
  };

  const connected = stage.kind === "connected" ? stage : null;
  const searching = stage.kind === "scanning" || stage.kind === "connecting";
  const defaultDev = pickDefaultDevice(devices, preferred);
  const others = devices.filter((d) => d.port !== defaultDev?.port && (d.eegLikely || d.score >= 40));

  return (
    <div className={`${ONBOARD_BLEED} bg-[#0c0c0e]`}>
      <img
        src="/brand/attunia-device-soft.png"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-90"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(12,12,14,0.35) 0%, rgba(12,12,14,0.25) 35%, rgba(12,12,14,0.72) 70%, rgba(12,12,14,0.94) 100%)",
        }}
        aria-hidden
      />

      <div className={`relative z-10 flex min-h-0 flex-1 flex-col px-5 pb-5 ${ONBOARD_SAFE_TOP}`}>
        <div className="flex shrink-0 items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/onboarding")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-ink backdrop-blur-sm transition hover:bg-white/15"
            aria-label="返回封面"
          >
            <span className="text-white">
              <IconArrow direction="left" className="h-[18px] w-[18px]" />
            </span>
          </button>
          <p className="text-[11px] font-medium tracking-[0.22em] text-white/40 uppercase">Attunia</p>
          <span className="w-10" aria-hidden />
        </div>

        <div className="relative mx-auto mt-3 flex h-[min(9.5rem,22vh)] w-full max-w-[240px] shrink-0 items-center justify-center">
          {searching && (
            <>
              <div className="absolute h-36 w-36 rounded-full border border-[#B8F2C9]/25" style={{ animation: "nf-halo 3.6s ease-out infinite" }} />
              <div
                className="absolute h-36 w-36 rounded-full border border-[#F5E56B]/18"
                style={{ animation: "nf-halo 3.6s ease-out infinite", animationDelay: "1.4s" }}
              />
            </>
          )}
          <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-white/[0.06] shadow-[0_0_60px_-12px_rgba(184,242,201,0.35)] backdrop-blur-[2px] ring-1 ring-white/10">
            <svg viewBox="0 0 120 120" className="h-24 w-24 text-white/85" aria-hidden>
              <ellipse cx="60" cy="50" rx="28" ry="32" fill="none" stroke="currentColor" strokeWidth="1.8" opacity="0.85" />
              <path
                d="M22 108c7-16 21-24 38-24s31 8 38 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity="0.55"
              />
              <path
                d="M34 42c8-6 16-8 26-8s18 2 26 8"
                fill="none"
                stroke="#B8F2C9"
                strokeWidth="3.5"
                strokeLinecap="round"
                opacity="0.9"
              />
              <circle cx="60" cy="34.5" r="3.2" fill={connected ? "#B8F2C9" : "#F5E56B"}>
                {searching && (
                  <animate attributeName="opacity" values="1;0.35;1" dur="1.6s" repeatCount="indefinite" />
                )}
              </circle>
            </svg>
          </div>
          {connected && (
            <div className="absolute -bottom-0.5 flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-[10px] font-medium text-white/90 backdrop-blur-sm ring-1 ring-white/15">
              <span className="h-1.5 w-1.5 rounded-full bg-[#B8F2C9]" />
              已与 {connected.deviceName} 同频
            </div>
          )}
        </div>

        {(connected?.real || live) && (
          <div className="mt-3 flex w-full shrink-0 items-center justify-around rounded-[20px] bg-white/[0.07] px-3 py-2.5 ring-1 ring-white/10 backdrop-blur-sm">
            {(
              [
                ["专注", live?.attention],
                ["放松", live?.meditation],
                ["信号", live?.signal],
              ] as const
            ).map(([label, v]) => (
              <div key={label} className="text-center">
                <div className="font-display text-base font-bold text-white">{v ?? "—"}</div>
                <div className="mt-0.5 text-[10px] tracking-wide text-white/40">{label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 shrink-0 text-center">
          <h1 className="font-display text-[clamp(1.35rem,5.5vw,1.7rem)] leading-[1.12] font-extrabold text-white">
            轻轻戴上头环
            <br />
            开始读状态
          </h1>
          <p
            className={`mt-2 text-[12px] leading-relaxed ${
              stage.kind === "error" ? "text-[#FF8F78]" : "text-white/55"
            }`}
          >
            {statusLine(stage, devices.length)}
          </p>
        </div>

        <div className="mt-3 min-h-0 w-full shrink space-y-2 overflow-hidden">
          {defaultDev && stage.kind !== "connected" && (
            <button
              type="button"
              onClick={() => void connectSerial(defaultDev.port)}
              className="w-full rounded-full bg-white py-3 text-[13px] font-semibold text-ink shadow-[0_12px_32px_-16px_rgba(0,0,0,0.5)] transition active:scale-[0.99]"
            >
              连接 {defaultDev.bluetoothName || familyLabel(String(defaultDev.family))} · {defaultDev.port}
            </button>
          )}
          {!defaultDev && stage.kind !== "connected" && (
            <button
              type="button"
              onClick={() => void connectSerial()}
              className="w-full rounded-full bg-white py-3 text-[13px] font-semibold text-ink shadow-[0_12px_32px_-16px_rgba(0,0,0,0.5)] transition active:scale-[0.99]"
            >
              自动连接头环
            </button>
          )}

          {bridgeError && stage.kind !== "connected" && (
            <p className="line-clamp-2 text-center text-[11px] leading-relaxed text-[#FF8F78]/90">{bridgeError}</p>
          )}
        </div>

        <div className="relative mt-auto w-full shrink-0 space-y-2.5 pt-3">
          <button
            type="button"
            onClick={() => navigate("/onboarding/calibration")}
            disabled={!connected}
            className="w-full rounded-full bg-[#B8F2C9] py-3.5 text-[14px] font-semibold text-ink transition enabled:active:scale-[0.99] disabled:opacity-35"
          >
            {connected ? (
              <span className="inline-flex items-center justify-center gap-1.5">
                下一步：状态校准
                <IconArrow direction="right" className="h-4 w-4" />
              </span>
            ) : (
              "等待同频…"
            )}
          </button>

          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className="w-full py-0.5 text-[12px] text-white/40 transition hover:text-white/65"
          >
            {moreOpen ? "收起其他方式" : "其他连接方式"}
          </button>

          {moreOpen && (
            <div className="absolute inset-x-0 bottom-[4.5rem] z-20 space-y-2 rounded-[22px] bg-[#141416]/96 p-3 ring-1 ring-white/10 backdrop-blur-md">
              {others.length > 0 && stage.kind !== "connected" && (
                <div className="max-h-28 space-y-1 overflow-y-auto">
                  <p className="px-1 text-[10px] tracking-wide text-white/35 uppercase">其他可用设备</p>
                  {others.map((d) => (
                    <button
                      key={d.port}
                      type="button"
                      onClick={() => void connectSerial(d.port)}
                      className="flex w-full items-center justify-between rounded-2xl px-2.5 py-2 text-left text-xs text-white/70 transition hover:bg-white/8"
                    >
                      <span className="truncate">
                        {d.bluetoothName || d.description || familyLabel(String(d.family))}
                      </span>
                      <span className="ml-2 shrink-0 tabular-nums font-semibold text-white/80">{d.port}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className={`grid gap-2 ${btOk && serialOk ? "grid-cols-3" : "grid-cols-2"}`}>
                {serialOk && (
                  <button
                    type="button"
                    onClick={() => void connectWebSerial()}
                    className="rounded-full bg-white/10 py-2.5 text-[11px] font-medium text-white/75 ring-1 ring-white/10"
                  >
                    Chrome 串口
                  </button>
                )}
                {btOk && (
                  <button
                    type="button"
                    onClick={() => void connectBle()}
                    className="rounded-full bg-white/10 py-2.5 text-[11px] font-medium text-white/75 ring-1 ring-white/10"
                  >
                    BLE 头环
                  </button>
                )}
                <button
                  type="button"
                  onClick={useDemo}
                  className="rounded-full bg-white/10 py-2.5 text-[11px] font-medium text-white/60 ring-1 ring-white/10"
                >
                  演示信号
                </button>
              </div>
              <div className="flex items-center justify-center gap-4 pt-0.5">
                <button
                  type="button"
                  onClick={() => void refreshScan()}
                  className="text-[11px] text-white/35 transition hover:text-white/60"
                >
                  重新扫描
                </button>
                <span className="text-white/20">·</span>
                <button
                  type="button"
                  onClick={useDemo}
                  className="text-[11px] text-white/35 transition hover:text-white/60"
                >
                  先用演示
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
