import { useLanguage } from './LanguageProvider';
import { dictionary, type TranslationKey } from './dictionary';

export function useTranslation() {
  const { language, dir, isRTL, setLanguage, toggleLanguage } = useLanguage();

  const t = (key: TranslationKey, fallback?: string): string => {
    const entry = dictionary[key];
    if (entry) {
      return entry[language];
    }
    return fallback ?? key;
  };

  return {
    t,
    language,
    dir,
    isRTL,
    setLanguage,
    toggleLanguage,
  };
}
