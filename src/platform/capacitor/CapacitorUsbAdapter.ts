/* eslint-disable @typescript-eslint/no-explicit-any */
import { UsbSerial } from "capacitor-usb-serial";
import { UsbSerialNative } from "../../core/services/usb/usbSerialExtra";
import type {
  USBAdapter,
  UsbDeviceInfo,
  UsbConnectionOptions,
  ReadResult,
  WriteResult,
} from "../../core/platform/types";

export class CapacitorUsbAdapter implements USBAdapter {
  async scan(): Promise<UsbDeviceInfo[]> {
    const result = await UsbSerial.getDeviceConnections();
    return (result.devices ?? []).map((d: any) => ({
      deviceId: d.deviceId,
      vendorId: d.vendorId,
      productId: d.productId,
      deviceName: d.deviceName,
      deviceKey: d.deviceKey,
    }));
  }

  async openConnection(options: UsbConnectionOptions): Promise<void> {
    await UsbSerial.openConnection({
      deviceId: options.deviceId,
      baudRate: options.baudRate,
      dataBits: options.dataBits ?? 8,
      stopBits: options.stopBits ?? 1,
      parity: options.parity ?? "none",
    });
  }

  async endConnection(key: string): Promise<void> {
    await UsbSerial.endConnection({ key });
  }

  async write(key: string, message: string, noRead?: boolean): Promise<WriteResult> {
    await UsbSerial.write({ key, message, noRead });
    return {};
  }

  async read(key: string): Promise<ReadResult> {
    const result = await UsbSerial.read({ key });
    return { data: result?.data ?? "" };
  }

  async writeBytes(key: string, data: number[]): Promise<WriteResult> {
    await UsbSerialNative.writeBytes({ key, data });
    return {};
  }

  async readBytes(key: string): Promise<ReadResult> {
    const result = await UsbSerialNative.readBytes({ key });
    const bytes = Array.isArray(result?.data) ? result.data : [];
    return { data: String.fromCharCode(...bytes), bytes };
  }

  async setDTR(key: string, value: boolean): Promise<void> {
    await UsbSerialNative.setDTR({ key, value });
  }
}

export const capacitorUsbAdapter = new CapacitorUsbAdapter();
