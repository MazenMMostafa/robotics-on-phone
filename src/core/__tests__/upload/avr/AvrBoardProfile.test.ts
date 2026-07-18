import { describe, it, expect } from "vitest";
import { getAvrBoardProfile, isAvrBoard } from "../../../services/upload/avr/AvrBoardProfile";

describe("AvrBoardProfile", () => {
  it("returns profile for uno", () => {
    const p = getAvrBoardProfile("uno");
    expect(p).toBeDefined();
    expect(p?.mcu).toBe("ATmega328P");
    expect(p?.protocol).toBe("stk500v1");
    expect(p?.pageSize).toBe(128);
    expect(p?.signature).toEqual([0x1E, 0x95, 0x0F]);
  });

  it("returns profile for nano", () => {
    const p = getAvrBoardProfile("nano");
    expect(p).toBeDefined();
    expect(p?.mcu).toBe("ATmega328P");
    expect(p?.protocol).toBe("stk500v1");
  });

  it("returns profile for mega", () => {
    const p = getAvrBoardProfile("mega");
    expect(p).toBeDefined();
    expect(p?.mcu).toBe("ATmega2560");
    expect(p?.protocol).toBe("stk500v2");
    expect(p?.pageSize).toBe(256);
    expect(p?.signature).toEqual([0x1E, 0x98, 0x01]);
  });

  it("returns undefined for unknown board", () => {
    expect(getAvrBoardProfile("esp32")).toBeUndefined();
  });

  it("isAvrBoard returns true for AVR boards", () => {
    expect(isAvrBoard("uno")).toBe(true);
    expect(isAvrBoard("nano")).toBe(true);
    expect(isAvrBoard("mega")).toBe(true);
  });

  it("isAvrBoard returns false for non-AVR boards", () => {
    expect(isAvrBoard("esp32")).toBe(false);
    expect(isAvrBoard("pico")).toBe(false);
  });

  it("has correct flash sizes", () => {
    expect(getAvrBoardProfile("uno")?.flashSize).toBe(32256);
    expect(getAvrBoardProfile("nano")?.flashSize).toBe(30720);
    expect(getAvrBoardProfile("mega")?.flashSize).toBe(253952);
  });

  it("has correct reset configuration", () => {
    const p = getAvrBoardProfile("uno");
    expect(p?.resetBaudRate).toBe(1200);
    expect(p?.resetWaitMs).toBe(2000);
  });
});
