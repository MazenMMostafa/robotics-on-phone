// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ThemeService } from "../../services/theme/ThemeService";
import { LoggerService } from "../../services/logging/LoggerService";

function mockMatchMedia(matches: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
}

describe("ThemeService", () => {
  let theme: ThemeService;
  let logger: LoggerService;

  beforeEach(() => {
    mockMatchMedia(false);
    logger = new LoggerService();
    theme = new ThemeService(logger);
  });

  afterEach(() => {
    theme.destroy();
  });

  it("defaults to system mode", () => {
    expect(theme.getMode()).toBe("system");
  });

  it("setMode changes mode", () => {
    theme.setMode("dark");
    expect(theme.getMode()).toBe("dark");
    theme.setMode("light");
    expect(theme.getMode()).toBe("light");
  });

  it("getCurrentTheme returns a theme after init", () => {
    theme.init();
    const t = theme.getCurrentTheme();
    expect(["light", "dark"]).toContain(t);
  });

  it("setMode updates current theme", () => {
    theme.init();
    theme.setMode("light");
    expect(theme.getCurrentTheme()).toBe("light");
    theme.setMode("dark");
    expect(theme.getCurrentTheme()).toBe("dark");
  });

  it("init adds class to document", () => {
    theme.init();
    theme.setMode("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    theme.setMode("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
