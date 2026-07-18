import type { ConnectionAdapter } from "../../../types/hardware";
import type { LoggerService } from "../../logging/LoggerService";
import type { EspResetStrategy as EspResetStrategyType } from "../../../types/upload/esp32/board";

export interface ResetResult {
  success: boolean;
  inBootloader: boolean;
}

type StrategyHandler = (
  connection: ConnectionAdapter,
  baudRate: number,
  waitMs: number,
  logger: LoggerService,
) => Promise<ResetResult>;

const strategyHandlers: Record<EspResetStrategyType, StrategyHandler> = {
  en_pin: handleEnPinReset,
  boot_pin: handleBootPinReset,
  usb: handleUsbReset,
};

export async function executeReset(
  strategy: EspResetStrategyType,
  connection: ConnectionAdapter,
  baudRate: number,
  waitMs: number,
  logger: LoggerService,
): Promise<ResetResult> {
  const handler = strategyHandlers[strategy];
  if (!handler) {
    logger.warn("EspResetStrategy", `Unknown reset strategy: ${strategy}, falling back to boot_pin`);
    return handleBootPinReset(connection, baudRate, waitMs, logger);
  }
  return handler(connection, baudRate, waitMs, logger);
}

async function handleEnPinReset(
  connection: ConnectionAdapter,
  baudRate: number,
  _waitMs: number,
  _logger: LoggerService,
): Promise<ResetResult> {
  await connection.connect({ baudRate });
  await connection.flush();
  await sleep(100);
  await connection.disconnect();
  return { success: true, inBootloader: false };
}

async function handleBootPinReset(
  connection: ConnectionAdapter,
  baudRate: number,
  waitMs: number,
  _logger: LoggerService,
): Promise<ResetResult> {
  await connection.connect({ baudRate });
  await connection.flush();

  const bootPinSequence = [0x00, 0x00, 0x00, 0x00];
  await connection.writeBytes(bootPinSequence);
  await sleep(50);

  await connection.flush();
  await sleep(waitMs);
  await connection.disconnect();
  return { success: true, inBootloader: true };
}

async function handleUsbReset(
  connection: ConnectionAdapter,
  baudRate: number,
  waitMs: number,
  _logger: LoggerService,
): Promise<ResetResult> {
  await connection.connect({ baudRate });
  await connection.flush();
  await sleep(100);
  await connection.disconnect();
  await sleep(waitMs);
  return { success: true, inBootloader: true };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
