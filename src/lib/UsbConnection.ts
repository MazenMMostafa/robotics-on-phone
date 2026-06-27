import { UsbSerial } from "capacitor-usb-serial";
import { UsbSerialNative } from "./usbSerialExtra";

export interface UsbDevice {
  deviceId: number;
  vendorId: number;
  productId: number;
  deviceName?: string;
  deviceKey?: string;
}

type Listener = () => void;
type DataListener = (data: string) => void;

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

class UsbService {
  private portKey: string | null = null;
  private device: UsbDevice | null = null;
  private connecting = false;
  private listeners: Listener[] = [];
  private reading = false;
  private readLoopActive = false;
  private onData: DataListener | null = null;

  private logs: string[] = [];
  private terminal: string[] = [];

  subscribe(fn: Listener) {
    this.listeners.push(fn);

    return () => {
      this.listeners = this.listeners.filter((listener) => listener !== fn);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  getState() {
    return {
      portKey: this.portKey,
      device: this.device,
      connected: Boolean(this.portKey),
      connecting: this.connecting,
      reading: this.reading,
    };
  }

  getLogs() {
    return this.logs;
  }

  getTerminal() {
    return this.terminal;
  }

  addLog(message: string) {
    this.logs = [
      `${new Date().toLocaleTimeString()} — ${message}`,
      ...this.logs,
    ];
    this.notify();
  }

  addTerminal(data: string) {
    this.terminal = [...this.terminal, data];
    this.notify();
  }

  clearLogs() {
    this.logs = [];
    this.notify();
  }

  clearTerminal() {
    this.terminal = [];
    this.notify();
  }

  async scan(): Promise<UsbDevice[]> {
    const result = await UsbSerial.getDeviceConnections();
    return result.devices ?? [];
  }

  async connect(device: UsbDevice) {
    if (this.connecting) {
      throw new Error("Connection already in progress");
    }

    if (this.portKey) {
      throw new Error("USB device is already connected");
    }

    const key = device.deviceKey || String(device.deviceId);

    this.connecting = true;
    this.notify();

    try {
      await withTimeout(
        UsbSerial.openConnection({
          deviceId: device.deviceId,
          baudRate: 115200,
          dataBits: 8,
          stopBits: 1,
          parity: "none",
        }),
        5000,
        "Connection timeout",
      );

      this.portKey = key;
      this.device = device;
      this.notify();
    } catch (e) {
      this.portKey = null;
      this.device = null;
      throw e;
    } finally {
      this.connecting = false;
      this.notify();
    }
  }

  async disconnect() {
    if (!this.portKey) return;

    const key = this.portKey;

    this.stopReading();

    this.portKey = null;
    this.device = null;
    this.notify();

    try {
      await withTimeout(
        UsbSerial.endConnection({ key }),
        3000,
        "Disconnect timeout",
      );
    } catch (e) {
      console.error("Disconnect error:", e);
    }
  }

  async send(message: string) {
    if (!this.portKey) {
      throw new Error("Not connected");
    }

    await withTimeout(
      UsbSerial.write({
        key: this.portKey,
        message,
        noRead: true,
      }),
      3000,
      "Send timeout",
    );
  }

  async read() {
    if (!this.portKey) {
      throw new Error("Not connected");
    }

    return withTimeout(
      UsbSerial.read({
        key: this.portKey,
      }),
      1500,
      "Read timeout",
    );
  }

  startReading(callback?: DataListener) {
    if (!this.portKey) return;

    this.onData = callback ?? null;

    if (this.readLoopActive) {
      this.reading = true;
      this.notify();
      return;
    }

    this.reading = true;
    this.readLoopActive = true;
    this.notify();

    void this.readLoop();
  }

  stopReading() {
    this.reading = false;
    this.onData = null;
    this.notify();
  }

  private async readLoop() {
    while (this.reading && this.portKey) {
      try {
        const result = await this.read();
        const data = result?.data || "";

        if (data) {
          this.addTerminal(data);

          if (this.onData) {
            this.onData(data);
          }
        }
      } catch (e) {
        const message = String(e);

        if (!message.includes("Read timeout")) {
          console.error("Read loop error:", e);
          this.reading = false;
        }
      }
    }

    this.readLoopActive = false;
    this.notify();
  }

  async writeBytes(data: number[]) {
    if (!this.portKey) {
      throw new Error("Not connected");
    }

    await UsbSerialNative.writeBytes({
      key: this.portKey,
      data,
    });
  }

  async readBytes() {
    if (!this.portKey) {
      throw new Error("Not connected");
    }

    return UsbSerialNative.readBytes({
      key: this.portKey,
    });
  }

  async setDTR(value: boolean) {
    if (!this.portKey) {
      throw new Error("Not connected");
    }

    await UsbSerialNative.setDTR({
      key: this.portKey,
      value,
    });
  }
}

export const usbService = new UsbService();
