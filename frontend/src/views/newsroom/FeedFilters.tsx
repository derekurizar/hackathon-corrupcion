import { useTranslation } from 'react-i18next';
import { useFilters } from '@/api/hooks';
import { tk, type I18nKey } from '@/i18n/keys';
import { useFeedParams } from './useFeedParams';

const INPUT_CLS =
  'h-9 rounded-sm border border-line bg-bg-panel-2 px-3 font-body text-body-sm text-text-mid transition-colors focus:border-accent-red focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red focus-visible:ring-offset-1 focus-visible:ring-offset-bg-base disabled:opacity-50';

const PRIORITY_OPTIONS: Array<{
  value: 'high' | 'medium' | 'low';
  key: I18nKey;
}> = [
  { value: 'high', key: 'newsroom.priority.high' },
  { value: 'medium', key: 'newsroom.priority.medium' },
  { value: 'low', key: 'newsroom.priority.low' },
];

/**
 * Newsroom feed filters. All state is read from / written to the URL via
 * `useFeedParams` (single source of truth). Options come from `/filters`.
 * Sort is fixed (priority → recency → value); no sort control in P3.
 */
export default function FeedFilters() {
  const { t } = useTranslation();
  const { filters, setFilter, resetFilters } = useFeedParams();
  const filterOpts = useFilters();

  // While options load, render the controls disabled.
  // TODO(P4): skeleton
  const loading = filterOpts.isLoading;
  const families = filterOpts.data?.families ?? [];
  const buyers = filterOpts.data?.buyers ?? [];

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => e.preventDefault()}
    >
      {/* Family */}
      <div className="flex flex-col gap-1">
        <label htmlFor="feed-family" className="kicker text-text-dim">
          {t('newsroom.filters.family')}
        </label>
        <select
          id="feed-family"
          className={INPUT_CLS}
          disabled={loading}
          value={filters.family ?? ''}
          onChange={(e) => setFilter('family', e.target.value || undefined)}
        >
          <option value="">{t('newsroom.filters.all')}</option>
          {families.map((f) => (
            <option key={f} value={f}>
              {t(tk(`family.full.${f}`))}
            </option>
          ))}
        </select>
      </div>

      {/* Priority */}
      <div className="flex flex-col gap-1">
        <label htmlFor="feed-priority" className="kicker text-text-dim">
          {t('newsroom.filters.priority')}
        </label>
        <select
          id="feed-priority"
          className={INPUT_CLS}
          disabled={loading}
          value={filters.priority ?? ''}
          onChange={(e) => setFilter('priority', e.target.value || undefined)}
        >
          <option value="">{t('newsroom.filters.all')}</option>
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {t(o.key)}
            </option>
          ))}
        </select>
      </div>

      {/* Buyer — native select, no combobox */}
      <div className="flex flex-col gap-1">
        <label htmlFor="feed-buyer" className="kicker text-text-dim">
          {t('newsroom.filters.buyer')}
        </label>
        <select
          id="feed-buyer"
          className={`${INPUT_CLS} max-w-[220px]`}
          disabled={loading}
          value={filters.buyer ?? ''}
          onChange={(e) => setFilter('buyer', e.target.value || undefined)}
        >
          <option value="">{t('newsroom.filters.all')}</option>
          {buyers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Value range */}
      <div className="flex flex-col gap-1">
        <label htmlFor="feed-min" className="kicker text-text-dim">
          {t('newsroom.filters.valueMin')}
        </label>
        <input
          id="feed-min"
          type="number"
          min={0}
          inputMode="numeric"
          className={`${INPUT_CLS} w-28`}
          disabled={loading}
          value={filters.minValue ?? ''}
          onChange={(e) =>
            setFilter(
              'minValue',
              e.target.value === '' ? undefined : Number(e.target.value),
            )
          }
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="feed-max" className="kicker text-text-dim">
          {t('newsroom.filters.valueMax')}
        </label>
        <input
          id="feed-max"
          type="number"
          min={0}
          inputMode="numeric"
          className={`${INPUT_CLS} w-28`}
          disabled={loading}
          value={filters.maxValue ?? ''}
          onChange={(e) =>
            setFilter(
              'maxValue',
              e.target.value === '' ? undefined : Number(e.target.value),
            )
          }
        />
      </div>

      {/* Search */}
      <div className="flex min-w-[160px] flex-1 flex-col gap-1">
        <label htmlFor="feed-q" className="kicker text-text-dim">
          {t('newsroom.filters.search')}
        </label>
        <input
          id="feed-q"
          type="search"
          placeholder={t('newsroom.filters.search')}
          className={`${INPUT_CLS} w-full`}
          disabled={loading}
          value={filters.q ?? ''}
          onChange={(e) => setFilter('q', e.target.value || undefined)}
        />
      </div>

      {/* Clear — ghost button */}
      <button
        type="button"
        onClick={resetFilters}
        disabled={loading}
        className="h-9 rounded-sm border border-line px-4 font-body text-body-sm uppercase tracking-label text-text-dim transition-colors hover:border-accent-red hover:text-text-mid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red focus-visible:ring-offset-1 focus-visible:ring-offset-bg-base disabled:opacity-50"
      >
        {t('newsroom.filters.clear')}
      </button>
      {/* TODO(P4): sort control (sort is fixed priority → recency → value) */}
    </form>
  );
}
