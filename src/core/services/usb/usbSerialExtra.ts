import { UsbSerial } from "capacitor-usb-serial";

type UsbSerialExtra = typeof UsbSerial & {
  writeBytes(options: { key: string; data: number[] }): Promise<void>;
  readBytes(options: { key: string }): Promise<{ data: number[]; length: number }>;
  setDTR(options: { key: string; value: boolean }): Promise<void>;
};

export const UsbSerialNative = UsbSerial as UsbSerialExtra;
