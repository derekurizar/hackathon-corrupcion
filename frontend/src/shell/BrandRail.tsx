import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { BRAND } from '@/brand';
import { useArticleState } from '@/article/ArticleStateContext';
import { SiteNav } from './SiteNav';
import { ChapterSpine } from './ChapterSpine';

/**
 * Left brand + chapter rail. Brand wordmark from BRAND (env-driven, never
 * hardcoded). The site nav + chapter spine are shared with the mobile drawer
 * (see `SiteNav` / `ChapterSpine`).
 *
 * The chapter spine only renders once an investigation is selected
 * (`activeChapter !== null`). On the neutral routes (Dashboard, Newsroom,
 * Methodology) the rail shows just the brand + site nav.
 */
export function BrandRail() {
  const { t } = useTranslation();
  const { activeChapter } = useArticleState();
  const articleSelected = activeChapter !== null;
  // Two-line stacked wordmark from BRAND.name (split on whitespace).
  const wordmarkLines = BRAND.name.split(/\s+/);

  return (
    <nav
      aria-label={t('chapter.rail')}
      className="hidden h-full flex-col overflow-y-auto border-r border-line bg-bg-panel md:flex"
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

      <SiteNav />

      {articleSelected && <ChapterSpine />}
    </nav>
  );
}
