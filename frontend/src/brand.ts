/**
 * Brand identity is env-driven, never hardcoded into components.
 * Components read `BRAND` (or the i18n `brand.*` keys) — never a literal string.
 */
export const BRAND = {
  name: import.meta.env.VITE_BRAND_NAME ?? 'Expediente Público',
  tagline: import.meta.env.VITE_BRAND_TAGLINE ?? '',
} as const;

export type Brand = typeof BRAND;
