import type { Chapter } from '@/_scene-contract';

/**
 * The constant 7-chapter spine, in order — the same list `ArticleShell`
 * renders. Kept here so the PDF exporter walks chapters in the exact article
 * order. (`ArticleShell` keeps its own copy; deduping the three copies in the
 * codebase is an optional follow-up, out of scope here.)
 */
export const PDF_CHAPTERS: Chapter[] = [
  'cover',
  'elCaso',
  'sigueElDinero',
  'lasConexiones',
  'evidencia',
  'cronologia',
  'cierre',
];

/** `--color-bg-base` from tokens.css — used as the explicit PNG/PDF background
 * so transparent regions never invert to white (would break "identical"). */
export const BG_BASE = '#0a0a0b';
