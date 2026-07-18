import { describe, it, expect, beforeEach } from "vitest";
import { SerialConnection } from "../../services/hardware/connections/SerialConnection";

describe("SerialConnection", () => {
  let conn: SerialConnection;

  beforeEach(() => {
    conn = new SerialConnection();
  });

  it("starts disconnected", () => {
    expect(conn.state).toBe("disconnected");
    expect(conn.isConnected()).toBe(false);
  });

  it("type is serial", () => {
    expect(conn.type).toBe("serial");
  });

  it("connect throws not implemented", async () => {
    await expect(conn.connect()).rejects.toThrow("Serial not implemented");
  });
});
