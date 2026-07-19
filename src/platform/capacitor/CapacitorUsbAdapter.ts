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
    const t0 = Date.now();
    try {
      const result = await UsbSerial.getDeviceConnections();
      const devices = (result.devices ?? []).map((d: any) => ({
        deviceId: d.deviceId,
        vendorId: d.vendorId,
        productId: d.productId,
        deviceName: d.deviceName,
        deviceKey: d.deviceKey,
      }));
      console.log(`[USB-Adapter] scan() → ${devices.length} devices in ${Date.now() - t0}ms`);
      return devices;
    } catch (e) {
      console.error(`[USB-Adapter] scan() FAILED in ${Date.now() - t0}ms`, e);
      throw e;
    }
  }

  async openConnection(options: UsbConnectionOptions): Promise<void> {
    const t0 = Date.now();
    try {
      console.log(`[USB-Adapter] openConnection() deviceId=${options.deviceId} baudRate=${options.baudRate}`);
      await UsbSerial.openConnection({
        deviceId: options.deviceId,
        baudRate: options.baudRate,
        dataBits: options.dataBits ?? 8,
        stopBits: options.stopBits ?? 1,
        parity: options.parity ?? "none",
      });
      console.log(`[USB-Adapter] openConnection() OK in ${Date.now() - t0}ms`);
    } catch (e) {
      console.error(`[USB-Adapter] openConnection() FAILED deviceId=${options.deviceId} in ${Date.now() - t0}ms`, e);
      throw e;
    }
  }

  async endConnection(key: string): Promise<void> {
    const t0 = Date.now();
    try {
      console.log(`[USB-Adapter] endConnection(${key})`);
      await UsbSerial.endConnection({ key });
      console.log(`[USB-Adapter] endConnection(${key}) OK in ${Date.now() - t0}ms`);
    } catch (e) {
      console.error(`[USB-Adapter] endConnection(${key}) FAILED in ${Date.now() - t0}ms`, e);
      throw e;
    }
  }

  async write(key: string, message: string, noRead?: boolean): Promise<WriteResult> {
    try {
      await UsbSerial.write({ key, message, noRead });
      console.log(`[USB-Adapter] write(${key}, len=${message.length}) OK`);
      return {};
    } catch (e) {
      console.error(`[USB-Adapter] write(${key}) FAILED`, e);
      throw e;
    }
  }

  async read(key: string): Promise<ReadResult> {
    try {
      const result = await UsbSerial.read({ key });
      const data = result?.data ?? "";
      console.log(`[USB-Adapter] read(${key}) → ${data.length} chars`);
      return { data };
    } catch (e) {
      console.error(`[USB-Adapter] read(${key}) FAILED`, e);
      throw e;
    }
  }

  async writeBytes(key: string, data: number[]): Promise<WriteResult> {
    try {
      await UsbSerialNative.writeBytes({ key, data });
      console.log(`[USB-Adapter] writeBytes(${key}, ${data.length}B) OK`);
      return {};
    } catch (e) {
      console.error(`[USB-Adapter] writeBytes(${key}, ${data.length}B) FAILED`, e);
      throw e;
    }
  }

  async readBytes(key: string): Promise<ReadResult> {
    try {
      const result = await UsbSerialNative.readBytes({ key });
      const bytes = Array.isArray(result?.data) ? result.data : [];
      console.log(`[USB-Adapter] readBytes(${key}) → ${bytes.length}B`);
      return { data: String.fromCharCode(...bytes), bytes };
    } catch (e) {
      console.error(`[USB-Adapter] readBytes(${key}) FAILED`, e);
      throw e;
    }
  }

  async setDTR(key: string, value: boolean): Promise<void> {
    try {
      console.log(`[USB-Adapter] setDTR(${key}, ${value})`);
      await UsbSerialNative.setDTR({ key, value });
      console.log(`[USB-Adapter] setDTR(${key}, ${value}) OK`);
    } catch (e) {
      console.error(`[USB-Adapter] setDTR(${key}, ${value}) FAILED`, e);
      throw e;
    }
  }
}

export const capacitorUsbAdapter = new CapacitorUsbAdapter();
