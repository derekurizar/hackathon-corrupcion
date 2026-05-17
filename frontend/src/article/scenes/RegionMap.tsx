import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { m, useInView, useReducedMotion } from 'framer-motion';
import type { Chapter } from '@/_scene-contract';
import type { InvestigationFull } from '@/api/schemas';
import { cn } from '@/lib/utils';
import { formatGTQ } from './format';

/**
 * Hand-mirror of the synced `RegionMap` schema
 * (_scene-contract/scenes/regionMap.ts). Variant of MoneyFlowStreams
 * (sigueElDinero, STRETCH): geo distribution of awarded value, ranked. No
 * benchmark. `valueRef` is internal — never rendered.
 */
interface RegionRow {
  region: string;
  value: number;
  valueRef: string;
}
interface RegionMapParams {
  buyer: string;
  regions: RegionRow[];
  caption: string;
}

interface RegionMapProps {
  params: unknown;
  investigation: InvestigationFull;
  chapter: Chapter;
}

const MAX_ROWS = 20;

export default function RegionMap({ params }: RegionMapProps) {
  const { t, i18n } = useTranslation();
  const p = params as RegionMapParams;
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  // Display-only descending sort; never mutate params (server owns ordering).
  const sorted = useMemo(
    () => [...p.regions].sort((a, b) => b.value - a.value),
    [p.regions],
  );
  const shown = sorted.slice(0, MAX_ROWS);
  const overflow = sorted.length - shown.length;
  const max = Math.max(...sorted.map((r) => r.value), 1);

  return (
    <div ref={ref} className="max-w-[720px]">
      <p className="mb-6 font-body text-body-sm text-text-mid text-pretty">{p.buyer}</p>

      <div className="flex flex-col gap-3">
        {shown.map((r, i) => {
          const pct = Math.min(100, (r.value / max) * 100);
          const top = i === 0;
          return (
            <div key={`${i}-${r.region}`} className="flex items-center gap-4">
              <span
                className="w-[180px] shrink-0 truncate font-body text-body-sm text-text-mid"
                title={r.region}
              >
                {r.region}
              </span>
              <div className="relative h-7 flex-1 rounded bg-bg-panel-2">
                <m.div
                  className={cn(
                    'absolute inset-y-0 left-0 rounded',
                    top ? 'red-glow-box bg-accent-red' : 'bg-text-mid opacity-40',
                  )}
                  initial={{ width: reduce ? `${pct}%` : '0%' }}
                  animate={inView ? { width: `${pct}%` } : { width: reduce ? `${pct}%` : '0%' }}
                  transition={
                    reduce
                      ? { duration: 0.001 }
                      : {
                          duration: 0.7,
                          ease: [0.16, 1, 0.3, 1],
                          delay: 0.08 + i * 0.06 + (top ? 0.15 : 0),
                        }
                  }
                />
                {top && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 kicker text-text-hi">
                    {t('article.scene.principalRegion')}
                  </span>
                )}
                <span className="absolute inset-y-0 right-2 flex items-center numeric-tabular font-body text-[11px] text-text-hi">
                  {formatGTQ(r.value, i18n.language)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {overflow > 0 && (
        <p className="mt-3 numeric-tabular font-body text-[11px] text-text-dim">
          {t('article.scene.more', { count: overflow })}
        </p>
      )}

      <p className="mt-8 border-t border-line pt-6 font-body text-body-sm text-text-mid text-pretty">
        {p.caption}
      </p>

      {/* Screen-reader equivalent */}
      <table className="sr-only">
        <caption>{p.caption}</caption>
        <thead>
          <tr>
            <th>{t('article.scene.column.region')}</th>
            <th>{t('article.scene.column.value')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={`sr-${i}-${r.region}`}>
              <td>{r.region}</td>
              <td>{formatGTQ(r.value, i18n.language)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
