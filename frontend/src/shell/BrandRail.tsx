import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { m } from 'framer-motion';
import type { Chapter } from '@/_scene-contract';
import { BRAND } from '@/brand';
import { useArticleState } from '@/article/ArticleStateContext';
import type { I18nKey } from '@/i18n/keys';
import { tk } from '@/i18n/keys';
import { cn } from '@/lib/utils';

/**
 * The fixed chapter spine (idea/05). Explicit chapter-key → slot mapping
 * (no array-index arithmetic). Cover & Cierre carry the "—" numeral.
 */
const CHAPTER_ORDER: Chapter[] = [
  'cover',
  'elCaso',
  'sigueElDinero',
  'lasConexiones',
  'evidencia',
  'cronologia',
  'cierre',
];

/** Numeral per chapter slot — Cover & Cierre are unnumbered ("—"). */
const CHAPTER_NUMERAL: Record<Chapter, string> = {
  cover: '—',
  elCaso: '01',
  sigueElDinero: '02',
  lasConexiones: '03',
  evidencia: '04',
  cronologia: '05',
  cierre: '—',
};

/** i18n label key per chapter. */
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
 * Left brand + chapter rail. Brand wordmark from BRAND (env-driven, never
 * hardcoded). The active chapter is tracked via ArticleState (Area 11): the
 * red pill indicator + numeral/label tier animate on the active item.
 */
export function BrandRail() {
  const { t } = useTranslation();
  const { activeChapter } = useArticleState();
  // Two-line stacked wordmark from BRAND.name (split on whitespace).
  const wordmarkLines = BRAND.name.split(/\s+/);

  return (
    <nav
      aria-label={t('chapter.rail')}
      className="hidden h-full flex-col border-r border-line bg-bg-panel md:flex"
      style={{ width: 'var(--brand-rail-width)', padding: '24px 16px' }}
    >
      <NavLink
        to="/"
        className="flex items-stretch gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red focus-visible:ring-offset-2 focus-visible:ring-offset-bg-panel"
      >
        <span
          className="block w-[2px] shrink-0 self-stretch bg-accent-red"
          aria-hidden="true"
        />
        <span
          className="block font-display uppercase text-text-hi"
          style={{ fontSize: '13px', letterSpacing: '0.15em', lineHeight: 1.25 }}
        >
          {wordmarkLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </span>
      </NavLink>

      {/* Site navigation — added by Area 12 */}
      <nav aria-label={t('nav.label')} className="mt-6 mb-4 px-3">
        {[
          { to: '/', key: 'nav.dashboard' },
          { to: '/newsroom', key: 'nav.newsroom' },
          { to: '/methodology', key: 'nav.methodology' },
        ].map(({ to, key }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `block py-2 kicker transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red focus-visible:ring-offset-2 focus-visible:ring-offset-bg-panel ${isActive ? 'text-text-hi' : 'text-text-dim hover:text-text-mid'}`
            }
          >
            {t(tk(key))}
          </NavLink>
        ))}
      </nav>

      <ol className="mt-10 flex flex-col" role="list">
        {CHAPTER_ORDER.map((ch) => {
          const active = activeChapter === ch;
          return (
            <li key={ch} aria-current={active ? 'step' : undefined}>
              <div
                className="flex items-center gap-3"
                style={{ padding: '10px 16px 10px 14px' }}
              >
                <m.span
                  aria-hidden="true"
                  className="w-[2px] self-stretch rounded-full bg-accent-red"
                  initial={false}
                  animate={
                    active
                      ? { opacity: 1, scaleY: 1 }
                      : { opacity: 0, scaleY: 0.6 }
                  }
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  style={{ transformOrigin: 'center' }}
                />
                <m.span
                  className={cn(
                    'font-display',
                    active ? 'text-text-hi' : 'text-text-dim',
                  )}
                  style={{
                    fontSize: '28px',
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                  }}
                  initial={false}
                  animate={{ opacity: active ? 1 : 0.4 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                  {CHAPTER_NUMERAL[ch]}
                </m.span>
                <span
                  className={cn(
                    'font-body uppercase transition-colors',
                    active ? 'text-text-mid' : 'text-text-dim',
                  )}
                  style={{ fontSize: '11px', letterSpacing: '0.15em' }}
                >
                  {t(CHAPTER_LABEL_KEY[ch])}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
