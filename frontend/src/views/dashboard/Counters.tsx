import { useTranslation } from 'react-i18next';
import type { StatsDTO } from '@/api/schemas';
import type { I18nKey } from '@/i18n/keys';
import { useCountUp } from '@/article/scenes/useCountUp';
import { formatInt, formatGTQ } from '@/article/scenes/format';

type Counters = StatsDTO['counters'];

/**
 * Five counter cards. Order + labels are fixed. `money` cards render the
 * value as Guatemalan Quetzales (`Q…`), the rest as grouped integers.
 */
const CARDS: Array<{ key: keyof Counters; labelKey: I18nKey; money?: boolean }> = [
  { key: 'records', labelKey: 'dashboard.stat.records' },
  { key: 'valueAnalyzed', labelKey: 'dashboard.stat.valueAnalyzed', money: true },
  { key: 'entities', labelKey: 'dashboard.stat.entities' },
  { key: 'monthsCovered', labelKey: 'dashboard.stat.monthsCovered' },
  { key: 'investigations', labelKey: 'dashboard.stat.investigations' },
];

function CounterCard({
  value,
  labelKey,
  money = false,
}: {
  value: number;
  labelKey: I18nKey;
  money?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const count = useCountUp(value, { duration: 1.8, enabled: true });
  return (
    <div
      className="bg-bg-panel border-t-2 border-accent-red p-5"
      style={{ containerType: 'inline-size' }}
    >
      <p className="kicker text-text-dim">{t(labelKey)}</p>
      {/* Fluid display size capped at the display-lg token: a 9–13 digit
          grouped value (e.g. 8.9B GTQ) must never clip the narrow card.
          `cqi` resolves against the card's inline size. */}
      <p
        aria-live="polite"
        aria-atomic="true"
        className="numeric-tabular mt-3 overflow-hidden font-display leading-tight text-text-hi"
        style={{
          fontSize: 'clamp(1.25rem, 13cqi, var(--text-display-lg))',
          letterSpacing: '-0.02em',
        }}
      >
        {money
          ? formatGTQ(count, i18n.language)
          : formatInt(count, i18n.language)}
      </p>
    </div>
  );
}

export default function Counters({ counters }: { counters: Counters }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {CARDS.map((c) => (
        <CounterCard
          key={c.key}
          value={counters[c.key]}
          labelKey={c.labelKey}
          money={c.money ?? false}
        />
      ))}
    </div>
  );
}
