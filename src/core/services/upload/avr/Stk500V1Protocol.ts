import type { ConnectionAdapter } from "../../../types/hardware";
import type { LoggerService } from "../../logging/LoggerService";
import { UploadError, UploadTimeoutError } from "../../../types/upload/error";

const STK_OK = 0x14;

const Cmnd_STK_GET_SYNC = 0x30;
const Cmnd_STK_ENTER_PROGMODE = 0x50;
const Cmnd_STK_LEAVE_PROGMODE = 0x51;
const Cmnd_STK_LOAD_ADDRESS = 0x55;
const Cmnd_STK_PROG_PAGE = 0x64;
const Cmnd_STK_READ_SIGNATURE = 0x75;
const Sync_CRC_EOP = 0x20;

export class STK500V1Protocol {
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
        const resp = await this.command(Cmnd_STK_GET_SYNC, [Sync_CRC_EOP], 1);
        if (resp[0] === STK_OK) return;
      } catch {
        if (attempt === 2) throw new UploadTimeoutError(10000);
      }
    }
    throw new UploadTimeoutError(10000);
  }

  async enterProgrammingMode(): Promise<void> {
    const resp = await this.command(Cmnd_STK_ENTER_PROGMODE, [Sync_CRC_EOP], 1);
    if (resp[0] !== STK_OK) {
      throw new UploadError("ENTER_PROGMODE_FAILED", "Failed to enter programming mode", true);
    }
  }

  async leaveProgrammingMode(): Promise<void> {
    const resp = await this.command(Cmnd_STK_LEAVE_PROGMODE, [Sync_CRC_EOP], 1);
    if (resp[0] !== STK_OK) {
      this.logger.warn("STK500V1", "Leave programming mode returned non-OK");
    }
  }

  async loadAddress(address: number): Promise<void> {
    const addrLow = address & 0xFF;
    const addrHigh = (address >> 8) & 0xFF;
    const resp = await this.command(Cmnd_STK_LOAD_ADDRESS, [addrLow, addrHigh, Sync_CRC_EOP], 1);
    if (resp[0] !== STK_OK) {
      throw new UploadError("LOAD_ADDRESS_FAILED", `Failed to load address 0x${address.toString(16)}`, true);
    }
  }

  async programPage(pageData: number[], pageSize: number): Promise<void> {
    const sizeLow = pageSize & 0xFF;
    const sizeHigh = (pageSize >> 8) & 0xFF;
    const data = [sizeLow, sizeHigh, ...pageData, Sync_CRC_EOP];
    const resp = await this.command(Cmnd_STK_PROG_PAGE, data, 2);
    if (resp[0] !== STK_OK) {
      throw new UploadError("PROG_PAGE_FAILED", "Failed to program page", true);
    }
  }

  async readSignature(): Promise<number[]> {
    const resp = await this.command(Cmnd_STK_READ_SIGNATURE, [Sync_CRC_EOP], 4);
    return resp.slice(0, 3);
  }

  private async command(cmd: number, data: number[], expectedLen: number): Promise<number[]> {
    this.seq++;
    const buffer = [cmd, ...data];
    const writeResult = await this.connection.writeBytes(buffer);
    if (!writeResult || writeResult.bytesWritten !== buffer.length) {
      throw new UploadError("WRITE_FAILED", "Failed to write command bytes", true);
    }

    const readResult = await this.connection.readBytes(5000);
    const bytes = readResult.bytes ?? [];
    if (bytes.length < expectedLen) {
      throw new UploadTimeoutError(5000);
    }
    return bytes.slice(0, expectedLen);
  }
}
