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

const CMD_NAMES: Record<number, string> = {
  [Cmnd_STK_GET_SYNC]: "GET_SYNC",
  [Cmnd_STK_ENTER_PROGMODE]: "ENTER_PROGMODE",
  [Cmnd_STK_LEAVE_PROGMODE]: "LEAVE_PROGMODE",
  [Cmnd_STK_LOAD_ADDRESS]: "LOAD_ADDRESS",
  [Cmnd_STK_PROG_PAGE]: "PROG_PAGE",
  [Cmnd_STK_READ_SIGNATURE]: "READ_SIGNATURE",
};

function hex(bytes: number[]): string {
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ");
}

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
        this.logger.nbLog("debug", "STK500v2", `[SYNC] attempt ${attempt + 1}/3`);
        const resp = this.decodeResp(await this.sendCmd(Cmnd_STK_GET_SYNC, []));
        if (resp.status === Resp_STK_OK) {
          this.logger.nbLog("info", "STK500v2", `[SYNC] OK on attempt ${attempt + 1}`);
          return;
        }
        this.logger.nbLog("warn", "STK500v2", `[SYNC] unexpected status: 0x${resp.status?.toString(16)} on attempt ${attempt + 1}`);
      } catch (e) {
        this.logger.nbLog("warn", "STK500v2", `[SYNC] attempt ${attempt + 1} error: ${e instanceof Error ? e.message : String(e)}`);
        if (attempt === 2) throw new UploadTimeoutError(10000);
      }
    }
    throw new UploadTimeoutError(10000);
  }

  async enterProgrammingMode(): Promise<void> {
    this.logger.nbLog("debug", "STK500v2", `[ENTER_PROGMODE] sending`);
    const resp = this.decodeResp(await this.sendCmd(Cmnd_STK_ENTER_PROGMODE, []));
    if (resp.status !== Resp_STK_OK) {
      const msg = `Failed to enter programming mode (status: 0x${resp.status?.toString(16)})`;
      this.logger.nbLog("error", "STK500v2", `[ENTER_PROGMODE] ${msg}`);
      throw new UploadError("ENTER_PROGMODE_FAILED", msg, true);
    }
    this.logger.nbLog("info", "STK500v2", `[ENTER_PROGMODE] OK`);
  }

  async leaveProgrammingMode(): Promise<void> {
    this.logger.nbLog("debug", "STK500v2", `[LEAVE_PROGMODE] sending`);
    const resp = this.decodeResp(await this.sendCmd(Cmnd_STK_LEAVE_PROGMODE, []));
    if (resp.status !== Resp_STK_OK) {
      this.logger.nbLog("warn", "STK500v2", `[LEAVE_PROGMODE] non-OK status: 0x${resp.status?.toString(16)}`);
    } else {
      this.logger.nbLog("debug", "STK500v2", `[LEAVE_PROGMODE] OK`);
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
      const msg = `Failed to load address 0x${address.toString(16)} (status: 0x${resp.status?.toString(16)})`;
      this.logger.nbLog("error", "STK500v2", `[LOAD_ADDRESS] ${msg}`);
      throw new UploadError("LOAD_ADDRESS_FAILED", msg, true);
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
      const msg = `Failed to program page (status: 0x${resp.status?.toString(16)})`;
      this.logger.nbLog("error", "STK500v2", `[PROG_PAGE] ${msg}`);
      throw new UploadError("PROG_PAGE_FAILED", msg, true);
    }
  }

  async readSignature(): Promise<number[]> {
    this.logger.nbLog("debug", "STK500v2", `[READ_SIGNATURE] sending`);
    const resp = this.decodeResp(await this.sendCmd(Cmnd_STK_READ_SIGNATURE, []));
    this.logger.nbLog("info", "STK500v2", `[READ_SIGNATURE] sig=[${resp.data}]`);
    return resp.data;
  }

  private async sendCmd(cmd: number, payload: number[]): Promise<number[]> {
    this.seq++;
    const body = [cmd, ...payload];
    const checksum = this.crc8([MESSAGE_START, this.seq, TOKEN, body.length, ...body]);
    const buffer = [MESSAGE_START, this.seq, TOKEN, body.length, ...body, checksum];
    const cmdName = CMD_NAMES[cmd] ?? `0x${cmd.toString(16)}`;

    const writeResult = await this.connection.writeBytes(buffer);
    if (!writeResult || writeResult.bytesWritten !== buffer.length) {
      const msg = `WRITE_FAILED cmd=${cmdName} sent=${buffer.length}B written=${writeResult?.bytesWritten ?? "?"}B`;
      this.logger.nbLog("error", "STK500v2", `[CMD=${cmdName}] ${msg}`);
      throw new UploadError("WRITE_FAILED", msg, true);
    }

    const readResult = await this.connection.readBytes(5000);
    const raw = readResult.bytes ?? [];
    if (raw.length < 6) {
      const msg = `TIMEOUT cmd=${cmdName} expected>=6 got=${raw.length}B raw=${hex(raw)}`;
      this.logger.nbLog("error", "STK500v2", `[CMD=${cmdName}] ${msg}`);
      throw new UploadTimeoutError(5000);
    }

    this.logger.nbLog("debug", "STK500v2", `[CMD=${cmdName}] sent=${hex(buffer)} rawResp=${hex(raw)}`);
    return raw;
  }

  private decodeResp(raw: number[]): { status: number; data: number[] } {
    if (raw[0] !== MESSAGE_START) {
      const msg = `Invalid response start byte: 0x${raw[0]?.toString(16)} raw=${hex(raw)}`;
      this.logger.nbLog("error", "STK500v2", `[DECODE] ${msg}`);
      throw new UploadError("INVALID_RESPONSE", msg, true);
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
