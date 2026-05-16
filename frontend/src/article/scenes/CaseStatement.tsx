import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { m, useInView, useReducedMotion } from 'framer-motion';
import type { Chapter } from '@/_scene-contract';
import type { InvestigationFull } from '@/api/schemas';
import { cn } from '@/lib/utils';
import { useCountUp } from './useCountUp';
import { formatInt } from './format';

/**
 * Hand-mirror of the synced `CaseStatement` schema
 * (_scene-contract/scenes/caseStatement.ts). `pullStat.value` is a NUMBER on
 * the contract (not number|string); `facts` is 1–3 items.
 */
interface CaseStatementParams {
  lead: string;
  pullStat: { value: number; label: string; ref: string };
  facts: Array<{ text: string; valueRef?: string }>;
}

interface CaseStatementProps {
  params: unknown;
  investigation: InvestigationFull;
  chapter: Chapter;
}

export default function CaseStatement({ params }: CaseStatementProps) {
  const { i18n } = useTranslation();
  const p = params as CaseStatementParams;
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const [statDone, setStatDone] = useState(false);

  const count = useCountUp(p.pullStat.value, {
    enabled: inView,
    duration: 1.6,
    onComplete: () => setStatDone(true),
  });

  const container = {
    hidden: {},
    show: {
      transition: reduce ? {} : { staggerChildren: 0.06, delayChildren: 0.1 },
    },
  };
  const item = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <m.div
      ref={ref}
      variants={container}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      className="grid grid-cols-1 gap-12 md:grid-cols-[1fr_2fr]"
    >
      {/* Left — oversized pull stat (animates first, glows on settle) */}
      <m.div variants={item}>
        <p
          className={cn(
            'numeric-tabular font-display text-display-2xl text-text-hi',
            statDone && 'red-glow',
          )}
        >
          {formatInt(count, i18n.language)}
        </p>
        <p className="mt-3 kicker">{p.pullStat.label}</p>
      </m.div>

      {/* Right — lead + facts */}
      <div>
        <m.p
          variants={item}
          className="font-body text-body-lg leading-body text-text-hi text-pretty"
        >
          {p.lead}
        </m.p>

        <ul className="mt-8 flex flex-col gap-4">
          {p.facts.map((f, idx) => (
            <m.li
              key={`${idx}-${f.text.slice(0, 16)}`}
              variants={item}
              className="flex items-start gap-3"
            >
              <span
                aria-hidden="true"
                className="mt-[0.6rem] h-0.5 w-0.5 shrink-0 rounded-full bg-accent-red"
              />
              <span className="font-body text-body-md leading-body text-text-mid text-pretty">
                {f.text}
              </span>
            </m.li>
          ))}
        </ul>
      </div>
    </m.div>
  );
}
