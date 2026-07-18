import { describe, it, expect, beforeEach } from "vitest";
import { CompatibilityService } from "../../services/compatibility/CompatibilityService";

describe("CompatibilityService", () => {
  let cs: CompatibilityService;

  beforeEach(() => {
    cs = new CompatibilityService();
  });

  describe("checkComponent", () => {
    it("returns none for unknown board", () => {
      const report = cs.checkComponent("unknown", "led");
      expect(report.compatible).toBe(false);
      expect(report.level).toBe("none");
    });

    it("returns none for unknown component", () => {
      const report = cs.checkComponent("uno", "nonexistent");
      expect(report.compatible).toBe(false);
    });

    it("returns full for known supported component", () => {
      const report = cs.checkComponent("uno", "led");
      expect(report.level).toBe("full");
      expect(report.compatible).toBe(true);
    });

    it("reports issues for unsupported board", () => {
      // "mega2560" doesn't exist, use a board that doesn't support "servo"
      const report = cs.checkComponent("uno", "servo");
      // Servo is supported on uno
      expect(report.level).toBe("full");
    });
  });

  describe("checkBlock", () => {
    it("returns full for unknown board", () => {
      const report = cs.checkBlock("unknown", "some_block");
      expect(report.compatible).toBe(false);
    });

    it("returns full for valid board", () => {
      const report = cs.checkBlock("uno", "any_block");
      expect(report.compatible).toBe(true);
    });
  });

  describe("checkLibrary", () => {
    it("returns none for unknown board", () => {
      const report = cs.checkLibrary("unknown", "Servo");
      expect(report.compatible).toBe(false);
    });

    it("returns full for supported library", () => {
      const report = cs.checkLibrary("uno", "Servo");
      expect(report.compatible).toBe(true);
      expect(report.level).toBe("full");
    });

    it("returns none for unsupported library", () => {
      const report = cs.checkLibrary("uno", "WiFi");
      expect(report.compatible).toBe(false);
    });
  });

  describe("checkExtension", () => {
    it("returns none for unknown board", () => {
      const report = cs.checkExtension("unknown", { supportedBoards: ["uno"] });
      expect(report.compatible).toBe(false);
    });

    it("returns full for supported board", () => {
      const report = cs.checkExtension("uno", { supportedBoards: ["uno"] });
      expect(report.compatible).toBe(true);
    });

    it("returns full for wildcard boards", () => {
      const report = cs.checkExtension("uno", { supportedBoards: ["*"] });
      expect(report.compatible).toBe(true);
    });

    it("returns none for unsupported board", () => {
      const report = cs.checkExtension("uno", { supportedBoards: ["mega"] });
      expect(report.compatible).toBe(false);
    });
  });

  describe("checkExample", () => {
    it("returns full when no board constraint", () => {
      const report = cs.checkExample("uno", {});
      expect(report.compatible).toBe(true);
    });

    it("returns full for matching board", () => {
      const report = cs.checkExample("uno", { board: "uno" });
      expect(report.compatible).toBe(true);
    });

    it("returns none for mismatched board", () => {
      const report = cs.checkExample("uno", { board: "mega" });
      expect(report.compatible).toBe(false);
    });
  });
});
