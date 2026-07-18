import { describe, it, expect } from "vitest";
import { WiFiConnection } from "../../services/hardware/connections/WiFiConnection";

describe("WiFiConnection", () => {
  it("starts disconnected", () => {
    const conn = new WiFiConnection();
    expect(conn.state).toBe("disconnected");
    expect(conn.isConnected()).toBe(false);
  });

  it("type is wifi", () => {
    const conn = new WiFiConnection();
    expect(conn.type).toBe("wifi");
  });

  it("connect throws stub", async () => {
    const conn = new WiFiConnection();
    await expect(conn.connect()).rejects.toThrow("WiFi not implemented (stub)");
  });
});
