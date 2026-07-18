import type { ConnectionAdapter } from "../../../types/hardware";
import type { LoggerService } from "../../logging/LoggerService";
import { UploadError, UploadTimeoutError } from "../../../types/upload/error";

const MESSAGE_START = 0x1B;
const TOKEN = 0x0E;

const Cmnd_STK_GET_SYNC = 0x00;
const Cmnd_STK_ENTER_PROGMODE = 0x01;
const Cmnd_STK_LEAVE_PROGMODE = 0x02;
const Cmnd_STK_LOAD_ADDRESS = 0x06;
const Cmnd_STK_PROG_PAGE = 0x13;
const Cmnd_STK_READ_SIGNATURE = 0x15;

const Resp_STK_OK = 0x10;

export class STK500V2Protocol {
  private connection: ConnectionAdapter;
  private logger: LoggerService;
  private seq = 0;

  constructor(connection: ConnectionAdapter, logger: LoggerService) {
    this.connection = connection;
    this.logger = logger;
  }

  async sync(): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const resp = this.decodeResp(await this.sendCmd(Cmnd_STK_GET_SYNC, []));
        if (resp.status === Resp_STK_OK) return;
      } catch {
        if (attempt === 2) throw new UploadTimeoutError(10000);
      }
    }
    throw new UploadTimeoutError(10000);
  }

  async enterProgrammingMode(): Promise<void> {
    const resp = this.decodeResp(await this.sendCmd(Cmnd_STK_ENTER_PROGMODE, []));
    if (resp.status !== Resp_STK_OK) {
      throw new UploadError("ENTER_PROGMODE_FAILED", "Failed to enter programming mode", true);
    }
  }

  async leaveProgrammingMode(): Promise<void> {
    const resp = this.decodeResp(await this.sendCmd(Cmnd_STK_LEAVE_PROGMODE, []));
    if (resp.status !== Resp_STK_OK) {
      this.logger.warn("STK500V2", "Leave programming mode returned non-OK");
    }
  }

  async loadAddress(address: number): Promise<void> {
    const addrBytes = [
      address & 0xFF,
      (address >> 8) & 0xFF,
      (address >> 16) & 0xFF,
      (address >> 24) & 0xFF,
    ];
    const resp = this.decodeResp(await this.sendCmd(Cmnd_STK_LOAD_ADDRESS, addrBytes));
    if (resp.status !== Resp_STK_OK) {
      throw new UploadError("LOAD_ADDRESS_FAILED", `Failed to load address 0x${address.toString(16)}`, true);
    }
  }

  async programPage(pageData: number[], pageSize: number): Promise<void> {
    const sizeBytes = [
      pageSize & 0xFF,
      (pageSize >> 8) & 0xFF,
    ];
    const data = [...sizeBytes, ...pageData];
    const resp = this.decodeResp(await this.sendCmd(Cmnd_STK_PROG_PAGE, data));
    if (resp.status !== Resp_STK_OK) {
      throw new UploadError("PROG_PAGE_FAILED", "Failed to program page", true);
    }
  }

  async readSignature(): Promise<number[]> {
    const resp = this.decodeResp(await this.sendCmd(Cmnd_STK_READ_SIGNATURE, []));
    return resp.data;
  }

  private async sendCmd(cmd: number, payload: number[]): Promise<number[]> {
    this.seq++;
    const body = [cmd, ...payload];
    const checksum = this.crc8([MESSAGE_START, this.seq, TOKEN, body.length, ...body]);
    const buffer = [MESSAGE_START, this.seq, TOKEN, body.length, ...body, checksum];

    const writeResult = await this.connection.writeBytes(buffer);
    if (!writeResult || writeResult.bytesWritten !== buffer.length) {
      throw new UploadError("WRITE_FAILED", "Failed to write command bytes", true);
    }

    const readResult = await this.connection.readBytes(5000);
    const raw = readResult.bytes ?? [];
    if (raw.length < 6) {
      throw new UploadTimeoutError(5000);
    }

    return raw;
  }

  private decodeResp(raw: number[]): { status: number; data: number[] } {
    if (raw[0] !== MESSAGE_START) {
      throw new UploadError("INVALID_RESPONSE", `Invalid response start byte: 0x${raw[0]?.toString(16)}`, true);
    }
    const bodyLen = raw[3];
    const body = raw.slice(4, 4 + bodyLen);
    const status = body[0];
    const data = body.slice(1);
    return { status, data };
  }

  private crc8(data: number[]): number {
    let crc = 0;
    for (const b of data) {
      crc ^= b;
      for (let i = 0; i < 8; i++) {
        if (crc & 0x80) {
          crc = (crc << 1) ^ 0x07;
        } else {
          crc <<= 1;
        }
        crc &= 0xFF;
      }
    }
    return crc;
  }
}
