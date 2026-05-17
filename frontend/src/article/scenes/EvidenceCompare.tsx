import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { m, useInView, useReducedMotion } from 'framer-motion';
import type { Chapter } from '@/_scene-contract';
// `humanField` lives in the synced `fieldLabels` submodule; the contract
// barrel (`index.ts`) does not re-export it, so import the submodule directly
// rather than editing the synced/generated `_scene-contract/` surface.
import { humanField } from '@/_scene-contract/fieldLabels';
import type { InvestigationFull } from '@/api/schemas';
import { cn } from '@/lib/utils';

/**
 * Hand-mirror of the synced `EvidenceCompare` schema
 * (_scene-contract/scenes/evidenceCompare.ts). Variant of EvidenceLedger
 * (evidencia): observed value side-by-side with its benchmark. Values render
 * STATIC (no count-up — the receipt is traceable, not a hero stat).
 */
interface CompareRow {
  field: string;
  value: unknown;
  benchmark: unknown;
  comparison?: string;
}
interface EvidenceCompareParams {
  rows: CompareRow[];
  rowCaptions: string[];
  caption: string;
}

interface EvidenceCompareProps {
  params: unknown;
  investigation: InvestigationFull;
  chapter: Chapter;
}

// Mirrors EvidenceLedger.renderValue — kept inline so the two evidencia
// scenes stay independently editable.
function renderValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? '✓' : '✗';
  if (typeof v === 'string') return v;
  const entries = Object.entries(v as Record<string, unknown>)
    .map(
      ([k, val]) =>
        `${k}: ${Array.isArray(val) ? (val[0] ?? '—') + (val.length > 1 ? '…' : '') : String(val)}`,
    )
    .join(', ');
  return entries.length > 80 ? entries.slice(0, 80) + '…' : entries;
}

export default function EvidenceCompare({ params }: EvidenceCompareProps) {
  const { t } = useTranslation();
  const p = params as EvidenceCompareParams;
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // `amount: 'some'` for tall ledgers so the reveal is reachable below the
  // fold (see EvidenceLedger); a fraction threshold would never fire.
  const tall = p.rows.length > 6;
  const inView = useInView(ref, {
    once: true,
    amount: tall ? 'some' : 0.3,
  });

  const container = {
    hidden: {},
    show: {
      transition: reduce
        ? {}
        : { staggerChildren: Math.min(0.07, 2 / Math.max(1, p.rows.length)) },
    },
  };
  const card = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div ref={ref}>
      <m.div
        variants={container}
        initial="hidden"
        animate={inView ? 'show' : 'hidden'}
        className="flex flex-col"
      >
        {p.rows.map((r, idx) => {
          const isKey = idx === 0;
          const cap = p.rowCaptions[idx] ?? r.comparison;
          return (
            <m.article
              key={`${idx}-${r.field}`}
              variants={card}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                'mb-px rounded border border-line bg-bg-panel-2 p-5',
                isKey && 'red-glow-pulse border-accent-red',
              )}
            >
              <p className="mb-3 kicker text-pretty break-words">{humanField(r.field)}</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr]">
                <div>
                  <p className="kicker text-text-dim">{t('article.scene.observed')}</p>
                  <p className="mt-1 numeric-tabular font-display text-display-lg text-text-hi">
                    {renderValue(r.value)}
                  </p>
                </div>
                <div className="md:border-l md:border-line md:pl-4">
                  <p className="kicker text-text-dim">{t('article.scene.reference')}</p>
                  <p className="mt-1 numeric-tabular font-display text-display-lg text-text-mid">
                    {r.benchmark === undefined ? '—' : renderValue(r.benchmark)}
                  </p>
                </div>
              </div>
              {cap && (
                <p className="mt-3 max-w-[44ch] font-body text-body-sm text-text-mid text-pretty">
                  {cap}
                </p>
              )}
            </m.article>
          );
        })}
      </m.div>

      <p className="mt-6 font-body text-body-sm text-text-mid text-pretty">{p.caption}</p>

      {/* Screen-reader equivalent */}
      <table className="sr-only">
        <caption>{p.caption}</caption>
        <thead>
          <tr>
            <th>{t('article.scene.column.label')}</th>
            <th>{t('article.scene.observed')}</th>
            <th>{t('article.scene.reference')}</th>
          </tr>
        </thead>
        <tbody>
          {p.rows.map((r, idx) => (
            <tr key={`sr-${idx}-${r.field}`}>
              <td>{humanField(r.field)}</td>
              <td>{renderValue(r.value)}</td>
              <td>{r.benchmark === undefined ? '—' : renderValue(r.benchmark)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
