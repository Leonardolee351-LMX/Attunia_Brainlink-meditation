/**
 * 脑电设备接入层(Web Bluetooth)。
 *
 * 目前支持/预留三类设备:
 * 1. BrainLink 头环(宏智力):BLE 串口透传,service 0xFFE0 / notify 特征 0xFFE1,
 *    数据为 TGAM 风格分包协议(0xAA 0xAA 同步头),可解出 attention / meditation / 信号质量
 * 2. 湿电极耳夹设备(自研):预留同样的连接通路,硬件确定后替换厂商 UUID 与数据解析
 * 3. 任意演示设备:acceptAllDevices 兜底连接
 *
 * 浏览器不支持(如 iOS Safari)或用户取消时,调用方降级为模拟信号。
 */

// ───────────────────────────── 通用类型 ─────────────────────────────

export type DeviceKind = "brainlink" | "earclip" | "generic";

export interface BandConnection {
  /** 设备自报名字,如 "BrainLink Pro" */
  name: string;
  /** 设备类型 */
  kind: DeviceKind;
  /** true = 真实蓝牙设备;false = 模拟信号 */
  real: boolean;
  /** 真实连接时的 GATT 句柄(模拟时为 null) */
  server: BluetoothRemoteGATTServer | null;
}

export function isBluetoothAvailable(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

export function isWebSerialAvailable(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

export type ConnectErrorKind = "unsupported" | "cancelled" | "failed";

export class BandConnectError extends Error {
  kind: ConnectErrorKind;
  constructor(kind: ConnectErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

async function requestAndConnect(
  options: RequestDeviceOptions,
  kind: DeviceKind,
): Promise<BandConnection> {
  if (!isBluetoothAvailable()) {
    throw new BandConnectError("unsupported", "当前浏览器不支持 Web Bluetooth");
  }
  let device: BluetoothDevice;
  try {
    device = await navigator.bluetooth!.requestDevice(options);
  } catch (e) {
    throw new BandConnectError("cancelled", (e as Error).message);
  }
  try {
    const server = await device.gatt!.connect();
    return { name: device.name || "未命名设备", kind, real: true, server };
  } catch (e) {
    throw new BandConnectError("failed", (e as Error).message);
  }
}

/** 弹出系统设备选择器,连接任意 BLE 设备(演示/兜底) */
export async function connectBandViaBluetooth(): Promise<BandConnection> {
  return requestAndConnect(
    {
      acceptAllDevices: true,
      optionalServices: ["battery_service", "device_information", 0xffe0, 0xfe60],
    },
    "generic",
  );
}

// ───────────────────────────── BrainLink ─────────────────────────────

/** BrainLink 一次解析出的数据点 */
export interface BrainLinkSample {
  /** 专注度 eSense,0~100 */
  attention: number | null;
  /** 放松度 eSense,0~100 */
  meditation: number | null;
  /** 信号质量,0=最好,200=未佩戴 */
  signal: number | null;
  at: number;
}

export interface BrainLinkConnection extends BandConnection {
  kind: "brainlink";
  /** 订阅实时数据流;返回取消订阅函数 */
  onSample(cb: (s: BrainLinkSample) => void): () => void;
  disconnect(): void;
}

/**
 * BrainLink 分包协议解析器(0xAA 0xAA 同步头)。
 * 数据包结构:[0xAA][0xAA][LENGTH][PAYLOAD...][CHECKSUM]
 * PAYLOAD 由若干 [CODE][VALUE...] 组成:
 *   0x02 → 信号质量(1 字节,0 最好,200 未佩戴)
 *   0x04 → attention eSense(1 字节,0~100)
 *   0x05 → meditation eSense(1 字节,0~100)
 *   0x80 → 原始脑波(后跟 2 字节长度,3 字节数据)——本层跳过
 *   0x83 → 八通道功率(后跟 1 字节长度 0x18,24 字节数据)——本层跳过
 */
/** ThinkGear / TGAM 分包解析。BLE notify 与 COM 字节流共用。 */
export class ThinkGearParser {
  private buf: number[] = [];

  push(chunk: Uint8Array): BrainLinkSample[] {
    this.buf.push(...chunk);
    const out: BrainLinkSample[] = [];
    for (;;) {
      // 找到同步头
      while (this.buf.length >= 2 && !(this.buf[0] === 0xaa && this.buf[1] === 0xaa)) {
        this.buf.shift();
      }
      if (this.buf.length < 4) break;
      const len = this.buf[2];
      if (len > 169) {
        // 非法长度,跳过一个字节重新同步
        this.buf.shift();
        continue;
      }
      if (this.buf.length < 3 + len + 1) break; // 等更多数据
      const payload = this.buf.slice(3, 3 + len);
      // 校验和:~sum(payload) & 0xFF
      const sum = payload.reduce((s, b) => (s + b) & 0xff, 0);
      const checksum = this.buf[3 + len];
      this.buf.splice(0, 4 + len);
      if (((~sum) & 0xff) !== checksum) continue; // 校验失败丢包

      let attention: number | null = null;
      let meditation: number | null = null;
      let signal: number | null = null;
      for (let i = 0; i < payload.length; ) {
        const code = payload[i];
        if (code >= 0x80) {
          // 多字节字段:[code][vlen][v...]
          const vlen = payload[i + 1] ?? 0;
          i += 2 + vlen;
          continue;
        }
        const v = payload[i + 1];
        if (code === 0x02) signal = v;
        else if (code === 0x04) attention = v;
        else if (code === 0x05) meditation = v;
        i += 2;
      }
      if (attention !== null || meditation !== null || signal !== null) {
        out.push({ attention, meditation, signal, at: Date.now() });
      }
    }
    return out;
  }
}

/** BrainLink BLE 透传:service 0xFFE0,notify 特征通常为 0xFFE1 */
const BRAINLINK_SERVICE = 0xffe0;
const BRAINLINK_NOTIFY_CANDIDATES = [0xffe1, 0xffe4, 0xffe2];

/**
 * 连接 BrainLink 头环并订阅实时数据流。
 * 依赖 Chrome/Edge/Android 的 Web Bluetooth;桌面 Chrome 需开启蓝牙。
 */
export async function connectBrainLink(): Promise<BrainLinkConnection> {
  const conn = await requestAndConnect(
    {
      filters: [
        { namePrefix: "BrainLink" },
        { namePrefix: "Brainlink" },
        { namePrefix: "Macrotellect" },
        { namePrefix: "BL" },
      ],
      optionalServices: [BRAINLINK_SERVICE, "battery_service", "device_information"],
    },
    "brainlink",
  );

  const parser = new ThinkGearParser();
  const listeners = new Set<(s: BrainLinkSample) => void>();
  let characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  // 依次尝试常见的 notify 特征 UUID
  const service = await conn.server!.getPrimaryService(BRAINLINK_SERVICE).catch(() => null);
  if (service) {
    for (const uuid of BRAINLINK_NOTIFY_CANDIDATES) {
      characteristic = await service.getCharacteristic(uuid).catch(() => null);
      if (characteristic) break;
    }
  }

  if (characteristic) {
    const ch = characteristic;
    const handler = (ev: Event) => {
      const value = (ev.target as BluetoothRemoteGATTCharacteristic).value;
      if (!value) return;
      for (const s of parser.push(new Uint8Array(value.buffer))) {
        listeners.forEach((cb) => cb(s));
      }
    };
    ch.addEventListener("characteristicvaluechanged", handler);
    await ch.startNotifications().catch(() => {});
  }

  return {
    ...conn,
    kind: "brainlink",
    onSample(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    disconnect() {
      try {
        conn.server?.disconnect();
      } catch {
        /* 已断开 */
      }
      listeners.clear();
    },
  };
}

/**
 * Chrome Web Serial：Windows 已把 Lite 配对成 COM 口后，浏览器直接读 57600 字节流并解析 ThinkGear。
 * 这不是 Web Bluetooth。Lite 的经典蓝牙 SPP 进不了 GATT 选择器。
 */
export async function connectBrainLinkWebSerial(): Promise<BrainLinkConnection> {
  if (!isWebSerialAvailable()) {
    throw new BandConnectError("unsupported", "当前浏览器不支持 Web Serial。请用 Chrome / Edge，并已在 Windows 配对 BrainLink Lite。");
  }
  const serial = navigator.serial;
  if (!serial) {
    throw new BandConnectError("unsupported", "当前浏览器不支持 Web Serial");
  }
  let port: SerialPort;
  try {
    port = await serial.requestPort();
  } catch (e) {
    throw new BandConnectError("cancelled", (e as Error).message);
  }
  try {
    await port.open({ baudRate: 57600 });
  } catch (e) {
    throw new BandConnectError("failed", (e as Error).message);
  }

  const parser = new ThinkGearParser();
  const listeners = new Set<(s: BrainLinkSample) => void>();
  let stopped = false;
  const reader = port.readable?.getReader();

  void (async () => {
    if (!reader) return;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done || stopped) break;
        if (!value) continue;
        for (const s of parser.push(value)) listeners.forEach((cb) => cb(s));
      }
    } catch {
      /* 端口被关闭 */
    }
  })();

  return {
    name: port.getInfo().usbProductId ? `USB 串口 ${port.getInfo().usbProductId}` : "BrainLink Lite · Web Serial",
    kind: "brainlink",
    real: true,
    server: null,
    onSample(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    disconnect() {
      stopped = true;
      try {
        void reader?.cancel();
      } catch {
        /* ignore */
      }
      try {
        void port.close();
      } catch {
        /* ignore */
      }
      listeners.clear();
    },
  };
}

// ───────────────────────────── 湿电极耳夹(预留) ─────────────────────────────

/**
 * 湿电极耳夹设备(自研,预留通道)。
 * 硬件协议确定后:把 PLACEHOLDER 换成真实 Service/Characteristic UUID,
 * 并在这里实现对应的数据包解析(预计输出单通道 EEG 原始值 + 接触质量)。
 */
export async function connectEarClip(): Promise<BandConnection> {
  return requestAndConnect(
    {
      // TODO(硬件确定后):filters: [{ namePrefix: "ONDA-Ear" }], optionalServices 换真实 UUID
      acceptAllDevices: true,
      optionalServices: [0xffe0, 0xfe60, "battery_service"],
    },
    "earclip",
  );
}
