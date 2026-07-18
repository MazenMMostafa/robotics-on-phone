import { describe, it, expect, beforeEach, vi } from "vitest";
import { LoggerService } from "../../../services/logging/LoggerService";
import { STK500V2Protocol } from "../../../services/upload/avr/Stk500V2Protocol";
import type { ConnectionAdapter } from "../../../types/hardware";
import { UploadTimeoutError } from "../../../types/upload/error";

function makeV2Resp(status: number, data: number[] = []): number[] {
  const body = [status, ...data];
  const msg = [0x1B, 0x01, 0x0E, body.length, ...body];
  let crc = 0;
  for (const b of msg) { crc ^= b; for (let i = 0; i < 8; i++) { if (crc & 0x80) crc = (crc << 1) ^ 0x07; else crc <<= 1; crc &= 0xFF; } }
  msg.push(crc);
  return msg;
}

function createMockConnection(): ConnectionAdapter {
  return {
    type: "usb" as const,
    state: "connected" as const,
    connect: vi.fn(),
    disconnect: vi.fn(),
    read: vi.fn(),
    write: vi.fn(),
    writeBytes: vi.fn().mockImplementation((buffer: number[]) => Promise.resolve({ bytesWritten: buffer.length })),
    readBytes: vi.fn().mockResolvedValue({ data: "", bytes: makeV2Resp(0x10) }),
    flush: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
  };
}

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

describe("STK500V2Protocol", () => {
  let connection: ConnectionAdapter;
  let protocol: STK500V2Protocol;

  beforeEach(() => {
    vi.clearAllMocks();
    connection = createMockConnection();
    protocol = new STK500V2Protocol(connection, mockLogger as unknown as LoggerService);
  });

  it("sync succeeds", async () => {
    await expect(protocol.sync()).resolves.toBeUndefined();
  });

  it("sync retries and succeeds", async () => {
    vi.mocked(connection.readBytes)
      .mockResolvedValueOnce({ data: "", bytes: makeV2Resp(0x11) })
      .mockResolvedValueOnce({ data: "", bytes: makeV2Resp(0x10) });
    await expect(protocol.sync()).resolves.toBeUndefined();
  });

  it("sync throws Timeout if never gets OK", async () => {
    vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: makeV2Resp(0x11) });
    await expect(protocol.sync()).rejects.toThrow(UploadTimeoutError);
  });

  it("sync throws Timeout on write failure", async () => {
    vi.mocked(connection.writeBytes).mockResolvedValue({ bytesWritten: 0 });
    await expect(protocol.sync()).rejects.toThrow(UploadTimeoutError);
  });

  it("enterProgrammingMode succeeds", async () => {
    await expect(protocol.enterProgrammingMode()).resolves.toBeUndefined();
  });

  it("enterProgrammingMode throws on failure", async () => {
    vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: makeV2Resp(0x11) });
    await expect(protocol.enterProgrammingMode()).rejects.toThrow();
  });

  it("leaveProgrammingMode handles non-OK response", async () => {
    vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: makeV2Resp(0x11) });
    await expect(protocol.leaveProgrammingMode()).resolves.toBeUndefined();
  });

  it("loadAddress succeeds", async () => {
    await expect(protocol.loadAddress(0)).resolves.toBeUndefined();
  });

  it("loadAddress throws on failure", async () => {
    vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: makeV2Resp(0x11) });
    await expect(protocol.loadAddress(0)).rejects.toThrow();
  });

  it("programPage succeeds", async () => {
    await expect(protocol.programPage(new Array(256).fill(0xFF), 256)).resolves.toBeUndefined();
  });

  it("programPage throws on failure", async () => {
    vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: makeV2Resp(0x11) });
    await expect(protocol.programPage(new Array(256).fill(0xFF), 256)).rejects.toThrow();
  });

  it("readSignature returns data bytes", async () => {
    vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: makeV2Resp(0x10, [0x1E, 0x98, 0x01]) });
    const sig = await protocol.readSignature();
    expect(sig).toEqual([0x1E, 0x98, 0x01]);
  });

  it("throws on short read", async () => {
    vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: [0x01, 0x02] });
    await expect(protocol.sync()).rejects.toThrow(UploadTimeoutError);
  });

  it("throws on invalid response start byte", async () => {
    const bad = makeV2Resp(0x10);
    bad[0] = 0xFF;
    vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: bad });
    await expect(protocol.sync()).rejects.toThrow();
  });
});
