export interface UsbDeviceInfo {
  deviceId: number;
  vendorId: number;
  productId: number;
  deviceName?: string;
  deviceKey?: string;
}

export interface UsbConnectionOptions {
  deviceId: number;
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: "none" | "odd" | "even";
}

export interface ReadResult {
  data?: string;
  bytes?: number[];
}

export interface WriteResult {
  bytesWritten?: number;
}

export interface USBAdapter {
  scan(): Promise<UsbDeviceInfo[]>;
  openConnection(options: UsbConnectionOptions): Promise<void>;
  endConnection(key: string): Promise<void>;
  write(key: string, message: string, noRead?: boolean): Promise<WriteResult>;
  read(key: string): Promise<ReadResult>;
  writeBytes(key: string, data: number[]): Promise<WriteResult>;
  readBytes(key: string): Promise<ReadResult>;
  setDTR(key: string, value: boolean): Promise<void>;
}

export interface StorageAdapter {
  getItem<T>(key: string): T | null;
  setItem<T>(key: string, value: T): void;
  removeItem(key: string): void;
  clear(): void;
}

export interface CompileRequest {
  code: string;
  board: string;
  serverUrl?: string;
}

export interface CompilerAdapter {
  compile(request: CompileRequest): Promise<string>;
}

export interface FileAdapter {
  download(filename: string, content: string, mimeType?: string): void;
  readFile(): Promise<string | null>;
}

export interface PermissionAdapter {
  requestUsb(): Promise<boolean>;
  requestStorage(): Promise<boolean>;
}

export interface NotificationAdapter {
  show(message: string, title?: string): void;
  error(message: string, title?: string): void;
}

export interface ShareAdapter {
  share(data: { title?: string; text?: string; url?: string }): Promise<void>;
}
