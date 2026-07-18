import type { ConnectionAdapter } from "../../../types/hardware";
import type { LoggerService } from "../../logging/LoggerService";
import type { EspBootMode as EspBootModeType } from "../../../types/upload/esp32/board";

export interface BootResult {
  success: boolean;
  mode: EspBootModeType;
}

type BootHandler = (
  connection: ConnectionAdapter,
  baudRate: number,
  logger: LoggerService,
) => Promise<BootResult>;

const bootHandlers: Record<EspBootModeType, BootHandler> = {
  auto: handleAutoBoot,
  manual: handleManualBoot,
  usb_cdc: handleUsbCdcBoot,
};

export async function executeBoot(
  mode: EspBootModeType,
  connection: ConnectionAdapter,
  baudRate: number,
  logger: LoggerService,
): Promise<BootResult> {
  const handler = bootHandlers[mode];
  if (!handler) {
    logger.warn("EspBootMode", `Unknown boot mode: ${mode}, falling back to auto`);
    return handleAutoBoot(connection, baudRate, logger);
  }
  return handler(connection, baudRate, logger);
}

async function handleAutoBoot(
  connection: ConnectionAdapter,
  _baudRate: number,
  _logger: LoggerService,
): Promise<BootResult> {
  const ack = await connection.readBytes(100);
  const bytes = ack.bytes ?? [];
  const enteredBootloader = bytes.length > 0;
  return { success: enteredBootloader, mode: "auto" };
}

async function handleManualBoot(
  _connection: ConnectionAdapter,
  _baudRate: number,
  _logger: LoggerService,
): Promise<BootResult> {
  return { success: true, mode: "manual" };
}

async function handleUsbCdcBoot(
  _connection: ConnectionAdapter,
  _baudRate: number,
  _logger: LoggerService,
): Promise<BootResult> {
  return { success: true, mode: "usb_cdc" };
}
