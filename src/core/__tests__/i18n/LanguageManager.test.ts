// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { LanguageManager } from "../../services/i18n/LanguageManager";
import { LoggerService } from "../../services/logging/LoggerService";

describe("LanguageManager", () => {
  let lm: LanguageManager;
  let logger: LoggerService;

  beforeEach(() => {
    logger = new LoggerService();
    lm = new LanguageManager(logger);
    lm.init();
  });

  it("defaults to English", () => {
    expect(lm.getCurrentLanguage()).toBe("en");
  });

  it("getLanguages returns builtin languages", () => {
    const langs = lm.getLanguages();
    expect(langs.length).toBeGreaterThanOrEqual(2);
    expect(langs.find((l) => l.code === "en")?.rtl).toBe(false);
    expect(langs.find((l) => l.code === "ar")?.rtl).toBe(true);
  });

  it("isRTL returns false for English", () => {
    expect(lm.isRTL()).toBe(false);
  });

  it("translate returns key when no translation", () => {
    expect(lm.translate("nonexistent.key")).toBe("nonexistent.key");
  });

  it("translate returns loaded translation", async () => {
    lm.registerLoader("en", async () => ({ "hello": "Hello" }));
    await lm.setLanguage("en");
    expect(lm.translate("hello")).toBe("Hello");
  });

  it("translate substitutes params", async () => {
    lm.registerLoader("en", async () => ({ "greeting": "Hello {name}" }));
    await lm.setLanguage("en");
    expect(lm.translate("greeting", { name: "World" })).toBe("Hello World");
  });

  it("setLanguage updates document lang and dir", async () => {
    lm.registerLoader("ar", async () => ({}));
    await lm.setLanguage("ar");
    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
  });

  it("getTranslationMap returns current translations", async () => {
    lm.registerLoader("en", async () => ({ key: "val" }));
    await lm.setLanguage("en");
    expect(lm.getTranslationMap()).toEqual({ key: "val" });
  });

  it("falls back to key for missing translations", async () => {
    lm.registerLoader("en", async () => ({ existing: "yes" }));
    await lm.setLanguage("en");
    expect(lm.translate("missing")).toBe("missing");
    expect(lm.translate("existing")).toBe("yes");
  });

  it("registerLoader does not throw", () => {
    expect(() => lm.registerLoader("fr", async () => ({}))).not.toThrow();
  });
});
