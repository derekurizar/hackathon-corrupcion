import { useRef } from 'react';
import { m, useInView, useReducedMotion } from 'framer-motion';
import type { Chapter } from '@/_scene-contract';
// `humanField` lives in the synced `fieldLabels` submodule; the contract
// barrel (`index.ts`) does not re-export it, so import the submodule directly
// rather than editing the synced/generated `_scene-contract/` surface.
import { humanField } from '@/_scene-contract/fieldLabels';
import type { InvestigationFull } from '@/api/schemas';
import { cn } from '@/lib/utils';

/**
 * Hand-mirror of the synced `EvidenceLedger` schema
 * (_scene-contract/scenes/evidenceLedger.ts). On the contract `order` is the
 * enum `'severity'|'field'|'original'` (NOT a `number[]`); items are fully
 * bound to `investigation.evidence`. Values render STATIC (no count-up — the
 * ledger is the traceable receipt, not a hero stat).
 */
interface EvidenceItem {
  field: string;
  value: string | number | boolean | null | unknown;
  benchmark?: unknown;
  comparison?: string;
}
interface EvidenceLedgerParams {
  items: EvidenceItem[];
  itemCaptions: string[];
  order: 'severity' | 'field' | 'original';
  narration: string;
}

interface EvidenceLedgerProps {
  params: unknown;
  investigation: InvestigationFull;
  chapter: Chapter;
}

function renderValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? '✓' : '✗';
  if (typeof v === 'string') return v;
  // Flatten object to "key: value" pairs, cap to 80 chars
  const entries = Object.entries(v as Record<string, unknown>)
    .map(
      ([k, val]) =>
        `${k}: ${Array.isArray(val) ? (val[0] ?? '—') + (val.length > 1 ? '…' : '') : String(val)}`,
    )
    .join(', ');
  return entries.length > 80 ? entries.slice(0, 80) + '…' : entries;
}

export default function EvidenceLedger({ params }: EvidenceLedgerProps) {
  const p = params as EvidenceLedgerParams;
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // `amount: 'some'` (threshold 0), NOT a fraction: the ledger can be far
  // taller than the viewport, so any height-fraction threshold is unreachable
  // and the reveal would never fire (cards stuck at opacity 0 → black scene).
  const inView = useInView(ref, { once: true, amount: 'some' });

  // Server payloads can carry the same (field,value,benchmark,comparison)
  // tuple dozens of times (one row per matched contract). The ledger is a
  // *traceable receipt of distinct signals*, so collapse exact duplicates —
  // this is display-only and never touches server-side evidence indexing.
  const items: { it: EvidenceItem; caption: string | undefined }[] = [];
  const seen = new Set<string>();
  p.items.forEach((it, idx) => {
    const key = JSON.stringify([it.field, it.value, it.benchmark, it.comparison]);
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ it, caption: p.itemCaptions[idx] });
  });
  if (p.order === 'field') {
    items.sort((a, b) => a.it.field.localeCompare(b.it.field));
  }
  // 'severity' and 'original' keep server order (severity-ordering is a
  // server concern; the SPA never reorders evidence it can't rank).

  const container = {
    hidden: {},
    show: {
      // Bound total stagger to ~2s regardless of row count so a long ledger
      // doesn't take 8s+ to finish revealing.
      transition: reduce ? {} : { staggerChildren: Math.min(0.07, 2 / Math.max(1, items.length)) },
    },
  };
  const card = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div ref={ref}>
      {p.narration && (
        <p className="font-body text-body-sm text-text-mid text-pretty max-w-[60ch] mb-6">
          {p.narration}
        </p>
      )}
      <m.div
        variants={container}
        initial="hidden"
        animate={inView ? 'show' : 'hidden'}
        className="flex flex-col"
      >
        {items.map(({ it, caption }, idx) => {
          const isKey = idx === 0; // highest-priority card = first
          return (
            <m.article
              key={`${idx}-${it.field}`}
              variants={card}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                'mb-px grid grid-cols-1 gap-4 rounded border border-line bg-bg-panel-2 p-6 md:grid-cols-[2fr_2fr_3fr]',
                isKey && 'red-glow-box red-glow-pulse',
              )}
            >
              <div>
                <p className="kicker">{humanField(it.field)}</p>
              </div>
              <div>
                <p className="numeric-tabular font-display text-[clamp(1.5rem,3vw,2.5rem)] leading-tight text-text-hi">
                  {renderValue(it.value)}
                </p>
              </div>

              <div>
                <p className="max-w-[32ch] font-body text-body-sm text-text-mid text-pretty">
                  {caption ?? it.comparison ?? ''}
                </p>
              </div>
            </m.article>
          );
        })}
      </m.div>
    </div>
  );
}
