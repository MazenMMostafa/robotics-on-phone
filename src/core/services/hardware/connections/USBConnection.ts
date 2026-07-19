import type { ConnectionAdapter, ConnectionType, ConnectionState, ConnectionOptions, ReadResult, WriteResult } from "../../../types/hardware";
import type { USBAdapter } from "../../../platform/types";
import { EventBus } from "../../extension/EventBus";

export const USB_CONNECTION_ERROR = "usb:connection:error";

export class USBConnection implements ConnectionAdapter {
  readonly type: ConnectionType = "usb";
  private _state: ConnectionState = "disconnected";
  private adapter: USBAdapter;
  private key: string | null = null;

  constructor(adapter: USBAdapter) {
    this.adapter = adapter;
  }

  get state(): ConnectionState {
    return this._state;
  }

  async connect(options?: ConnectionOptions): Promise<void> {
    this._state = "connecting";
    try {
      const deviceId = options?.deviceId ?? 0;
      await this.adapter.openConnection({
        deviceId,
        baudRate: options?.baudRate ?? 115200,
        dataBits: options?.dataBits ?? 8,
        stopBits: options?.stopBits ?? 1,
        parity: options?.parity ?? "none",
      });
      this.key = `usb-${deviceId}`;
      this._state = "connected";
    } catch (e) {
      this._state = "error";
      EventBus.emit(USB_CONNECTION_ERROR, { error: e });
      throw e;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.key) return;
    this._state = "disconnecting";
    try {
      await this.adapter.endConnection(this.key);
    } catch {
      // ignore disconnect errors
    }
    this.key = null;
    this._state = "disconnected";
  }

  async read(_timeout?: number): Promise<ReadResult> {
    if (!this.key) throw new Error("Not connected");
    const result = await this.adapter.read(this.key);
    return { data: result.data ?? "" };
  }

  async write(data: string, _noResponse?: boolean): Promise<WriteResult> {
    if (!this.key) throw new Error("Not connected");
    return this.adapter.write(this.key, data, _noResponse);
  }

  async writeBytes(data: number[]): Promise<WriteResult> {
    if (!this.key) throw new Error("Not connected");
    return this.adapter.writeBytes(this.key, data);
  }

  async readBytes(_timeout?: number): Promise<ReadResult> {
    if (!this.key) throw new Error("Not connected");
    const result = await this.adapter.readBytes(this.key);
    return { data: result.data ?? "", bytes: result.bytes };
  }

  async flush(): Promise<void> {
    // USB serial doesn't support flush directly
  }

  isConnected(): boolean {
    return this._state === "connected";
  }
}
