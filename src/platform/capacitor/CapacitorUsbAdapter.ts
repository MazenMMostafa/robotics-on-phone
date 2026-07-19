/* eslint-disable @typescript-eslint/no-explicit-any */
import { UsbSerial } from "capacitor-usb-serial";
import { UsbSerialNative } from "../../core/services/usb/usbSerialExtra";
import { nbLog } from "../../core/services/logging/NbLog";
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
      nbLog("info", `[USB-Adapter] scan() → ${devices.length} devices in ${Date.now() - t0}ms`);
      return devices;
    } catch (e) {
      nbLog("error", `[USB-Adapter] scan() FAILED in ${Date.now() - t0}ms ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }
  }

  async openConnection(options: UsbConnectionOptions): Promise<void> {
    const t0 = Date.now();
    try {
      nbLog("info", `[USB-Adapter] openConnection() deviceId=${options.deviceId} baudRate=${options.baudRate}`);
      await UsbSerial.openConnection({
        deviceId: options.deviceId,
        baudRate: options.baudRate,
        dataBits: options.dataBits ?? 8,
        stopBits: options.stopBits ?? 1,
        parity: options.parity ?? "none",
      });
      nbLog("info", `[USB-Adapter] openConnection() OK in ${Date.now() - t0}ms`);
    } catch (e) {
      nbLog("error", `[USB-Adapter] openConnection() FAILED deviceId=${options.deviceId} in ${Date.now() - t0}ms ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }
  }

  async endConnection(key: string): Promise<void> {
    const t0 = Date.now();
    try {
      nbLog("info", `[USB-Adapter] endConnection(${key})`);
      await UsbSerial.endConnection({ key });
      nbLog("info", `[USB-Adapter] endConnection(${key}) OK in ${Date.now() - t0}ms`);
    } catch (e) {
      nbLog("error", `[USB-Adapter] endConnection(${key}) FAILED in ${Date.now() - t0}ms ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }
  }

  async write(key: string, message: string, noRead?: boolean): Promise<WriteResult> {
    try {
      await UsbSerial.write({ key, message, noRead });
      nbLog("info", `[USB-Adapter] write(${key}, len=${message.length}) OK`);
      return {};
    } catch (e) {
      nbLog("error", `[USB-Adapter] write(${key}) FAILED ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }
  }

  async read(key: string): Promise<ReadResult> {
    try {
      const result = await UsbSerial.read({ key });
      const data = result?.data ?? "";
      nbLog("info", `[USB-Adapter] read(${key}) → ${data.length} chars`);
      return { data };
    } catch (e) {
      nbLog("error", `[USB-Adapter] read(${key}) FAILED ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }
  }

  async writeBytes(key: string, data: number[]): Promise<WriteResult> {
    try {
      await UsbSerialNative.writeBytes({ key, data });
      nbLog("info", `[USB-Adapter] writeBytes(${key}, ${data.length}B) OK`);
      return {};
    } catch (e) {
      nbLog("error", `[USB-Adapter] writeBytes(${key}, ${data.length}B) FAILED ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }
  }

  async readBytes(key: string): Promise<ReadResult> {
    try {
      const result = await UsbSerialNative.readBytes({ key });
      const bytes = Array.isArray(result?.data) ? result.data : [];
      nbLog("info", `[USB-Adapter] readBytes(${key}) → ${bytes.length}B`);
      return { data: String.fromCharCode(...bytes), bytes };
    } catch (e) {
      nbLog("error", `[USB-Adapter] readBytes(${key}) FAILED ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }
  }

  async setDTR(key: string, value: boolean): Promise<void> {
    try {
      nbLog("info", `[USB-Adapter] setDTR(${key}, ${value})`);
      await UsbSerialNative.setDTR({ key, value });
      nbLog("info", `[USB-Adapter] setDTR(${key}, ${value}) OK`);
    } catch (e) {
      nbLog("error", `[USB-Adapter] setDTR(${key}, ${value}) FAILED ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }
  }
}

export const capacitorUsbAdapter = new CapacitorUsbAdapter();
