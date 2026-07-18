import { describe, it, expect } from "vitest";
import { getEspBoardProfile, isEspBoard } from "../../../types/upload/esp32/board";

describe("EspBoardProfile", () => {
  it("returns profile for esp32", () => {
    const p = getEspBoardProfile("esp32");
    expect(p).toBeDefined();
    expect(p?.chip).toBe("ESP32");
    expect(p?.flashMode).toBe("dio");
  });

  it("returns profile for esp32-s2", () => {
    const p = getEspBoardProfile("esp32-s2");
    expect(p).toBeDefined();
    expect(p?.chip).toBe("ESP32-S2");
  });

  it("returns profile for esp32-s3", () => {
    const p = getEspBoardProfile("esp32-s3");
    expect(p).toBeDefined();
    expect(p?.chip).toBe("ESP32-S3");
    expect(p?.bootMode).toBe("usb_cdc");
  });

  it("returns profile for esp32-c3", () => {
    const p = getEspBoardProfile("esp32-c3");
    expect(p).toBeDefined();
    expect(p?.chip).toBe("ESP32-C3");
    expect(p?.resetStrategy).toBe("en_pin");
  });

  it("returns undefined for unknown board", () => {
    expect(getEspBoardProfile("unknown")).toBeUndefined();
  });

  it("isEspBoard returns true for known boards", () => {
    expect(isEspBoard("esp32")).toBe(true);
    expect(isEspBoard("esp32-s3")).toBe(true);
  });

  it("isEspBoard returns false for unknown boards", () => {
    expect(isEspBoard("esp8266")).toBe(false);
    expect(isEspBoard("uno")).toBe(false);
  });

  it("has correct defaults for all profiles", () => {
    for (const id of ["esp32", "esp32-s2", "esp32-s3", "esp32-c3"]) {
      const p = getEspBoardProfile(id);
      expect(p?.defaultBaudRate).toBe(921600);
      expect(p?.resetBaudRate).toBe(115200);
      expect(p?.resetWaitMs).toBeGreaterThan(0);
    }
  });
});
