import type { ConnectionAdapter } from "../../../types/hardware";
import { UploadError, UploadTimeoutError } from "../../../types/upload/error";

const CMD_CHIP_DETECT = 0x02;
const CMD_FLASH_BEGIN = 0x02;
const CMD_FLASH_DATA = 0x03;
const CMD_FLASH_END = 0x04;
const CMD_READ_FLASH = 0x03;

const RESP_OK = 0x00;

const DEFAULT_TIMEOUT = 5000;
const SYNC_ATTEMPTS = 5;

export interface EspCommandResult {
  status: number;
  data: number[];
}

export class EsptoolProtocol {
  private connection: ConnectionAdapter;

  constructor(connection: ConnectionAdapter) {
    this.connection = connection;
  }

  async sync(): Promise<void> {
    for (let attempt = 0; attempt < SYNC_ATTEMPTS; attempt++) {
      try {
        const syncPacket = [0x07, 0x07, 0x12, 0x20];
        await this.connection.writeBytes(syncPacket);

        const ack = await this.readBytes(2);
        if (ack.length >= 1 && ack[0] === 0x55) return;
      } catch {
        if (attempt === SYNC_ATTEMPTS - 1) throw new UploadTimeoutError(DEFAULT_TIMEOUT);
      }
    }
    throw new UploadTimeoutError(DEFAULT_TIMEOUT);
  }

  async detectChip(): Promise<string> {
    const result = await this.command(CMD_CHIP_DETECT, []);
    if (result.status !== RESP_OK) {
      throw new UploadError("CHIP_DETECT_FAILED", "Failed to detect ESP chip", true);
    }
    const chipMagic = result.data.slice(0, 2);
    if (chipMagic[0] === 0x00 && chipMagic[1] === 0x00) return "ESP32";
    if (chipMagic[0] === 0x00 && chipMagic[1] === 0x01) return "ESP32-S2";
    if (chipMagic[0] === 0x01 && chipMagic[1] === 0x01) return "ESP32-S3";
    if (chipMagic[0] === 0x01 && chipMagic[1] === 0x02) return "ESP32-C3";
    return "ESP32";
  }

  async beginFlash(address: number, totalSize: number, blockSize: number): Promise<void> {
    const payload = [
      totalSize & 0xFF, (totalSize >> 8) & 0xFF, (totalSize >> 16) & 0xFF, (totalSize >> 24) & 0xFF,
      blockSize & 0xFF, (blockSize >> 8) & 0xFF, (blockSize >> 16) & 0xFF, (blockSize >> 24) & 0xFF,
      address & 0xFF, (address >> 8) & 0xFF, (address >> 16) & 0xFF, (address >> 24) & 0xFF,
    ];
    const result = await this.command(CMD_FLASH_BEGIN, payload);
    if (result.status !== RESP_OK) {
      throw new UploadError("FLASH_BEGIN_FAILED", "Failed to begin flash operation", true);
    }
  }

  async sendData(sequence: number, data: number[]): Promise<void> {
    const size = data.length;
    const payload = [
      size & 0xFF, (size >> 8) & 0xFF,
      sequence & 0xFF, (sequence >> 8) & 0xFF,
      0x00, 0x00, 0x00, 0x00,
      ...data,
    ];
    const checksum = this.calculateChecksum(data);
    payload.push(checksum);

    const result = await this.command(CMD_FLASH_DATA, payload);
    if (result.status !== RESP_OK) {
      throw new UploadError("FLASH_DATA_FAILED", `Failed to send data block ${sequence}`, true);
    }
  }

  async endFlash(reboot: boolean): Promise<void> {
    const payload = reboot ? [0x00, 0x00, 0x00, 0x00] : [0x01, 0x00, 0x00, 0x00];
    const result = await this.command(CMD_FLASH_END, payload);
    if (result.status !== RESP_OK) {
      throw new UploadError("FLASH_END_FAILED", "Failed to complete flash operation", true);
    }
  }

  async readFlash(address: number, size: number): Promise<number[]> {
    const payload = [
      address & 0xFF, (address >> 8) & 0xFF, (address >> 16) & 0xFF, (address >> 24) & 0xFF,
      size & 0xFF, (size >> 8) & 0xFF, (size >> 16) & 0xFF, (size >> 24) & 0xFF,
      0x00, 0x00, 0x00, 0x00,
    ];
    const result = await this.command(CMD_READ_FLASH, payload);
    if (result.status !== RESP_OK) {
      throw new UploadError("READ_FLASH_FAILED", "Failed to read flash memory", true);
    }
    return result.data;
  }

  private async command(cmd: number, payload: number[]): Promise<EspCommandResult> {
    const buffer = [cmd, ...payload];
    const writeResult = await this.connection.writeBytes(buffer);
    if (!writeResult || writeResult.bytesWritten !== buffer.length) {
      throw new UploadError("WRITE_FAILED", "Failed to write command bytes", true);
    }

    const readResult = await this.readBytes(1024);
    if (readResult.length < 1) {
      throw new UploadTimeoutError(DEFAULT_TIMEOUT);
    }

    return {
      status: readResult[0],
      data: readResult.slice(1),
    };
  }

  private async readBytes(timeout: number): Promise<number[]> {
    const result = await this.connection.readBytes(timeout);
    return result.bytes ?? [];
  }

  private calculateChecksum(data: number[]): number {
    let cs = 0xEF;
    for (const b of data) {
      cs ^= b;
    }
    return cs;
  }
}
