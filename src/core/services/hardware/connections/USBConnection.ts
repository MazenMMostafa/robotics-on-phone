import type { ConnectionAdapter, ConnectionType, ConnectionState, ConnectionOptions, ReadResult, WriteResult } from "../../../types/hardware";
import type { USBAdapter } from "../../../platform/types";
import type { LoggerService } from "../../logging/LoggerService";
import { EventBus } from "../../extension/EventBus";

export const USB_CONNECTION_ERROR = "usb:connection:error";
const MOD = "USB";

function hexDump(bytes: number[], maxLen = 64): string {
  const shown = bytes.slice(0, maxLen);
  const hex = shown.map((b) => b.toString(16).padStart(2, "0")).join(" ");
  return bytes.length > maxLen ? `${hex} ... (${bytes.length} bytes)` : hex;
}

export class USBConnection implements ConnectionAdapter {
  readonly type: ConnectionType = "usb";
  private _state: ConnectionState = "disconnected";
  private adapter: USBAdapter;
  private key: string | null = null;
  private logger: LoggerService | null;

  constructor(adapter: USBAdapter, logger?: LoggerService) {
    this.adapter = adapter;
    this.logger = logger ?? null;
  }

  get state(): ConnectionState {
    return this._state;
  }

  async connect(options?: ConnectionOptions): Promise<void> {
    this._state = "connecting";
    const deviceId = options?.deviceId ?? 0;
    const baudRate = options?.baudRate ?? 115200;
    this.logger?.nbLog("info", MOD, `connect() deviceId=${deviceId} baudRate=${baudRate} state=${this._state}`);
    const t0 = Date.now();
    try {
      await this.adapter.openConnection({
        deviceId,
        baudRate,
        dataBits: options?.dataBits ?? 8,
        stopBits: options?.stopBits ?? 1,
        parity: options?.parity ?? "none",
      });
      this.key = `usb-${deviceId}`;
      this._state = "connected";
      this.logger?.nbLog("info", MOD, `connect() OK key=${this.key} in ${Date.now() - t0}ms`);
    } catch (e) {
      this._state = "error";
      const err = e instanceof Error ? e : new Error(String(e));
      this.logger?.nbLog("error", MOD, `connect() FAILED deviceId=${deviceId} ${err.name}: ${err.message}\n${err.stack ?? ""}`);
      EventBus.emit(USB_CONNECTION_ERROR, { error: e });
      throw e;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.key) return;
    this._state = "disconnecting";
    this.logger?.nbLog("info", MOD, `disconnect() key=${this.key}`);
    const t0 = Date.now();
    try {
      await this.adapter.endConnection(this.key);
      this.logger?.nbLog("info", MOD, `disconnect() OK in ${Date.now() - t0}ms`);
    } catch (e) {
      this.logger?.nbLog("warn", MOD, `disconnect() error (ignored): ${e instanceof Error ? e.message : String(e)}`);
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
    const t0 = Date.now();
    const result = await this.adapter.writeBytes(this.key, data);
    const ms = Date.now() - t0;
    this.logger?.debug(MOD, `writeBytes(${data.length}) ${hexDump(data)} → ${result.bytesWritten ?? "?"}B in ${ms}ms`);
    console.log(`[USB] writeBytes(${data.length}) ${hexDump(data)} → ${result.bytesWritten ?? "?"}B ${ms}ms`);
    return result;
  }

  async readBytes(_timeout?: number): Promise<ReadResult> {
    if (!this.key) throw new Error("Not connected");
    const t0 = Date.now();
    const result = await this.adapter.readBytes(this.key);
    const ms = Date.now() - t0;
    const bytes = result.bytes ?? [];
    this.logger?.debug(MOD, `readBytes(timeout=${_timeout ?? "default"}) → ${bytes.length}B ${hexDump(bytes)} in ${ms}ms`);
    console.log(`[USB] readBytes(${_timeout ?? "default"}) → ${bytes.length}B ${hexDump(bytes)} ${ms}ms`);
    return { data: result.data ?? "", bytes };
  }

  async flush(): Promise<void> {
    // USB serial doesn't support flush directly
  }

  isConnected(): boolean {
    return this._state === "connected";
  }
}
