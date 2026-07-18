import { EventBus } from "../extension/EventBus";
import type { LoggerService } from "../logging/LoggerService";

export type ThemeMode = "light" | "dark" | "system";
export const THEME_CHANGED = "theme:changed";

export class ThemeService {
  private currentMode: ThemeMode = "system";
  private currentTheme: "light" | "dark" = "light";
  private logger: LoggerService;
  private mediaQuery: MediaQueryList | null = null;
  private mediaListener: (() => void) | null = null;

  constructor(logger: LoggerService) {
    this.logger = logger;
  }

  init(): void {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    this.mediaListener = () => {
      if (this.currentMode === "system") {
        this.applyTheme(this.mediaQuery!.matches ? "dark" : "light");
      }
    };
    this.mediaQuery.addEventListener("change", this.mediaListener);
  }

  destroy(): void {
    if (this.mediaQuery && this.mediaListener) {
      this.mediaQuery.removeEventListener("change", this.mediaListener);
    }
  }

  getMode(): ThemeMode {
    return this.currentMode;
  }

  getCurrentTheme(): "light" | "dark" {
    return this.currentTheme;
  }

  setMode(mode: ThemeMode): void {
    this.currentMode = mode;
    this.resolveAndApply();
  }

  private resolveAndApply(): void {
    let theme: "light" | "dark";
    if (this.currentMode === "system") {
      theme = this.mediaQuery?.matches ? "dark" : "light";
    } else {
      theme = this.currentMode;
    }
    this.applyTheme(theme);
  }

  private applyTheme(theme: "light" | "dark"): void {
    if (this.currentTheme === theme) return;
    this.currentTheme = theme;

    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(theme);
    }

    EventBus.emit(THEME_CHANGED, { theme });
    this.logger.debug("ThemeService", `Theme changed to ${theme}`);
  }
}
