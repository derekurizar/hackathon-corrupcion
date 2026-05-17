import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { m, useInView, useReducedMotion } from 'framer-motion';
import type { Chapter } from '@/_scene-contract';
import type { InvestigationFull } from '@/api/schemas';
import type { I18nKey } from '@/i18n/keys';
import { cn } from '@/lib/utils';
import { useCountUp } from './useCountUp';
import { formatInt } from './format';

/**
 * Hand-mirror of the synced `GapSpotlight` schema
 * (_scene-contract/scenes/gapSpotlight.ts). Variant of AwardTimeline
 * (cronologia): same horizontal/vertical spine, with a spotlighted "gap pill"
 * over the suspiciously-short interval. `gapDaysRef` is internal — never
 * rendered. `gapDays` is a day count → `formatInt`, NOT money.
 */
type EventKind = 'published' | 'tenderClose' | 'award' | 'contractSigned';
interface GapEvent {
  date: string;
  kind: EventKind;
  label: string;
}
interface GapSpotlightParams {
  events: GapEvent[];
  gapDays: number;
  gapDaysRef: string;
  spotlightLabel: string;
  caption: string;
}

interface GapSpotlightProps {
  params: unknown;
  investigation: InvestigationFull;
  chapter: Chapter;
}

const KIND_KEY: Record<EventKind, I18nKey> = {
  published: 'timeline.published',
  tenderClose: 'timeline.tenderClose',
  award: 'timeline.award',
  contractSigned: 'timeline.contractSigned',
};

/**
 * The bracketing pair is the adjacent event pair separated by the longest
 * elapsed time — that is the gap the scene spotlights. Returns the index of
 * the *earlier* event of the pair (or -1 when fewer than two events).
 */
function bracketStart(events: GapEvent[]): number {
  if (events.length < 2) return -1;
  let bestIdx = 0;
  let bestSpan = -Infinity;
  for (let i = 0; i < events.length - 1; i++) {
    const cur = events[i];
    const nxt = events[i + 1];
    if (!cur || !nxt) continue;
    const a = Date.parse(cur.date);
    const b = Date.parse(nxt.date);
    const span = Number.isFinite(a) && Number.isFinite(b) ? b - a : 0;
    if (span > bestSpan) {
      bestSpan = span;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export default function GapSpotlight({ params }: GapSpotlightProps) {
  const { t, i18n } = useTranslation();
  const p = params as GapSpotlightParams;
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  const events = p.events;
  const n = Math.max(1, events.length);
  const bStart = bracketStart(events);
  const hasPill = bStart >= 0;

  const gapCount = useCountUp(p.gapDays, { enabled: inView, duration: 1.2 });

  const xFracOf = (i: number) => (n === 1 ? 0.5 : 0.08 + (i / (n - 1)) * 0.84);
  const pillXFrac = hasPill ? (xFracOf(bStart) + xFracOf(bStart + 1)) / 2 : 0.5;

  return (
    <div ref={ref}>
      <p className="mb-4 kicker">{p.caption}</p>

      {/* Desktop — horizontal spine */}
      <div className="relative hidden h-[300px] md:block">
        <m.div
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-px w-full bg-line"
          style={{ transformOrigin: 'left center' }}
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
          transition={reduce ? { duration: 0.1 } : { duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
        {events.map((e, i) => {
          const xFrac = xFracOf(i);
          const inBracket = hasPill && (i === bStart || i === bStart + 1);
          return (
            <div
              key={`${i}-${e.date}`}
              className="absolute top-1/2"
              style={{ left: `${xFrac * 100}%`, transform: 'translate(-50%, -50%)' }}
            >
              <m.div
                className={cn(
                  'h-3 w-3 rounded-full',
                  inBracket ? 'red-glow-box bg-accent-red' : 'bg-text-mid',
                )}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0 }}
                animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                transition={
                  reduce
                    ? { duration: 0.15 }
                    : { type: 'spring', bounce: 0.15, delay: 0.2 + xFrac * 0.7 }
                }
              />
              <m.div
                className="absolute left-1/2 mt-3 w-32 -translate-x-1/2 text-center"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0 }}
                transition={{ duration: 0.3, delay: reduce ? 0 : 0.2 + xFrac * 0.7 + 0.04 }}
              >
                <p className="kicker">{t(KIND_KEY[e.kind])}</p>
                <p className="mt-1 font-body text-body-sm text-text-hi text-pretty">{e.label}</p>
                <p className="font-body text-[11px] text-text-dim">{e.date}</p>
              </m.div>
            </div>
          );
        })}

        {/* Gap pill — floats well above the spine at the bracketed
            interval's midpoint so it clears the event labels (which sit
            below the spine). */}
        {hasPill && (
          <m.div
            className="red-glow-box absolute bottom-[calc(50%+5rem)] -translate-x-1/2 whitespace-nowrap rounded-full border border-accent-red bg-bg-panel-2 px-4 py-1 text-center"
            style={{ left: `${pillXFrac * 100}%` }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
            animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0 }}
            transition={
              reduce
                ? { duration: 0.2 }
                : { type: 'spring', bounce: 0.15, delay: 1.0 }
            }
          >
            <span className="numeric-tabular font-display text-display-lg text-accent-red">
              {formatInt(gapCount, i18n.language)}
            </span>
            {p.spotlightLabel && <span className="ml-2 kicker">{p.spotlightLabel}</span>}
          </m.div>
        )}
      </div>

      {/* Mobile — vertical spine */}
      <div className="relative ml-3 flex flex-col gap-8 md:hidden">
        <m.div
          aria-hidden="true"
          className="absolute bottom-0 left-0 top-0 w-px bg-line"
          style={{ transformOrigin: 'top center' }}
          initial={{ scaleY: 0 }}
          animate={inView ? { scaleY: 1 } : { scaleY: 0 }}
          transition={reduce ? { duration: 0.1 } : { duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
        {events.map((e, i) => {
          const inBracket = hasPill && (i === bStart || i === bStart + 1);
          return (
            <div key={`m-${i}-${e.date}`} className="relative pl-6">
              <span
                className={cn(
                  'absolute -left-[5px] top-1 h-3 w-3 rounded-full',
                  inBracket ? 'red-glow-box bg-accent-red' : 'bg-text-mid',
                )}
                aria-hidden="true"
              />
              <p className="kicker">{t(KIND_KEY[e.kind])}</p>
              <p className="mt-1 font-body text-body-sm text-text-hi text-pretty">{e.label}</p>
              <p className="font-body text-[11px] text-text-dim">{e.date}</p>
            </div>
          );
        })}
        {hasPill && (
          <div className="red-glow-box ml-6 inline-flex w-fit items-baseline gap-2 rounded-full border border-accent-red bg-bg-panel-2 px-4 py-1">
            <span className="numeric-tabular font-display text-display-lg text-accent-red">
              {formatInt(gapCount, i18n.language)}
            </span>
            {p.spotlightLabel && <span className="kicker">{p.spotlightLabel}</span>}
          </div>
        )}
      </div>

      {/* Screen-reader equivalent */}
      <table className="sr-only">
        <caption>{p.caption}</caption>
        <thead>
          <tr>
            <th>{t('article.scene.column.date')}</th>
            <th>{t('article.scene.column.label')}</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e, i) => (
            <tr key={`sr-${i}-${e.date}`}>
              <td>{e.date}</td>
              <td>{e.label}</td>
            </tr>
          ))}
          {hasPill && (
            <tr>
              <th scope="row">{t('article.scene.column.gapDays')}</th>
              <td>{formatInt(p.gapDays, i18n.language)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
