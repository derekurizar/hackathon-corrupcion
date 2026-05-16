import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { BRAND } from '@/brand';
import { cn } from '@/lib/utils';

/** The fixed 6-slot chapter spine (idea/05). Active tracking lands in Area 11. */
const CHAPTERS = [
  { numeral: '—', key: 'chapter.cover' },
  { numeral: '01', key: 'chapter.01' },
  { numeral: '02', key: 'chapter.02' },
  { numeral: '03', key: 'chapter.03' },
  { numeral: '04', key: 'chapter.04' },
  { numeral: '05', key: 'chapter.05' },
  { numeral: '—', key: 'chapter.cierre' },
] as const;

/**
 * Left brand + chapter rail. Brand wordmark is read from BRAND (env-driven),
 * never hardcoded. Chapter items are scaffold (no active article = all dim).
 */
export function BrandRail() {
  const { t } = useTranslation();
  // Two-line stacked wordmark from BRAND.name (split on whitespace).
  const wordmarkLines = BRAND.name.split(/\s+/);

  return (
    <nav
      aria-label={t('chapter.rail')}
      className="hidden h-full flex-col border-r border-line bg-bg-panel md:flex"
      style={{ width: 'var(--brand-rail-width)', padding: '24px 16px' }}
    >
      <NavLink to="/" className="block focus-visible:outline-none">
        <span className="block h-6 w-[2px] bg-accent-red" aria-hidden="true" />
        <span
          className="mt-3 block font-display uppercase text-text-hi"
          style={{ fontSize: '13px', letterSpacing: '0.15em', lineHeight: 1.25 }}
        >
          {wordmarkLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </span>
      </NavLink>

      <ol className="mt-10 flex flex-col" role="list">
        {CHAPTERS.map((ch) => (
          <li key={ch.key}>
            <div
              className="flex items-center gap-3"
              style={{ padding: '10px 16px 10px 14px' }}
            >
              <span
                aria-hidden="true"
                className={cn('w-[2px] self-stretch rounded-full bg-accent-red opacity-0')}
              />
              <span
                className="font-display text-text-dim opacity-40"
                style={{ fontSize: '28px', letterSpacing: '-0.03em', lineHeight: 1 }}
              >
                {ch.numeral}
              </span>
              <span
                className="font-body uppercase text-text-dim"
                style={{ fontSize: '11px', letterSpacing: '0.15em' }}
              >
                {t(ch.key)}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
