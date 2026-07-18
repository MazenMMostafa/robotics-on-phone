import { EventBus } from "../extension/EventBus";
import type { LoggerService } from "../logging/LoggerService";

export type Translations = Record<string, string>;
export type LanguageCode = string;

export const LANGUAGE_CHANGED = "i18n:languageChanged";

export interface LanguageDescriptor {
  code: LanguageCode;
  name: string;
  nativeName: string;
  rtl: boolean;
}

const BUILTIN_LANGUAGES: LanguageDescriptor[] = [
  { code: "en", name: "English", nativeName: "English", rtl: false },
  { code: "ar", name: "Arabic", nativeName: "العربية", rtl: true },
];

export class LanguageManager {
  private currentLanguage: LanguageCode = "en";
  private fallbackLanguage: LanguageCode = "en";
  private translations: Map<LanguageCode, Translations> = new Map();
  private fallbackTranslations: Translations = {};
  private loadedLanguages: Set<LanguageCode> = new Set();
  private logger: LoggerService;
  private loaders: Map<LanguageCode, () => Promise<Translations>> = new Map();

  constructor(logger: LoggerService) {
    this.logger = logger;
  }

  init(): void {
  }

  getCurrentLanguage(): LanguageCode {
    return this.currentLanguage;
  }

  getLanguages(): LanguageDescriptor[] {
    return BUILTIN_LANGUAGES;
  }

  isRTL(): boolean {
    const lang = BUILTIN_LANGUAGES.find((l) => l.code === this.currentLanguage);
    return lang?.rtl ?? false;
  }

  registerLoader(lang: LanguageCode, loader: () => Promise<Translations>): void {
    this.loaders.set(lang, loader);
  }

  async setLanguage(lang: LanguageCode): Promise<void> {
    await this.ensureLoaded(lang);

    if (this.currentLanguage === lang) return;

    this.currentLanguage = lang;

    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = this.isRTL() ? "rtl" : "ltr";
    }

    EventBus.emit(LANGUAGE_CHANGED, { language: lang });
    this.logger.info("LanguageManager", `Language changed to ${lang}`);
  }

  translate(key: string, params?: Record<string, string | number>): string {
    const langTranslations = this.translations.get(this.currentLanguage);
    let msg = langTranslations?.[key] ?? this.fallbackTranslations[key] ?? key;

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        msg = msg.replace(`{${k}}`, String(v));
      }
    }

    return msg;
  }

  getTranslationMap(): Translations {
    return this.translations.get(this.currentLanguage) ?? {};
  }

  private async ensureLoaded(lang: LanguageCode): Promise<void> {
    if (this.loadedLanguages.has(lang)) return;

    const loader = this.loaders.get(lang);
    if (!loader) {
      this.logger.warn("LanguageManager", `No loader for language "${lang}"`);
      return;
    }

    try {
      const translations = await loader();
      this.translations.set(lang, translations);
      this.loadedLanguages.add(lang);

      if (lang === this.fallbackLanguage) {
        this.fallbackTranslations = translations;
      }
    } catch (e) {
      this.logger.error("LanguageManager", `Failed to load language "${lang}"`, e);
    }
  }
}
