import { describe, it, expect, beforeEach, vi } from "vitest";
import { LoggerService } from "../../../services/logging/LoggerService";
import { STK500V1Protocol } from "../../../services/upload/avr/Stk500V1Protocol";
import type { ConnectionAdapter } from "../../../types/hardware";
import { UploadTimeoutError } from "../../../types/upload/error";

const STK_OK = { data: "", bytes: [0x14] };
const NOT_OK = { data: "", bytes: [0x15] };

function createMockConnection(): ConnectionAdapter {
  return {
    type: "usb" as const,
    state: "connected" as const,
    connect: vi.fn(),
    disconnect: vi.fn(),
    read: vi.fn(),
    write: vi.fn(),
    writeBytes: vi.fn().mockImplementation((buffer: number[]) => Promise.resolve({ bytesWritten: buffer.length })),
    readBytes: vi.fn().mockResolvedValue({ data: "", bytes: [0x14, 0x10, 0x00, 0x00] }),
    flush: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
  };
}

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

describe("STK500V1Protocol", () => {
  let connection: ConnectionAdapter;
  let protocol: STK500V1Protocol;

  beforeEach(() => {
    vi.clearAllMocks();
    connection = createMockConnection();
    protocol = new STK500V1Protocol(connection, mockLogger as unknown as LoggerService);
  });

  it("sync succeeds on first attempt", async () => {
    await expect(protocol.sync()).resolves.toBeUndefined();
  });

  it("sync retries on failure", async () => {
    vi.mocked(connection.readBytes)
      .mockResolvedValueOnce(NOT_OK)
      .mockResolvedValueOnce(NOT_OK)
      .mockResolvedValueOnce(STK_OK);
    await expect(protocol.sync()).resolves.toBeUndefined();
  });

  it("sync throws Timeout if never gets STK_OK", async () => {
    vi.mocked(connection.readBytes).mockResolvedValue(NOT_OK);
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
    vi.mocked(connection.readBytes).mockResolvedValue(NOT_OK);
    await expect(protocol.enterProgrammingMode()).rejects.toThrow();
  });

  it("leaveProgrammingMode handles non-OK response", async () => {
    vi.mocked(connection.readBytes).mockResolvedValue(NOT_OK);
    await expect(protocol.leaveProgrammingMode()).resolves.toBeUndefined();
  });

  it("loadAddress succeeds", async () => {
    await expect(protocol.loadAddress(0)).resolves.toBeUndefined();
  });

  it("loadAddress throws on failure", async () => {
    vi.mocked(connection.readBytes).mockResolvedValue(NOT_OK);
    await expect(protocol.loadAddress(0)).rejects.toThrow();
  });

  it("programPage succeeds", async () => {
    await expect(protocol.programPage(new Array(128).fill(0xFF), 128)).resolves.toBeUndefined();
  });

  it("programPage throws on failure", async () => {
    vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: [0x15, 0x10] });
    await expect(protocol.programPage(new Array(128).fill(0xFF), 128)).rejects.toThrow();
  });

  it("readSignature returns 3 bytes", async () => {
    vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: [0x1E, 0x95, 0x0F, 0x14] });
    const sig = await protocol.readSignature();
    expect(sig).toHaveLength(3);
    expect(sig).toEqual([0x1E, 0x95, 0x0F]);
  });

  it("throws on empty read", async () => {
    vi.mocked(connection.readBytes).mockResolvedValue({ data: "", bytes: [] });
    await expect(protocol.sync()).rejects.toThrow(UploadTimeoutError);
  });
});
