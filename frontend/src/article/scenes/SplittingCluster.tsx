import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { m, useInView, useReducedMotion } from 'framer-motion';
import type { Chapter } from '@/_scene-contract';
import type { InvestigationFull } from '@/api/schemas';
import { cn } from '@/lib/utils';
import { useCountUp } from './useCountUp';
import { formatGTQ } from './format';

/**
 * Hand-mirror of the synced `SplittingCluster` schema
 * (_scene-contract/scenes/splittingCluster.ts). Variant of ConcentrationFan
 * (lasConexiones): many awards fanning from one buyer into one supplier — the
 * contract-splitting cluster. `valueRef` / `clusterSumRef` are internal.
 */
interface ClusterAward {
  date: string;
  value: number;
  valueRef: string;
}
interface SplittingClusterParams {
  buyer: string;
  supplierId: string;
  supplierDisplay: string;
  awards: ClusterAward[];
  clusterSum: number;
  clusterSumRef: string;
  caption: string;
}

interface SplittingClusterProps {
  params: unknown;
  investigation: InvestigationFull;
  chapter: Chapter;
}

const VB_W = 900;
const VB_H = 440;
const BUYER_X = 120;
const BUYER_Y = 220;
const SUPPLIER_X = 680;
const SUPPLIER_Y = 220;
const FAN_TOP = 120;
const FAN_BOTTOM = 320;
const MAX_PATHS = 12;

export default function SplittingCluster({ params }: SplittingClusterProps) {
  const { t, i18n } = useTranslation();
  const p = params as SplittingClusterParams;
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const [nodesIn, setNodesIn] = useState(false);

  const shown = p.awards.slice(0, MAX_PATHS);
  const overflow = p.awards.length - shown.length;
  const max = Math.max(...p.awards.map((a) => a.value), 1);

  const sum = useCountUp(p.clusterSum, { enabled: nodesIn, duration: 1.6 });

  return (
    <div ref={ref}>
      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="h-auto w-full"
          role="img"
          aria-label={p.caption}
          preserveAspectRatio="xMidYMid meet"
        >
          {shown.map((a, i) => {
            const yStart =
              shown.length === 1
                ? BUYER_Y
                : FAN_TOP + (i / (shown.length - 1)) * (FAN_BOTTOM - FAN_TOP);
            const d = `M ${BUYER_X} ${yStart} C ${VB_W * 0.42} ${yStart}, ${VB_W * 0.5} ${SUPPLIER_Y}, ${SUPPLIER_X} ${SUPPLIER_Y}`;
            const w = (a.value / max) * 6 + 1;
            return (
              <m.path
                key={`${i}-${a.date}`}
                d={d}
                fill="none"
                stroke="rgba(154,154,160,0.28)"
                strokeWidth={w}
                strokeLinecap="round"
                initial={reduce ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                animate={inView ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                transition={
                  reduce
                    ? { duration: 0.001 }
                    : { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 + i * 0.06 }
                }
                onAnimationComplete={() => {
                  if (i === shown.length - 1) setNodesIn(true);
                }}
              />
            );
          })}

          {/* Buyer node */}
          <m.circle
            cx={BUYER_X}
            cy={BUYER_Y}
            r={16}
            fill="#17171A"
            stroke="#262629"
            strokeWidth={1}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0 }}
            animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: reduce ? 1 : 0 }}
            transition={reduce ? { duration: 0.2 } : { type: 'spring', bounce: 0.15, delay: 0.1 }}
            style={{ transformOrigin: `${BUYER_X}px ${BUYER_Y}px` }}
          />

          {/* Supplier node (emphasised) */}
          <m.circle
            cx={SUPPLIER_X}
            cy={SUPPLIER_Y}
            r={18}
            fill="#121214"
            stroke="#E10600"
            strokeWidth={2}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0 }}
            animate={nodesIn ? { opacity: 1, scale: 1 } : { opacity: 0, scale: reduce ? 1 : 0 }}
            transition={reduce ? { duration: 0.2 } : { type: 'spring', bounce: 0.15 }}
            style={{ transformOrigin: `${SUPPLIER_X}px ${SUPPLIER_Y}px` }}
          />
        </svg>

        {/* HTML overlay labels (glow via CSS box, NOT SVG filter) */}
        <div className="pointer-events-none absolute inset-0">
          {/* Buyer node sits near the left edge, so anchor its label
              centered *below* the node (clear of the fan, which occupies
              y 120–320) rather than to its left where it would clip. */}
          <div
            className="absolute max-w-[220px] -translate-x-1/2 rounded border border-line bg-bg-panel-2 px-3 py-1.5 text-center"
            style={{
              left: `${(BUYER_X / VB_W) * 100}%`,
              top: `calc(${(BUYER_Y / VB_H) * 100}% + 2rem)`,
            }}
          >
            <p className="font-body text-body-sm text-text-hi text-pretty break-words">
              {p.buyer}
            </p>
          </div>
          <div
            className="red-glow-box absolute -translate-y-1/2 rounded border border-accent-red bg-bg-panel-2 px-3 py-1.5"
            style={{
              left: `${(SUPPLIER_X / VB_W) * 100}%`,
              top: `${(SUPPLIER_Y / VB_H) * 100}%`,
              marginLeft: '1.5rem',
            }}
          >
            <p className="font-body text-body-sm text-text-hi">{p.supplierDisplay}</p>
          </div>
        </div>
      </div>

      {overflow > 0 && (
        <p className="mt-2 numeric-tabular font-body text-[11px] text-text-dim">
          {t('article.scene.more', { count: overflow })}
        </p>
      )}

      {/* Cluster sum + caption */}
      <div className="mt-8 flex flex-col gap-2 border-t border-line pt-6">
        <p
          className={cn(
            'numeric-tabular font-display text-display-2xl text-text-hi',
            nodesIn && 'red-glow',
          )}
        >
          {formatGTQ(sum, i18n.language)}
        </p>
        <p className="font-body text-body-sm text-text-mid text-pretty">{p.caption}</p>
      </div>

      {/* Screen-reader equivalent */}
      <table className="sr-only">
        <caption>{p.caption}</caption>
        <thead>
          <tr>
            <th>{t('article.scene.column.date')}</th>
            <th>{t('article.scene.column.value')}</th>
          </tr>
        </thead>
        <tbody>
          {p.awards.map((a, i) => (
            <tr key={`sr-${i}-${a.date}`}>
              <td>{a.date}</td>
              <td>{formatGTQ(a.value, i18n.language)}</td>
            </tr>
          ))}
          <tr>
            <th scope="row">{p.supplierDisplay}</th>
            <td>{formatGTQ(p.clusterSum, i18n.language)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
