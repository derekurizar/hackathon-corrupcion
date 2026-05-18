import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { m, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import type { Chapter } from '@/_scene-contract';
import type { InvestigationFull } from '@/api/schemas';
import type { I18nKey } from '@/i18n/keys';
import { cn } from '@/lib/utils';
import { useCountUp } from './useCountUp';
import { formatInt } from './format';

/**
 * Hand-mirror of the synced `CoverHeadline` Zod schema
 * (_scene-contract/scenes/coverHeadline.ts). NOT `z.infer` (verbatim type
 * imports + decoupled by design). `bgVariant` is a required enum on the
 * contract.
 */
interface CoverHeadlineParams {
  kicker: string;
  headline: string;
  dek: string;
  bgVariant: 'dark' | 'duotone' | 'redGlow';
  intro: string;
  heroStat: { label: string; value: number; unit: string; ref: string };
  buyer: string;
  supplierDisplay: string;
  reviewPriority: 'high' | 'medium' | 'low';
}

interface CoverHeadlineProps {
  params: unknown;
  investigation: InvestigationFull;
  chapter: Chapter;
}

const PRIORITY_STYLE: Record<
  CoverHeadlineParams['reviewPriority'],
  { dot: string; text: string; key: I18nKey }
> = {
  high: {
    dot: 'bg-priority-high',
    text: 'text-priority-high',
    key: 'article.priorityHigh',
  },
  medium: {
    dot: 'bg-priority-med',
    text: 'text-priority-med',
    key: 'article.priorityMedium',
  },
  low: {
    dot: 'bg-priority-low',
    text: 'text-priority-low',
    key: 'article.priorityLow',
  },
};

export default function CoverHeadline({ params }: CoverHeadlineProps) {
  const { t, i18n } = useTranslation();
  const p = params as CoverHeadlineParams;
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [statDone, setStatDone] = useState(false);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], ['0%', '-15%']);

  const count = useCountUp(p.heroStat.value, {
    duration: 1.8,
    onComplete: () => setStatDone(true),
  });

  const prio = PRIORITY_STYLE[p.reviewPriority] ?? PRIORITY_STYLE.low;

  return (
    <div
      ref={sectionRef}
      className="relative flex min-h-svh flex-col justify-center overflow-hidden"
    >
      {/* Duotone hero background — parallax (transform only) */}
      <m.div
        aria-hidden="true"
        className="duotone-red vignette-heavy absolute inset-0 z-0 bg-bg-panel"
        style={{ y: reduce ? 0 : parallaxY }}
      />

      <div
        className="relative z-10 mx-auto w-full max-w-[1200px]"
        style={{ paddingInline: 'clamp(1rem, 5vw, 6rem)' }}
      >
        {/* Row A — kicker / headline / dek */}
        <m.p
          className="kicker text-text-mid"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.06 }}
        >
          {p.kicker}
        </m.p>

        <div className="mt-4 overflow-hidden">
          <m.h1
            className="headline-display text-display-xl text-text-hi text-balance"
            initial={reduce ? { opacity: 0 } : { y: '110%', opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { y: '0%', opacity: 1 }}
            transition={{
              duration: reduce ? 0.4 : 0.72,
              ease: [0.16, 1, 0.3, 1],
              delay: reduce ? 0 : 0.17,
            }}
          >
            {p.headline}
          </m.h1>
        </div>

        <m.p
          className="mt-6 max-w-[60ch] font-body text-body-lg text-text-mid text-pretty"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
        >
          {p.dek}
        </m.p>

        {p.intro && (
          <p className="font-body text-body-md text-text-mid text-pretty max-w-[56ch] mt-4 mb-6">
            {p.intro}
          </p>
        )}

        {/* Row B — stat bar */}
        <div className="mt-12 flex flex-col gap-6 border-t border-line pt-8 md:flex-row md:items-center md:gap-10">
          <div>
            <p className="kicker">
              {p.heroStat.label}
              {p.heroStat.unit ? (
                <span className="ml-2 text-text-dim">· {p.heroStat.unit}</span>
              ) : null}
            </p>
            <p
              className={cn(
                'numeric-tabular mt-2 font-display text-display-2xl leading-none text-text-hi',
                statDone && 'red-glow',
              )}
            >
              {formatInt(count, i18n.language)}
            </p>
          </div>

          <span aria-hidden="true" className="hidden h-12 w-px bg-line md:block" />

          <div className="flex flex-col gap-1">
            <p className="kicker">{t('article.heroBuyer')}</p>
            <p className="font-body text-body-md text-text-hi">{p.buyer}</p>
            <p className="mt-2 kicker">{t('article.heroSupplier')}</p>
            <p className="font-body text-body-md text-text-mid">{p.supplierDisplay}</p>
          </div>

          <span aria-hidden="true" className="hidden h-12 w-px bg-line md:block" />

          <div
            className={cn(
              'inline-flex w-fit items-center gap-2 rounded-full border border-line px-3 py-1.5',
            )}
          >
            <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', prio.dot)} />
            <span className={cn('font-body text-[11px] uppercase tracking-label', prio.text)}>
              {t(prio.key)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
