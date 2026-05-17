import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { m, useInView, useReducedMotion } from 'framer-motion';
import type { Chapter } from '@/_scene-contract';
import type { InvestigationFull } from '@/api/schemas';
import { cn } from '@/lib/utils';
import { formatGTQ } from './format';

/**
 * Hand-mirror of the synced `ThresholdLadder` schema
 * (_scene-contract/scenes/thresholdLadder.ts). Variant of MoneyFlowStreams
 * (sigueElDinero): LCE Q90k/Q900k bands as ascending "rungs"; awards plotted
 * within their band by share of ceiling. `valueRef` is internal.
 */
interface LadderBand {
  label: string;
  ceiling: number;
}
interface LadderAward {
  value: number;
  valueRef: string;
  bandLabel: string;
}
interface ThresholdLadderParams {
  buyer: string;
  bands: LadderBand[];
  awards: LadderAward[];
  caption: string;
}

interface ThresholdLadderProps {
  params: unknown;
  investigation: InvestigationFull;
  chapter: Chapter;
}

export default function ThresholdLadder({ params }: ThresholdLadderProps) {
  const { t, i18n } = useTranslation();
  const p = params as ThresholdLadderParams;
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });

  // Ascending ceiling — lowest band on top (display-only copy, never mutate
  // params: the band order on the contract is a server concern).
  const bands = useMemo(() => [...p.bands].sort((a, b) => a.ceiling - b.ceiling), [p.bands]);

  return (
    <div ref={ref} className="max-w-[720px]">
      <p className="mb-6 font-body text-body-sm text-text-mid text-pretty">{p.buyer}</p>

      <div className="flex flex-col gap-5">
        {bands.map((band, i) => {
          // Awards that fall in this band.
          const awards = p.awards.filter((a) => a.bandLabel === band.label);
          return (
            <m.div
              key={`${i}-${band.label}`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0 }}
              transition={
                reduce
                  ? { duration: 0.2 }
                  : { duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.1 + i * 0.07 }
              }
            >
              <div className="mb-1 flex items-baseline justify-between gap-4">
                <span className="kicker text-pretty break-words">{band.label}</span>
                <span className="numeric-tabular font-body text-body-sm text-text-dim">
                  {formatGTQ(band.ceiling, i18n.language)}
                </span>
              </div>
              <div className="relative h-10 rounded border border-line bg-bg-panel-2">
                {awards.map((a, j) => {
                  const over = a.value > band.ceiling;
                  const raw = band.ceiling > 0 ? (a.value / band.ceiling) * 100 : 0;
                  const leftPct = Math.min(95, raw);
                  // 95–100% of the ceiling = pressed up against the cap.
                  const nearCeiling = raw >= 95;
                  return (
                    <m.div
                      key={`${j}-${a.value}`}
                      className="absolute top-1/2"
                      style={{ left: `${leftPct}%`, transform: 'translate(-50%, -50%)' }}
                      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0 }}
                      animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0 }}
                      transition={
                        reduce
                          ? { duration: 0.2 }
                          : {
                              type: 'spring',
                              bounce: 0.15,
                              delay: 0.1 + i * 0.07 + 0.25 + j * 0.04,
                            }
                      }
                      title={`${over ? '> ' : ''}${formatGTQ(a.value, i18n.language)}`}
                    >
                      <span
                        className={cn(
                          'block h-3 w-3 rounded-full',
                          nearCeiling ? 'red-glow-box bg-accent-red' : 'bg-text-mid',
                        )}
                        aria-hidden="true"
                      />
                    </m.div>
                  );
                })}
                {awards.length > 1 && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 numeric-tabular font-body text-[11px] text-text-mid">
                    +{awards.length}
                  </span>
                )}
              </div>
            </m.div>
          );
        })}
      </div>

      <p className="mt-8 border-t border-line pt-6 font-body text-body-sm text-text-mid text-pretty">
        {p.caption}
      </p>

      {/* Screen-reader equivalent */}
      <table className="sr-only">
        <caption>{p.caption}</caption>
        <thead>
          <tr>
            <th>{t('article.scene.column.band')}</th>
            <th>{t('article.scene.column.ceiling')}</th>
            <th>{t('article.scene.column.value')}</th>
          </tr>
        </thead>
        <tbody>
          {p.awards.map((a, i) => (
            <tr key={`sr-${i}-${a.value}`}>
              <td>{a.bandLabel}</td>
              <td>
                {formatGTQ(
                  bands.find((b) => b.label === a.bandLabel)?.ceiling ?? 0,
                  i18n.language,
                )}
              </td>
              <td>
                {a.value > (bands.find((b) => b.label === a.bandLabel)?.ceiling ?? Infinity)
                  ? `> ${formatGTQ(a.value, i18n.language)}`
                  : formatGTQ(a.value, i18n.language)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
