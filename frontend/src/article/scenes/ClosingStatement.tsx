import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { m, useInView, useReducedMotion } from 'framer-motion';
import { FIXED_CAVEAT } from '@/_scene-contract';
import type { Chapter } from '@/_scene-contract';
import type { InvestigationFull } from '@/api/schemas';
import { useMode } from '@/shell/ModeContext';
import { cn } from '@/lib/utils';

/**
 * Hand-mirror of the synced `ClosingStatement` schema. On the contract
 * `ctas` is the fixed tuple `['methodology','listen','share']` (a bound set —
 * the LLM cannot change which CTAs appear), so the three buttons are always
 * rendered. `caveat` is mandatory & non-empty per validator rule 5.
 */
interface ClosingStatementParams {
  whatItMeans: string;
  caveat: string;
  conclusions: string[];
  ctas: ['methodology', 'listen', 'share'];
}

interface ClosingStatementProps {
  params: unknown;
  investigation: InvestigationFull;
  chapter: Chapter;
}

export default function ClosingStatement({ params }: ClosingStatementProps) {
  const { t } = useTranslation();
  const p = params as ClosingStatementParams;
  const { setMode } = useMode();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const [caveatGlow, setCaveatGlow] = useState(false);
  const [shared, setShared] = useState(false);

  // MANDATORY: never render an empty caveat.
  const caveatText = p.caveat || FIXED_CAVEAT;

  const onShare = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (typeof navigator !== 'undefined' && navigator.share) {
      void navigator.share({ url }).catch(() => {
        /* user dismissed */
      });
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard
        .writeText(url)
        .then(() => setShared(true))
        .catch(() => {
          /* clipboard blocked */
        });
    }
  };

  return (
    <div ref={ref} className="mx-auto max-w-[900px]">
      {p.conclusions && p.conclusions.length > 0 && (
        <ul className="mb-6 space-y-2">
          {p.conclusions.map((c, i) => (
            <li key={i} className="font-body text-body-sm text-text-mid flex gap-2">
              <span className="text-accent-red mt-0.5">—</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      )}
      <m.p
        className="max-w-[56ch] font-body text-body-lg leading-body text-text-hi text-pretty"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
        transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
      >
        {p.whatItMeans}
      </m.p>

      <m.div
        className={cn(
          'mt-8 border-l-[3px] border-accent-red bg-bg-panel-2 px-8 py-6',
          caveatGlow && 'red-glow-box',
        )}
        initial={reduce ? { opacity: 0 } : { opacity: 0, x: -16 }}
        animate={inView ? { opacity: 1, x: 0 } : reduce ? { opacity: 0 } : { opacity: 0, x: -16 }}
        transition={{
          duration: 0.48,
          ease: [0.16, 1, 0.3, 1],
          delay: reduce ? 0 : 0.2,
        }}
        onAnimationComplete={() => setCaveatGlow(true)}
      >
        <p className="kicker mb-2">{t('methodology.kicker')}</p>
        <p className="font-body text-body-md italic leading-body text-text-mid text-pretty">
          {caveatText}
        </p>
      </m.div>

      <m.div
        className="mt-10 flex flex-wrap gap-3"
        initial="hidden"
        animate={inView ? 'show' : 'hidden'}
        variants={{
          hidden: {},
          show: {
            transition: reduce ? {} : { staggerChildren: 0.06, delayChildren: 0.4 },
          },
        }}
      >
        <m.div
          variants={{
            hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0 },
          }}
        >
          <Link
            to="/methodology"
            className="inline-flex h-11 items-center rounded border border-line px-5 font-body text-[12px] uppercase tracking-label text-text-mid transition-colors hover:text-text-hi"
          >
            {t('cta.methodology')}
          </Link>
        </m.div>

        <m.button
          type="button"
          onClick={() => setMode('podcast')}
          variants={{
            hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0 },
          }}
          whileTap={{ scale: 0.96 }}
          className="inline-flex h-11 items-center rounded bg-accent-red px-5 font-body text-[12px] uppercase tracking-label text-text-hi transition-colors hover:bg-accent-red-deep"
        >
          {t('cta.listen')}
        </m.button>

        <m.button
          type="button"
          onClick={onShare}
          variants={{
            hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0 },
          }}
          whileTap={{ scale: 0.96 }}
          className="inline-flex h-11 items-center rounded border border-line px-5 font-body text-[12px] uppercase tracking-label text-text-mid transition-colors hover:text-text-hi"
        >
          {shared ? t('cta.shareCopied') : t('cta.share')}
        </m.button>
      </m.div>
    </div>
  );
}
