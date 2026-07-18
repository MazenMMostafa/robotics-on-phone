import { describe, it, expect } from "vitest";
import { BluetoothConnection } from "../../services/hardware/connections/BluetoothConnection";

describe("BluetoothConnection", () => {
  it("starts disconnected", () => {
    const conn = new BluetoothConnection();
    expect(conn.state).toBe("disconnected");
    expect(conn.isConnected()).toBe(false);
  });

  it("type is bluetooth", () => {
    const conn = new BluetoothConnection();
    expect(conn.type).toBe("bluetooth");
  });

  it("connect throws stub", async () => {
    const conn = new BluetoothConnection();
    await expect(conn.connect()).rejects.toThrow("Bluetooth not implemented (stub)");
  });
});
