import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { m, useInView, useReducedMotion } from 'framer-motion';
import type { Chapter } from '@/_scene-contract';
import type { InvestigationFull } from '@/api/schemas';
import type { I18nKey } from '@/i18n/keys';
import { cn } from '@/lib/utils';

/** Hand-mirror of the synced `AwardTimeline` schema. */
type EventKind = 'published' | 'tenderClose' | 'award' | 'contractSigned';
interface TimelineEvent {
  date: string;
  kind: EventKind;
  label: string;
  valueRef?: string;
}
interface AwardTimelineParams {
  events: TimelineEvent[];
  missingStages: string[];
  highlightIdx: number;
  caption: string;
}

interface AwardTimelineProps {
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

// HARDCODED — must NOT route through i18n (project hard convention).
const SIN_DATO = 'SIN DATO PÚBLICO';

export default function AwardTimeline({ params }: AwardTimelineProps) {
  const { t } = useTranslation();
  const p = params as AwardTimelineParams;
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  const events = p.events;
  const n = Math.max(1, events.length);

  return (
    <div ref={ref}>
      <p className="mb-10 kicker">{p.caption}</p>

      {/* Desktop — horizontal spine */}
      <div className="relative hidden h-[260px] md:block">
        <m.div
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-px w-full bg-line"
          style={{ transformOrigin: 'left center' }}
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
          transition={
            reduce
              ? { duration: 0.1 }
              : { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
          }
        />
        {events.map((e, i) => {
          // Inset the track so edge markers + labels never clip (8%–92%).
          const xFrac =
            n === 1 ? 0.5 : 0.08 + (i / (n - 1)) * 0.84;
          const highlighted = i === p.highlightIdx;
          return (
            <div
              key={`${i}-${e.date}`}
              className="absolute top-1/2"
              style={{
                left: `${xFrac * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <m.div
                className={cn(
                  'h-3 w-3 rounded-full',
                  highlighted
                    ? 'red-glow-box bg-accent-red'
                    : 'bg-text-mid',
                )}
                initial={
                  reduce
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0 }
                }
                animate={
                  inView
                    ? { opacity: 1, scale: 1 }
                    : { opacity: 0, scale: 0 }
                }
                transition={
                  reduce
                    ? { duration: 0.15 }
                    : {
                        type: 'spring',
                        bounce: 0.15,
                        delay: 0.2 + xFrac * 0.7,
                      }
                }
              />
              <m.div
                className="absolute left-1/2 mt-3 w-32 -translate-x-1/2 text-center"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0 }}
                transition={{
                  duration: 0.3,
                  delay: reduce ? 0 : 0.2 + xFrac * 0.7 + 0.04,
                }}
              >
                <p className="kicker">{t(KIND_KEY[e.kind])}</p>
                <p className="mt-1 font-body text-body-sm text-text-hi">
                  {e.label}
                </p>
                <p className="font-body text-[11px] text-text-dim">{e.date}</p>
              </m.div>
            </div>
          );
        })}
      </div>

      {/* Mobile — vertical spine */}
      <div className="relative ml-3 flex flex-col gap-8 md:hidden">
        <m.div
          aria-hidden="true"
          className="absolute bottom-0 left-0 top-0 w-px bg-line"
          style={{ transformOrigin: 'top center' }}
          initial={{ scaleY: 0 }}
          animate={inView ? { scaleY: 1 } : { scaleY: 0 }}
          transition={
            reduce
              ? { duration: 0.1 }
              : { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
          }
        />
        {events.map((e, i) => {
          const highlighted = i === p.highlightIdx;
          return (
            <div key={`m-${i}-${e.date}`} className="relative pl-6">
              <span
                className={cn(
                  'absolute -left-[5px] top-1 h-3 w-3 rounded-full',
                  highlighted
                    ? 'red-glow-box bg-accent-red'
                    : 'bg-text-mid',
                )}
                aria-hidden="true"
              />
              <p className="kicker">{t(KIND_KEY[e.kind])}</p>
              <p className="mt-1 font-body text-body-sm text-text-hi">
                {e.label}
              </p>
              <p className="font-body text-[11px] text-text-dim">{e.date}</p>
            </div>
          );
        })}
      </div>

      {/* Missing stages — honest "no public data" markers */}
      {p.missingStages.length > 0 && (
        <m.div
          className="mt-12 flex flex-wrap gap-3 border-t border-line pt-6"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 0.4 } : { opacity: 0 }}
          transition={{
            duration: reduce ? 0.1 : 0.4,
            delay: reduce ? 0 : 0.9,
          }}
        >
          <span className="kicker w-full">{t('timeline.missing')}</span>
          {p.missingStages.map((s) => (
            <span
              key={s}
              className="rounded border border-dashed border-line px-3 py-1 font-body text-[11px] uppercase tracking-label text-text-dim"
            >
              {SIN_DATO}
            </span>
          ))}
        </m.div>
      )}
    </div>
  );
}
