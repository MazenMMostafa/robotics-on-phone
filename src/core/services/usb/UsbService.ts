import type { USBAdapter, UsbDeviceInfo } from "../../platform/types";
import { capacitorUsbAdapter } from "../../../platform/capacitor/CapacitorUsbAdapter";

/** @deprecated Use UsbDeviceInfo from core/platform/types instead */
export type UsbDevice = UsbDeviceInfo;

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

export class UsbService {
  private adapter: USBAdapter;
  private portKey: string | null = null;
  private device: UsbDeviceInfo | null = null;
  private connecting = false;
  private listeners: Listener[] = [];
  private reading = false;
  private readLoopActive = false;
  private onData: DataListener | null = null;

  private logs: string[] = [];
  private terminal: string[] = [];

  private readonly maxLogLines = 500;
  private readonly maxTerminalLines = 1000;

  constructor(adapter?: USBAdapter) {
    this.adapter = adapter ?? capacitorUsbAdapter;
  }

  setAdapter(adapter: USBAdapter): void {
    this.adapter = adapter;
  }

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
    if (this.logs.length > this.maxLogLines) {
      this.logs = this.logs.slice(0, this.maxLogLines);
    }
    this.notify();
  }

  addTerminal(data: string) {
    this.terminal = [...this.terminal, data];
    if (this.terminal.length > this.maxTerminalLines) {
      this.terminal = this.terminal.slice(-this.maxTerminalLines);
    }
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

  async scan(): Promise<UsbDeviceInfo[]> {
    return this.adapter.scan();
  }

  async connect(device: UsbDeviceInfo) {
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
        this.adapter.openConnection({
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
        this.adapter.endConnection(key),
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
      this.adapter.write(this.portKey, message, true),
      3000,
      "Send timeout",
    );
  }

  async read() {
    if (!this.portKey) {
      throw new Error("Not connected");
    }
    return withTimeout(
      this.adapter.read(this.portKey),
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
        const result = await this.adapter.read(this.portKey);
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
    await this.adapter.writeBytes(this.portKey, data);
  }

  async readBytes() {
    if (!this.portKey) {
      throw new Error("Not connected");
    }
    return this.adapter.readBytes(this.portKey);
  }

  async setDTR(value: boolean) {
    if (!this.portKey) {
      throw new Error("Not connected");
    }
    await this.adapter.setDTR(this.portKey, value);
  }
}

export const usbService = new UsbService();
