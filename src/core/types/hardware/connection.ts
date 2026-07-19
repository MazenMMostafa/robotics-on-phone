export type ConnectionType = "usb" | "serial" | "bluetooth" | "wifi";

export type ConnectionState = "disconnected" | "connecting" | "connected" | "disconnecting" | "error";

export interface ConnectionOptions {
  baudRate?: number;
  dataBits?: number;
  stopBits?: number;
  parity?: "none" | "odd" | "even";
  autoReconnect?: boolean;
  timeout?: number;
  deviceId?: number;
}

export interface ReadResult {
  data: string;
  bytes?: number[];
}

export interface WriteResult {
  bytesWritten?: number;
}

export interface ConnectionAdapter {
  readonly type: ConnectionType;
  readonly state: ConnectionState;
  connect(options?: ConnectionOptions): Promise<void>;
  disconnect(): Promise<void>;
  read(timeout?: number): Promise<ReadResult>;
  write(data: string, noResponse?: boolean): Promise<WriteResult>;
  writeBytes(data: number[]): Promise<WriteResult>;
  readBytes(timeout?: number): Promise<ReadResult>;
  flush(): Promise<void>;
  isConnected(): boolean;
}
