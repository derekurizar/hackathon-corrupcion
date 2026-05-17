import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { m, useInView, useReducedMotion } from 'framer-motion';
import type { Chapter } from '@/_scene-contract';
import type { InvestigationFull } from '@/api/schemas';
import { cn } from '@/lib/utils';
import { useCountUp } from './useCountUp';
import { formatGTQ, formatInt } from './format';

/**
 * Hand-mirror of the synced `CaseSplit` schema
 * (_scene-contract/scenes/caseSplit.ts). Variant of CaseStatement (elCaso):
 * prose on the left, a framed key figure on the right. `keyFigure.value` is a
 * NUMBER on the contract. `ref` is internal — never rendered.
 */
interface CaseSplitParams {
  lead: string;
  body: string;
  keyFigure: { value: number; label: string; ref: string };
  caption: string;
}

interface CaseSplitProps {
  params: unknown;
  investigation: InvestigationFull;
  chapter: Chapter;
}

/**
 * Money-magnitude heuristic: the contract emits raw numbers, so a large value
 * paired with a label that names money reads as Quetzales. Small values
 * (shares, counts) stay plain integers.
 */
function looksMonetary(value: number, label: string): boolean {
  return /valor|monto|quetz|gtq|q\.|presupuesto|amount|value|total/i.test(label) && value >= 1000;
}

export default function CaseSplit({ params }: CaseSplitProps) {
  const { i18n } = useTranslation();
  const p = params as CaseSplitParams;
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const [statDone, setStatDone] = useState(false);

  const count = useCountUp(p.keyFigure.value, {
    enabled: inView,
    duration: 1.6,
    onComplete: () => setStatDone(true),
  });

  const figure = looksMonetary(p.keyFigure.value, p.keyFigure.label)
    ? formatGTQ(count, i18n.language)
    : formatInt(count, i18n.language);

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
      className="grid grid-cols-1 items-start gap-12 md:grid-cols-[1fr_auto]"
    >
      {/* Left — prose */}
      <div>
        <m.p
          variants={item}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="font-body text-body-lg leading-body text-text-hi text-pretty"
        >
          {p.lead}
        </m.p>
        {p.body && (
          <m.p
            variants={item}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 max-w-[60ch] font-body text-body-md leading-body text-text-mid text-pretty"
          >
            {p.body}
          </m.p>
        )}
      </div>

      {/* Right — framed key figure (animates last, glows on settle) */}
      <m.div
        variants={item}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="red-glow-box rounded border border-accent-red bg-bg-panel-2 p-8 md:w-[38vw] md:max-w-[420px]"
      >
        <p
          className={cn(
            'numeric-tabular font-display text-display-2xl text-text-hi',
            statDone && 'red-glow',
          )}
        >
          {figure}
        </p>
        <p className="mt-3 kicker text-pretty break-words">{p.keyFigure.label}</p>
      </m.div>

      {/* Screen-reader equivalent */}
      <table className="sr-only">
        <caption>{p.caption}</caption>
        <tbody>
          <tr>
            <th scope="row">{p.keyFigure.label}</th>
            <td>{figure}</td>
          </tr>
        </tbody>
      </table>
    </m.div>
  );
}
