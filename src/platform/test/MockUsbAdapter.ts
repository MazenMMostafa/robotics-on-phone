/* eslint-disable @typescript-eslint/no-unused-vars */
import type { USBAdapter, UsbDeviceInfo, UsbConnectionOptions, ReadResult, WriteResult } from "../../core/platform/types";

export class MockUsbAdapter implements USBAdapter {
  private connected = false;
  scanResult: UsbDeviceInfo[] = [];
  writeHistory: string[] = [];
  readResult: ReadResult = { data: "" };
  writeBytesHistory: number[][] = [];
  readBytesResult: ReadResult = { data: "" };
  dtrHistory: boolean[] = [];

  async scan(): Promise<UsbDeviceInfo[]> {
    return this.scanResult;
  }

  async openConnection(_options: UsbConnectionOptions): Promise<void> {
    this.connected = true;
  }

  async endConnection(_key: string): Promise<void> {
    this.connected = false;
  }

  async write(_key: string, message: string, _noRead?: boolean): Promise<WriteResult> {
    this.writeHistory.push(message);
    return {};
  }

  async read(_key: string): Promise<ReadResult> {
    return this.readResult;
  }

  async writeBytes(_key: string, data: number[]): Promise<WriteResult> {
    this.writeBytesHistory.push(data);
    return {};
  }

  async readBytes(_key: string): Promise<ReadResult> {
    return this.readBytesResult;
  }

  async setDTR(_key: string, value: boolean): Promise<void> {
    this.dtrHistory.push(value);
  }

  isConnected(): boolean {
    return this.connected;
  }
}
