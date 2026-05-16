import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { InvestigationListItem } from '@/api/schemas';
import type { I18nKey } from '@/i18n/keys';
import { formatInt } from '@/article/scenes/format';

/** Priority chip: border + text only (noir restraint, no fill). */
const PRIORITY_CHIP: Record<
  InvestigationListItem['reviewPriority'],
  { cls: string; key: I18nKey }
> = {
  high: { cls: 'border-priority-high text-priority-high', key: 'newsroom.priority.high' },
  medium: { cls: 'border-priority-med text-priority-med', key: 'newsroom.priority.medium' },
  low: { cls: 'border-priority-low text-priority-low', key: 'newsroom.priority.low' },
};

interface DossierCardProps {
  item: InvestigationListItem;
}

/**
 * Pure presentational dossier card. PRIVACY INVARIANT: when
 * `supplier.isIndividual === true`, ONLY the localized display name is ever
 * rendered — never `supplier.id` or any raw name. (For companies the id is an
 * internal field and is likewise never rendered.)
 */
export default function DossierCard({ item }: DossierCardProps) {
  const { t, i18n } = useTranslation();
  const isEs = i18n.language.startsWith('es');

  const prio = PRIORITY_CHIP[item.reviewPriority] ?? PRIORITY_CHIP.low;
  const supplierName = isEs
    ? item.supplier.displayNameEs
    : item.supplier.displayNameEn;

  const ariaLabel = `${t('newsroom.dossierLabel')} — ${item.headline.headline} — ${item.buyer.name}`;

  return (
    <article className="relative flex flex-col gap-3 bg-bg-panel border border-line p-5 transition-colors hover:border-accent-red focus-within:border-accent-red">
      {/* Full-card link (covers the whole surface, sits under the content). */}
      <Link
        to={`/investigation/${item.caseKey}`}
        aria-label={ariaLabel}
        className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red focus-visible:ring-offset-2 focus-visible:ring-offset-bg-panel"
      />

      {/* Top row — kicker + priority chip */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <p className="kicker text-text-dim">
          {t('newsroom.dossierLabel')} · {item.caseKey}
        </p>
        <span
          className={`shrink-0 rounded-sm border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-label ${prio.cls}`}
        >
          {t(prio.key)}
        </span>
      </div>

      {/* Headline (already lang-resolved by the API) */}
      <h2 className="relative z-10 mt-1 font-display text-[1.5rem] uppercase leading-tight text-text-hi line-clamp-3 text-balance">
        {item.headline.headline}
      </h2>

      {/* Buyer + supplier */}
      <div className="relative z-10 mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <span className="flex flex-col">
          <span className="kicker text-text-dim">{t('newsroom.filters.buyer')}</span>
          <span className="font-body text-body-sm text-text-hi">
            {item.buyer.name}
          </span>
        </span>
        <span className="flex flex-col">
          <span className="kicker text-text-dim">
            {t('article.heroSupplier')}
          </span>
          <span className="font-body text-body-sm text-text-hi">
            {supplierName}
          </span>
        </span>
      </div>

      {/* Value */}
      <p className="relative z-10 mt-2 numeric-tabular font-body text-body-md text-text-hi">
        {formatInt(item.totalValue, i18n.language)}{' '}
        <span className="text-text-dim">{item.currency}</span>
      </p>

      {/* Signal family chip */}
      <div className="relative z-10 mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-sm border border-line px-2 py-0.5 text-[10px] uppercase tracking-label text-text-dim">
          {item.signalFamily}
        </span>
      </div>

      {/* Audio badge — links through the card to the article (which carries
          podcast audio). Always shown for the MVP. */}
      <span className="absolute bottom-4 right-4 z-10 inline-flex items-center gap-1 text-[10px] uppercase tracking-label text-text-dim">
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3zM3 19a2 2 0 0 0 2 2h1a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1H3z" />
        </svg>
        {t('newsroom.listen')}
      </span>
    </article>
  );
}
