import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { m, useInView, useReducedMotion } from 'framer-motion';
import type { Chapter } from '@/_scene-contract';
import type { InvestigationFull } from '@/api/schemas';
import { cn } from '@/lib/utils';
import { formatGTQ } from './format';

/**
 * Hand-mirror of the synced `PriceBars` schema
 * (_scene-contract/scenes/priceBars.ts). Variant of MoneyFlowStreams
 * (sigueElDinero): each bar's price against a single benchmark hairline.
 * `valueRef` / `benchmarkRef` are internal — never rendered.
 */
interface PriceBar {
  label: string;
  value: number;
  valueRef: string;
  flagged: boolean;
}
interface PriceBarsParams {
  buyer: string;
  category: string;
  bars: PriceBar[];
  benchmarkValue: number;
  benchmarkRef: string;
  caption: string;
}

interface PriceBarsProps {
  params: unknown;
  investigation: InvestigationFull;
  chapter: Chapter;
}

export default function PriceBars({ params }: PriceBarsProps) {
  const { t, i18n } = useTranslation();
  const p = params as PriceBarsParams;
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  const max = Math.max(...p.bars.map((b) => b.value), p.benchmarkValue, 1);
  const benchPct = Math.min(100, (p.benchmarkValue / max) * 100);

  return (
    <div ref={ref} className="max-w-[720px]">
      <p className="mb-1 kicker">{p.category}</p>
      <p className="mb-6 font-body text-body-sm text-text-mid text-pretty">{p.buyer}</p>

      {/* pt-7 reserves a clear band above the bars for the REF label so the
          benchmark callout never collides with the first bar fill. */}
      <div className="relative pt-7">
        <div className="flex flex-col gap-3">
          {p.bars.map((b, i) => {
            const pct = Math.min(100, (b.value / max) * 100);
            return (
              <div key={`${i}-${b.label}`} className="flex items-center gap-4">
                <span
                  className="w-[200px] shrink-0 truncate font-body text-body-sm text-text-mid"
                  title={b.label}
                >
                  {b.label}
                </span>
                <div
                  className={cn(
                    'relative h-7 flex-1 rounded bg-bg-panel-2',
                    b.flagged && 'red-glow-box border border-accent-red',
                  )}
                >
                  <m.div
                    className={cn(
                      'absolute inset-y-0 left-0 rounded',
                      b.flagged ? 'bg-accent-red' : 'bg-text-mid opacity-40',
                    )}
                    initial={{ width: reduce ? `${pct}%` : '0%' }}
                    animate={inView ? { width: `${pct}%` } : { width: reduce ? `${pct}%` : '0%' }}
                    transition={
                      reduce
                        ? { duration: 0.001 }
                        : { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 + i * 0.08 }
                    }
                  />
                  <span className="absolute inset-y-0 right-2 flex items-center numeric-tabular font-body text-[11px] text-text-hi">
                    {formatGTQ(b.value, i18n.language)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Benchmark hairline — one full-height vertical line spanning every
            bar track at the benchmark x; label sits in the reserved top band,
            above the fills (z-10) so it never gets overdrawn. */}
        <m.div
          className="pointer-events-none absolute bottom-0 top-7 z-10"
          style={{ left: '216px', width: 'calc(100% - 216px)' }}
          initial={{ opacity: reduce ? 0.6 : 0 }}
          animate={inView ? { opacity: 0.6 } : { opacity: reduce ? 0.6 : 0 }}
          transition={{
            duration: reduce ? 0.001 : 0.4,
            delay: reduce ? 0 : 0.1 + p.bars.length * 0.08 + 0.2,
          }}
        >
          <div
            className="absolute bottom-0 top-0 w-px bg-text-dim"
            style={{ left: `${benchPct}%` }}
            aria-hidden="true"
          />
          <div
            className="absolute -top-7 -translate-x-1/2 whitespace-nowrap text-center"
            style={{ left: `${benchPct}%` }}
          >
            <span className="kicker text-text-dim">{t('article.scene.benchmark')}</span>
            <span className="ml-2 numeric-tabular font-body text-[11px] text-text-dim">
              {formatGTQ(p.benchmarkValue, i18n.language)}
            </span>
          </div>
        </m.div>
      </div>

      <p className="mt-8 border-t border-line pt-6 font-body text-body-sm text-text-mid text-pretty">
        {p.caption}
      </p>

      {/* Screen-reader equivalent of the bar chart */}
      <table className="sr-only">
        <caption>{p.caption}</caption>
        <thead>
          <tr>
            <th>{t('article.scene.column.label')}</th>
            <th>{t('article.scene.column.value')}</th>
            <th>{t('article.scene.benchmark')}</th>
            <th>{t('article.scene.column.flagged')}</th>
          </tr>
        </thead>
        <tbody>
          {p.bars.map((b, i) => (
            <tr key={`sr-${i}-${b.label}`}>
              <td>{b.label}</td>
              <td>{formatGTQ(b.value, i18n.language)}</td>
              <td>{formatGTQ(p.benchmarkValue, i18n.language)}</td>
              <td>{b.flagged ? '✓' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
