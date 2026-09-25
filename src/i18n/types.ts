export type SupportedLanguage = 'ar' | 'en';

export type Direction = 'rtl' | 'ltr';

export interface DictionaryEntry {
  ar: string;
  en: string;
}

export type Dictionary = Record<string, DictionaryEntry>;

export interface LanguageContextValue {
  language: SupportedLanguage;
  dir: Direction;
  isRTL: boolean;
  setLanguage: (lang: SupportedLanguage) => void;
  toggleLanguage: () => void;
}
