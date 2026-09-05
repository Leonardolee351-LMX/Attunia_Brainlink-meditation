/**
 * Web Bluetooth 的最小类型声明(标准 lib.dom 尚未内置)。
 * 只声明我们用到的部分;硬件接入后再按需补全。
 */
type BluetoothServiceUUID = string | number;

interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  /** 当前 notify 值 */
  readonly value?: DataView;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  addEventListener(
    type: "characteristicvaluechanged",
    listener: (ev: Event) => void,
  ): void;
  removeEventListener(type: string, listener: (ev: Event) => void): void;
}

interface BluetoothRemoteGATTService {
  getCharacteristic(uuid: BluetoothServiceUUID): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(uuid: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothDevice {
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
}

interface RequestDeviceOptions {
  filters?: { name?: string; namePrefix?: string; services?: BluetoothServiceUUID[] }[];
  acceptAllDevices?: boolean;
  optionalServices?: BluetoothServiceUUID[];
}

interface Bluetooth {
  requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
}

interface Navigator {
  bluetooth?: Bluetooth;
}
