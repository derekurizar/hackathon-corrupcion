import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { m, useReducedMotion } from 'framer-motion';
import { useStats } from '@/api/hooks';
import type { I18nKey } from '@/i18n/keys';
import { cn } from '@/lib/utils';
import { useCountUp } from '@/article/scenes/useCountUp';
import { formatInt } from '@/article/scenes/format';

/** 23-rule detection engine (Area 05). Interpolated into the detection copy. */
const RULE_COUNT = 23;

const SECTIONS: Array<{ headingKey: I18nKey; bodyKey: I18nKey }> = [
  { headingKey: 'methodology.section.source', bodyKey: 'methodology.section.source.body' },
  {
    headingKey: 'methodology.section.detection',
    bodyKey: 'methodology.section.detection.body',
  },
  { headingKey: 'methodology.section.limits', bodyKey: 'methodology.section.limits.body' },
];

function ScopeStat() {
  const { t, i18n } = useTranslation();
  const { data } = useStats();
  const months = data?.counters.monthsCovered ?? 0;
  const count = useCountUp(months, { duration: 1.2, enabled: data != null });
  return (
    <div className="bg-bg-panel border-t-2 border-accent-red p-6">
      <p className="kicker text-text-dim">{t('methodology.scope.label')}</p>
      <p className="numeric-tabular mt-3 font-display text-display-lg text-text-hi">
        {data ? formatInt(count, i18n.language) : '—'}
      </p>
      <p className="kicker text-text-dim mt-1">{t('methodology.scope.unit')}</p>
    </div>
  );
}

/**
 * Methodology — source / detection / limits + sticky scope + caveat callout.
 * Replaces the `src/routes/Methodology.tsx` placeholder. Surfaces the
 * mandatory caveat (guardrail copy).
 */
export default function Methodology() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [caveatGlow, setCaveatGlow] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-[clamp(1rem,5vw,6rem)] pb-20 pt-6 md:pb-24 md:pt-12">
      <m.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="kicker">{t('methodology.kicker')}</p>
        <h1 className="headline-display mt-2 text-display-xl text-text-hi text-balance">
          {t('methodology.headline')}
        </h1>
        <p className="mt-6 max-w-[64ch] font-body text-body-lg leading-body text-text-mid text-pretty">
          {t('methodology.intro')}
        </p>
      </m.div>

      <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[2fr_1fr]">
        {/* Left — sections */}
        <div>
          {SECTIONS.map((s) => (
            <section
              key={s.headingKey}
              className="mb-4 border-t border-line pt-6"
            >
              <h2 className="kicker text-text-dim">{t(s.headingKey)}</h2>
              <p className="mt-3 max-w-[64ch] font-body text-body-md leading-body text-text-mid text-pretty">
                {t(s.bodyKey, { ruleCount: RULE_COUNT })}
              </p>
            </section>
          ))}

          <Link
            to="/newsroom"
            className="mt-8 inline-block font-body text-body-sm uppercase tracking-label text-accent-red transition-colors hover:text-accent-red-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
          >
            {t('methodology.backToNewsroom')}
          </Link>
        </div>

        {/* Right — sticky sidebar */}
        <aside className="flex flex-col gap-6 lg:sticky lg:top-8 lg:self-start">
          <ScopeStat />

          <m.div
            className={cn(
              'border-l-[3px] border-accent-red bg-bg-panel-2 px-6 py-5',
              caveatGlow && 'red-glow-box',
            )}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.48,
              ease: [0.16, 1, 0.3, 1],
              delay: reduce ? 0 : 0.2,
            }}
            onAnimationComplete={() => setCaveatGlow(true)}
          >
            <p className="kicker text-text-dim mb-2">
              {t('methodology.caveat.label')}
            </p>
            <p className="font-body text-body-md italic leading-body text-text-mid text-pretty">
              {t('methodology.caveat')}
            </p>
          </m.div>
        </aside>
      </div>
    </div>
  );
}
