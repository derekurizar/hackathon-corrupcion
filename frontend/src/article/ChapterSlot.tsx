import { useTranslation } from 'react-i18next';
import type { Chapter } from '@/_scene-contract';
import type { InvestigationFull } from '@/api/schemas';
import type { I18nKey } from '@/i18n/keys';
import { ScenePicker } from './ScenePicker';

type ChapterSlotProps = {
  chapter: Chapter;
  index: number;
  planEntry: { sceneId: string; params: unknown } | undefined;
  investigation: InvestigationFull;
};

/** i18n kicker key per chapter (the constant spine labels). */
const CHAPTER_LABEL_KEY: Record<Chapter, I18nKey> = {
  cover: 'chapter.cover',
  elCaso: 'chapter.elCaso',
  sigueElDinero: 'chapter.sigueElDinero',
  lasConexiones: 'chapter.lasConexiones',
  evidencia: 'chapter.evidencia',
  cronologia: 'chapter.cronologia',
  cierre: 'chapter.cierre',
};

/**
 * One chapter `<section>` of the constant article spine. Renders the spine
 * header (oversized Anton numeral + letter-spaced kicker), then the
 * data-resolved scene. `id={chapter}` is the IntersectionObserver target for
 * active-chapter tracking; `content-visibility:auto` keeps offscreen chapters
 * cheap (idea/05 §perf).
 */
export function ChapterSlot({
  chapter,
  index,
  planEntry,
  investigation,
}: ChapterSlotProps) {
  const { t } = useTranslation();
  // Cover (0) & Cierre (6) are unnumbered; 01–05 are zero-padded.
  const isBookend = chapter === 'cover' || chapter === 'cierre';
  const numeral = isBookend ? '—' : String(index).padStart(2, '0');
  const headingId = `chapter-${chapter}-heading`;

  return (
    <section
      id={chapter}
      aria-labelledby={headingId}
      className={chapter === 'cover' ? '' : 'border-t border-line'}
      style={{
        minHeight: '100svh',
        paddingBlock: chapter === 'cover' ? 0 : '6rem',
        contentVisibility: 'auto',
        containIntrinsicSize: '100svh',
      }}
    >
      <div
        style={{
          maxWidth: chapter === 'cover' ? '100%' : '1200px',
          marginInline: 'auto',
          paddingInline:
            chapter === 'cover' ? 0 : 'clamp(1rem, 5vw, 6rem)',
        }}
      >
        {chapter !== 'cover' && (
          <header className="mb-12 flex items-baseline gap-4">
            <span
              className="font-display text-chapter-num text-text-dim opacity-30"
              style={{ letterSpacing: '-0.03em', lineHeight: 1 }}
              aria-hidden="true"
            >
              {numeral}
            </span>
            <h2 id={headingId} className="kicker">
              {t(CHAPTER_LABEL_KEY[chapter])}
            </h2>
          </header>
        )}
        {chapter === 'cover' && (
          <h2 id={headingId} className="sr-only">
            {t(CHAPTER_LABEL_KEY[chapter])}
          </h2>
        )}

        <ScenePicker
          chapter={chapter}
          planEntry={planEntry}
          investigation={investigation}
        />
      </div>
    </section>
  );
}
