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
        this.logger.nbLog("debug", "STK500v1", `[SYNC] attempt ${attempt + 1}/3`);
        const resp = await this.command(Cmnd_STK_GET_SYNC, [Sync_CRC_EOP], 1);
        if (resp[0] === STK_OK) {
          this.logger.nbLog("info", "STK500v1", `[SYNC] OK on attempt ${attempt + 1}`);
          return;
        }
        this.logger.nbLog("warn", "STK500v1", `[SYNC] unexpected response: 0x${resp[0]?.toString(16)} on attempt ${attempt + 1}`);
      } catch (e) {
        this.logger.nbLog("warn", "STK500v1", `[SYNC] attempt ${attempt + 1} error: ${e instanceof Error ? e.message : String(e)}`);
        if (attempt === 2) throw new UploadTimeoutError(10000);
      }
    }
    throw new UploadTimeoutError(10000);
  }

  async enterProgrammingMode(): Promise<void> {
    this.logger.nbLog("debug", "STK500v1", `[ENTER_PROGMODE] sending`);
    const resp = await this.command(Cmnd_STK_ENTER_PROGMODE, [Sync_CRC_EOP], 1);
    if (resp[0] !== STK_OK) {
      const msg = `Failed to enter programming mode (response: 0x${resp[0]?.toString(16)})`;
      this.logger.nbLog("error", "STK500v1", `[ENTER_PROGMODE] ${msg}`);
      throw new UploadError("ENTER_PROGMODE_FAILED", msg, true);
    }
    this.logger.nbLog("info", "STK500v1", `[ENTER_PROGMODE] OK`);
  }

  async leaveProgrammingMode(): Promise<void> {
    this.logger.nbLog("debug", "STK500v1", `[LEAVE_PROGMODE] sending`);
    const resp = await this.command(Cmnd_STK_LEAVE_PROGMODE, [Sync_CRC_EOP], 1);
    if (resp[0] !== STK_OK) {
      this.logger.nbLog("warn", "STK500v1", `[LEAVE_PROGMODE] non-OK response: 0x${resp[0]?.toString(16)}`);
    } else {
      this.logger.nbLog("debug", "STK500v1", `[LEAVE_PROGMODE] OK`);
    }
  }

  async loadAddress(address: number): Promise<void> {
    const addrLow = address & 0xFF;
    const addrHigh = (address >> 8) & 0xFF;
    const resp = await this.command(Cmnd_STK_LOAD_ADDRESS, [addrLow, addrHigh, Sync_CRC_EOP], 1);
    if (resp[0] !== STK_OK) {
      const msg = `Failed to load address 0x${address.toString(16)} (response: 0x${resp[0]?.toString(16)})`;
      this.logger.nbLog("error", "STK500v1", `[LOAD_ADDRESS] ${msg}`);
      throw new UploadError("LOAD_ADDRESS_FAILED", msg, true);
    }
  }

  async programPage(pageData: number[], pageSize: number): Promise<void> {
    const sizeLow = pageSize & 0xFF;
    const sizeHigh = (pageSize >> 8) & 0xFF;
    const data = [sizeLow, sizeHigh, ...pageData, Sync_CRC_EOP];
    const resp = await this.command(Cmnd_STK_PROG_PAGE, data, 2);
    if (resp[0] !== STK_OK) {
      const msg = `Failed to program page (response: ${hex(resp)})`;
      this.logger.nbLog("error", "STK500v1", `[PROG_PAGE] ${msg}`);
      throw new UploadError("PROG_PAGE_FAILED", msg, true);
    }
  }

  async readSignature(): Promise<number[]> {
    this.logger.nbLog("debug", "STK500v1", `[READ_SIGNATURE] sending`);
    const resp = await this.command(Cmnd_STK_READ_SIGNATURE, [Sync_CRC_EOP], 4);
    const sig = resp.slice(0, 3);
    this.logger.nbLog("info", "STK500v1", `[READ_SIGNATURE] sig=[${sig}] full=[${hex(resp)}]`);
    return sig;
  }

  private async command(cmd: number, data: number[], expectedLen: number): Promise<number[]> {
    this.seq++;
    const buffer = [cmd, ...data];
    const cmdName = CMD_NAMES[cmd] ?? `0x${cmd.toString(16)}`;

    const writeResult = await this.connection.writeBytes(buffer);
    if (!writeResult || writeResult.bytesWritten !== buffer.length) {
      const msg = `WRITE_FAILED cmd=${cmdName} sent=${buffer.length}B written=${writeResult?.bytesWritten ?? "?"}B`;
      this.logger.nbLog("error", "STK500v1", `[CMD=${cmdName}] ${msg}`);
      throw new UploadError("WRITE_FAILED", msg, true);
    }

    const readResult = await this.connection.readBytes(5000);
    const bytes = readResult.bytes ?? [];
    if (bytes.length < expectedLen) {
      const msg = `TIMEOUT cmd=${cmdName} expected>=${expectedLen} got=${bytes.length}B`;
      this.logger.nbLog("error", "STK500v1", `[CMD=${cmdName}] ${msg}`);
      throw new UploadTimeoutError(5000);
    }

    const resp = bytes.slice(0, expectedLen);
    this.logger.nbLog("debug", "STK500v1", `[CMD=${cmdName}] sent=${hex(buffer)} resp=${hex(resp)}`);
    return resp;
  }
}
