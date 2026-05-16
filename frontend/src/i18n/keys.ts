import type es from './es.json';

/**
 * Strongly-typed i18n key union (derived from `es.json`, the source-of-truth
 * resource). Use `tk()` to assert a dynamically-built key string is a real
 * translation key — keeps `useTranslation().t()` type-safe under the strict
 * `CustomTypeOptions` resource typing without scattering casts.
 */
export type I18nKey = keyof typeof es;

export function tk(key: string): I18nKey {
  return key as I18nKey;
}
