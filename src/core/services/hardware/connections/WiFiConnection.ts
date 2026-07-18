import type { ConnectionAdapter, ConnectionType, ConnectionState, ConnectionOptions, ReadResult, WriteResult } from "../../../types/hardware";

export class WiFiConnection implements ConnectionAdapter {
  readonly type: ConnectionType = "wifi";
  private _state: ConnectionState = "disconnected";

  get state(): ConnectionState {
    return this._state;
  }

  async connect(_options?: ConnectionOptions): Promise<void> {
    throw new Error("WiFi not implemented (stub)");
  }

  async disconnect(): Promise<void> {
    this._state = "disconnected";
  }

  async read(_timeout?: number): Promise<ReadResult> {
    throw new Error("WiFi not implemented (stub)");
  }

  async write(_data: string, _noResponse?: boolean): Promise<WriteResult> {
    throw new Error("WiFi not implemented (stub)");
  }

  async writeBytes(_data: number[]): Promise<WriteResult> {
    throw new Error("WiFi not implemented (stub)");
  }

  async readBytes(_timeout?: number): Promise<ReadResult> {
    throw new Error("WiFi not implemented (stub)");
  }

  async flush(): Promise<void> {
    // no-op
  }

  isConnected(): boolean {
    return false;
  }
}
