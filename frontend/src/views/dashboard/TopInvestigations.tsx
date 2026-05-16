import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { StatsDTO } from '@/api/schemas';
import type { I18nKey } from '@/i18n/keys';
import { formatInt } from '@/article/scenes/format';

interface Props {
  topBuyers: StatsDTO['topBuyersByFlaggedValue'];
}

type TopEntry = {
  caseKey: string;
  buyer: { name: string };
  totalValue: number;
  currency: string;
  reviewPriority: 'high' | 'medium' | 'low';
};

/** Local runtime guard — `topBuyersByFlaggedValue` is `unknown[]`. */
function isTopEntry(v: unknown): v is TopEntry {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  const buyer = o.buyer as { name?: unknown } | undefined;
  return (
    typeof o.caseKey === 'string' &&
    typeof buyer === 'object' &&
    buyer !== null &&
    typeof buyer.name === 'string' &&
    typeof o.totalValue === 'number' &&
    typeof o.currency === 'string' &&
    (o.reviewPriority === 'high' ||
      o.reviewPriority === 'medium' ||
      o.reviewPriority === 'low')
  );
}

const PRIORITY_CHIP: Record<
  TopEntry['reviewPriority'],
  { cls: string; key: I18nKey }
> = {
  high: { cls: 'border-priority-high text-priority-high', key: 'newsroom.priority.high' },
  medium: { cls: 'border-priority-med text-priority-med', key: 'newsroom.priority.medium' },
  low: { cls: 'border-priority-low text-priority-low', key: 'newsroom.priority.low' },
};

/**
 * Lightweight top-investigations rows. `topBuyersByFlaggedValue` is not shaped
 * like `InvestigationListItem` (no headline/supplier), so a minimal row layout
 * is used instead of the full DossierCard.
 * TODO(P4): use full DossierCard layout if the API enriches this payload.
 */
export default function TopInvestigations({ topBuyers }: Props) {
  const { t, i18n } = useTranslation();
  const rows = useMemo(() => topBuyers.filter(isTopEntry), [topBuyers]);

  if (rows.length === 0) {
    return (
      <div className="col-span-full flex min-h-[120px] items-center justify-center border border-line">
        <p className="kicker text-text-dim">{t('placeholder.noData')}</p>
      </div>
    );
  }

  return (
    <>
      {rows.map((e) => {
        const prio = PRIORITY_CHIP[e.reviewPriority] ?? PRIORITY_CHIP.low;
        return (
          <Link
            key={e.caseKey}
            to={`/investigation/${e.caseKey}`}
            className="group flex flex-col gap-3 border border-line bg-bg-panel p-5 transition-colors hover:border-accent-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="kicker text-text-dim">
                {t('newsroom.dossierLabel')} · {e.caseKey}
              </p>
              <span
                className={`shrink-0 rounded-sm border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-label ${prio.cls}`}
              >
                {t(prio.key)}
              </span>
            </div>
            <p className="font-body text-body-md text-text-hi">
              {e.buyer.name}
            </p>
            <p className="numeric-tabular font-body text-body-sm text-text-mid">
              {formatInt(e.totalValue, i18n.language)}{' '}
              <span className="text-text-dim">{e.currency}</span>
            </p>
          </Link>
        );
      })}
    </>
  );
}
