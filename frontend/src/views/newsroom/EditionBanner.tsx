import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { m, useReducedMotion } from 'framer-motion';
import { useCurrentEdition } from '@/api/hooks';

/** Local runtime guard — `EditionDTO.highlights` is `unknown[]` by contract. */
function isHighlights(v: unknown): v is Array<{ text: string }> {
  return (
    Array.isArray(v) &&
    v.every(
      (h) =>
        typeof h === 'object' &&
        h !== null &&
        typeof (h as { text?: unknown }).text === 'string',
    )
  );
}

function formatDate(iso: string, lang: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const locale = lang.startsWith('es') ? 'es-GT' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

/**
 * Current-edition hero. On any non-success query state it renders nothing
 * (the feed below is the fallback). `highlights`/`stats` are `unknown` on the
 * DTO — guarded locally, never widening `@/api/schemas`.
 */
export default function EditionBanner() {
  const { t, i18n } = useTranslation();
  const reduce = useReducedMotion();
  const edition = useCurrentEdition();

  if (!edition.isSuccess || !edition.data) return null;

  const { id, leadCaseKey, highlights, publishedAt } = edition.data;
  const bullets = isHighlights(highlights) ? highlights.slice(0, 2) : [];

  return (
    <m.section
      className="relative overflow-hidden bg-bg-panel-2 vignette-heavy min-h-[220px]"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative z-10 grid grid-cols-1 gap-6 p-8 md:grid-cols-[1fr_2fr] md:p-12">
        {/* Left — edition badge + date */}
        <div className="border-l-[3px] border-accent-red pl-4">
          <p className="kicker text-accent-red">{t('newsroom.edition.badge')}</p>
          <p className="kicker text-text-dim mt-1">
            {formatDate(publishedAt, i18n.language)}
          </p>
        </div>

        {/* Right — lead case */}
        <div>
          <p className="kicker text-text-dim">{t('newsroom.edition.badge')}</p>
          <Link
            to={`/investigation/${leadCaseKey}`}
            className="group mt-2 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red focus-visible:ring-offset-2 focus-visible:ring-offset-bg-panel-2"
          >
            <span className="block font-display text-[1.75rem] uppercase leading-tight text-text-hi text-balance">
              {id}
            </span>
            <span className="mt-3 inline-flex items-center gap-2 font-body text-body-sm uppercase tracking-label text-accent-red transition-colors group-hover:text-accent-red-deep">
              {t('newsroom.edition.read')}
              <span aria-hidden="true">→</span>
            </span>
          </Link>

          {bullets.length > 0 && (
            <ul className="mt-5 flex flex-col gap-2">
              {bullets.map((b, idx) => (
                <li
                  key={`${idx}-${b.text.slice(0, 16)}`}
                  className="flex items-start gap-2"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[0.5rem] h-0.5 w-0.5 shrink-0 rounded-full bg-accent-red"
                  />
                  <span className="kicker text-text-dim">{b.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </m.section>
  );
}
