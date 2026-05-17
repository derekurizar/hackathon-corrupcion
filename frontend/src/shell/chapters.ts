import type { Chapter } from '@/_scene-contract';
import type { I18nKey } from '@/i18n/keys';

/**
 * The fixed chapter spine (idea/05). Single source of truth shared by the
 * desktop rail, the mobile drawer and the transport ticks — explicit
 * chapter-key → slot mapping (no array-index arithmetic). Cover & Cierre
 * carry the "—" numeral.
 */
export const CHAPTER_ORDER: Chapter[] = [
  'cover',
  'elCaso',
  'sigueElDinero',
  'lasConexiones',
  'evidencia',
  'cronologia',
  'cierre',
];

/** Numeral per chapter slot — Cover & Cierre are unnumbered ("—"). */
export const CHAPTER_NUMERAL: Record<Chapter, string> = {
  cover: '—',
  elCaso: '01',
  sigueElDinero: '02',
  lasConexiones: '03',
  evidencia: '04',
  cronologia: '05',
  cierre: '—',
};

/** i18n label key per chapter. */
export const CHAPTER_LABEL_KEY: Record<Chapter, I18nKey> = {
  cover: 'chapter.cover',
  elCaso: 'chapter.elCaso',
  sigueElDinero: 'chapter.sigueElDinero',
  lasConexiones: 'chapter.lasConexiones',
  evidencia: 'chapter.evidencia',
  cronologia: 'chapter.cronologia',
  cierre: 'chapter.cierre',
};
