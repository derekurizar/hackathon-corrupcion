import { useTranslation } from 'react-i18next';
import { m, useReducedMotion } from 'framer-motion';
import { useInvestigations } from '@/api/hooks';
import EditionBanner from './newsroom/EditionBanner';
import FeedFilters from './newsroom/FeedFilters';
import DossierCard from './newsroom/DossierCard';
import { useFeedParams } from './newsroom/useFeedParams';

/**
 * Newsroom — current-edition hero + filtered dossier feed. Replaces the
 * `src/routes/Newsroom.tsx` placeholder. Filter state lives only in the URL
 * via `useFeedParams`; the feed query keys off the canonical query string.
 */
export default function Newsroom() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const { queryString, page, setPage } = useFeedParams();
  const investigations = useInvestigations(queryString);

  const items = investigations.data?.items ?? [];
  const total = investigations.data?.total ?? 0;
  const pageSize = investigations.data?.pageSize ?? (items.length || 1);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isEmpty = investigations.isSuccess && items.length === 0;

  const container = {
    hidden: {},
    show: {
      transition: reduce ? {} : { staggerChildren: 0.05, delayChildren: 0.08 },
    },
  };
  const cardItem = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.48, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] px-[clamp(1rem,5vw,6rem)] pb-20 pt-6 md:pb-24 md:pt-12">
      <EditionBanner />

      <div className="mt-6">
        <FeedFilters />
      </div>

      {isEmpty ? (
        <div className="mt-8 flex min-h-[200px] items-center justify-center border border-line">
          <p className="kicker text-text-dim">{t('newsroom.empty')}</p>
        </div>
      ) : (
        <m.div
          className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2"
          variants={container}
          initial="hidden"
          animate="show"
          key={queryString}
        >
          {items.map((item) => (
            <m.div key={item.caseKey} variants={cardItem}>
              <DossierCard item={item} />
            </m.div>
          ))}
        </m.div>
      )}

      {/* TODO(P4): full pagination + loading/error states.
          P3 baseline: prev/next + page indicator. */}
      {totalPages > 1 && !isEmpty && (
        <nav
          className="mt-10 flex items-center justify-center gap-4"
          aria-label={t('newsroom.sort.label')}
        >
          <button
            type="button"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="h-9 rounded-sm border border-line px-4 font-body text-body-sm uppercase tracking-label text-text-dim transition-colors hover:border-accent-red hover:text-text-mid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red focus-visible:ring-offset-1 focus-visible:ring-offset-bg-base disabled:opacity-40"
          >
            {t('newsroom.page.prev')}
          </button>
          <span className="numeric-tabular font-body text-body-sm text-text-mid">
            {page} {t('newsroom.page.of')} {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="h-9 rounded-sm border border-line px-4 font-body text-body-sm uppercase tracking-label text-text-dim transition-colors hover:border-accent-red hover:text-text-mid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red focus-visible:ring-offset-1 focus-visible:ring-offset-bg-base disabled:opacity-40"
          >
            {t('newsroom.page.next')}
          </button>
        </nav>
      )}
    </div>
  );
}
