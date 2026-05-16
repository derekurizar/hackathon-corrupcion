import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';

/**
 * URL search-params ↔ `useInvestigations(queryString)` adapter. The Newsroom
 * filter state lives ONLY in the URL (no `useState` mirror) so a shared link
 * reproduces the exact feed. Param names are LOCKED to the backend `/filters`
 * + `/investigations` contract: family, priority, buyer, minValue, maxValue,
 * q, page. Invalid params fall back to defaults silently — never throw.
 *
 * This is a UI-state schema, NOT a widening of `@/api/schemas`.
 */
const FeedParamsSchema = z.object({
  family: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  buyer: z.string().optional(),
  minValue: z.coerce.number().nonnegative().optional(),
  maxValue: z.coerce.number().nonnegative().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type FeedParams = z.infer<typeof FeedParamsSchema>;
export type FeedFilterKey = Exclude<keyof FeedParams, 'page'>;

const DEFAULTS: FeedParams = { page: 1 };

function parseParams(sp: URLSearchParams): FeedParams {
  const raw: Record<string, string> = {};
  for (const key of [
    'family',
    'priority',
    'buyer',
    'minValue',
    'maxValue',
    'q',
    'page',
  ]) {
    const v = sp.get(key);
    if (v !== null && v !== '') raw[key] = v;
  }
  // Lenient parse: a single invalid field must not blank the whole feed, so
  // re-validate field-by-field and drop only what fails.
  const full = FeedParamsSchema.safeParse(raw);
  if (full.success) return full.data;

  const out: FeedParams = { page: 1 };
  const fields = [
    'family',
    'priority',
    'buyer',
    'minValue',
    'maxValue',
    'q',
    'page',
  ] as const;
  for (const f of fields) {
    if (!(f in raw)) continue;
    const single = FeedParamsSchema.pick({ [f]: true } as Record<
      typeof f,
      true
    >).safeParse({ [f]: raw[f] });
    if (single.success) {
      const val = (single.data as Partial<FeedParams>)[f];
      if (val !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (out as any)[f] = val;
      }
    }
  }
  return out;
}

/** Canonical query string: omits empty/default values for stable URLs. */
function toQueryString(p: FeedParams): string {
  const sp = new URLSearchParams();
  if (p.family) sp.set('family', p.family);
  if (p.priority) sp.set('priority', p.priority);
  if (p.buyer) sp.set('buyer', p.buyer);
  if (p.minValue !== undefined) sp.set('minValue', String(p.minValue));
  if (p.maxValue !== undefined) sp.set('maxValue', String(p.maxValue));
  if (p.q) sp.set('q', p.q);
  if (p.page > 1) sp.set('page', String(p.page));
  return sp.toString();
}

export function useFeedParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => parseParams(searchParams),
    [searchParams],
  );

  const queryString = useMemo(() => toQueryString(filters), [filters]);

  const setFilter = useCallback(
    (key: FeedFilterKey, value: string | number | undefined) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === undefined || value === '' || value === null) {
            next.delete(key);
          } else {
            next.set(key, String(value));
          }
          // Any filter change (other than page) resets to page 1.
          next.delete('page');
          return next;
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  const setPage = useCallback(
    (page: number) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (page <= 1) next.delete('page');
          else next.set('page', String(page));
          return next;
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  const resetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: false });
  }, [setSearchParams]);

  return {
    filters,
    setFilter,
    resetFilters,
    page: filters.page,
    setPage,
    queryString,
  };
}

export { DEFAULTS as FEED_PARAM_DEFAULTS };
