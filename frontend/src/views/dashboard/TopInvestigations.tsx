import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { StatsDTO } from '@/api/schemas';
import { formatGTQ } from '@/article/scenes/format';

interface Props {
  topBuyers: StatsDTO['topBuyersByFlaggedValue'];
}

/** Matches backend `topBuyersByFlaggedValue` entries: `{ id, name, value }`. */
type TopBuyer = { id: string; name: string; value: number };

/** Local runtime guard — `topBuyersByFlaggedValue` is `unknown[]` by contract. */
function isTopBuyer(v: unknown): v is TopBuyer {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.value === 'number'
  );
}

/**
 * Top buyers ranked by flagged value. The API returns `{ id, name, value }`
 * (no caseKey/priority), so each row is a static card showing the buyer and
 * its flagged value in Quetzales — not a link to an investigation.
 */
export default function TopInvestigations({ topBuyers }: Props) {
  const { t, i18n } = useTranslation();
  const rows = useMemo(() => topBuyers.filter(isTopBuyer), [topBuyers]);

  if (rows.length === 0) {
    return (
      <div className="col-span-full flex min-h-[120px] items-center justify-center border border-line">
        <p className="kicker text-text-dim">{t('placeholder.noData')}</p>
      </div>
    );
  }

  return (
    <>
      {rows.map((e) => (
        <div
          key={e.id}
          className="flex flex-col gap-3 border border-line bg-bg-panel p-5"
        >
          <p className="kicker text-text-dim">{e.id}</p>
          <p className="font-body text-body-md text-text-hi">{e.name}</p>
          <p className="numeric-tabular font-display text-body-lg text-accent-red">
            {formatGTQ(e.value, i18n.language)}
          </p>
        </div>
      ))}
    </>
  );
}
