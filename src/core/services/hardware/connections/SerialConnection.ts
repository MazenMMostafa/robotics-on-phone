import type { ConnectionAdapter, ConnectionType, ConnectionState, ConnectionOptions, ReadResult, WriteResult } from "../../../types/hardware";

export const SERIAL_CONNECTION_ERROR = "serial:connection:error";

export class SerialConnection implements ConnectionAdapter {
  readonly type: ConnectionType = "serial";
  private _state: ConnectionState = "disconnected";
  private connected = false;

  get state(): ConnectionState {
    return this._state;
  }

  async connect(_options?: ConnectionOptions): Promise<void> {
    this._state = "connecting";
    // Future: Web Serial API or native serial plugin
    await new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Serial not implemented")), 100);
    });
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this._state = "disconnected";
  }

  async read(_timeout?: number): Promise<ReadResult> {
    throw new Error("Serial not implemented");
  }

  async write(_data: string, _noResponse?: boolean): Promise<WriteResult> {
    throw new Error("Serial not implemented");
  }

  async writeBytes(_data: number[]): Promise<WriteResult> {
    throw new Error("Serial not implemented");
  }

  async readBytes(_timeout?: number): Promise<ReadResult> {
    throw new Error("Serial not implemented");
  }

  async flush(): Promise<void> {
    // no-op
  }

  isConnected(): boolean {
    return this.connected;
  }
}
