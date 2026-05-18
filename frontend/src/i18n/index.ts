import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import es from './es.json';
import en from './en.json';

export const SUPPORTED_LNGS = ['es', 'en'] as const;
export type AppLng = (typeof SUPPORTED_LNGS)[number];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
    },
    // ES is the project default (idea/00 — Guatemalan procurement, ES-first).
    fallbackLng: 'es',
    supportedLngs: SUPPORTED_LNGS as unknown as string[],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      // ES-first: ignore browser/HTML locale so the first load is always
      // Spanish (fallbackLng). Only an explicit ES/EN toggle (cached to
      // localStorage below) overrides it, and is remembered on later visits.
      order: ['localStorage'],
      lookupLocalStorage: 'ep.lang',
      caches: ['localStorage'],
    },
  });

// Keep <html lang> in sync for a11y + correct ES/EN hyphenation.
i18n.on('languageChanged', (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng.split('-')[0] ?? 'es';
  }
});

export default i18n;
