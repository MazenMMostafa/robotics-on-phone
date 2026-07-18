export interface UsbDevice {
  deviceId: number;
  vendorId: number;
  productId: number;
  deviceName?: string;
  deviceKey?: string;
}

export interface UsbState {
  portKey: string | null;
  device: UsbDevice | null;
  connected: boolean;
  connecting: boolean;
  reading: boolean;
}
