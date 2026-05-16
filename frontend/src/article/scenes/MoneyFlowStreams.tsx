import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { m, useInView, useReducedMotion } from 'framer-motion';
import type { Chapter } from '@/_scene-contract';
import type { InvestigationFull } from '@/api/schemas';
import { cn } from '@/lib/utils';
import { useCountUp } from './useCountUp';
import { formatInt, formatShare } from './format';

/** Hand-mirror of the synced `MoneyFlowStreams` schema. */
interface MoneyFlowStream {
  supplierId: string;
  supplierDisplay: string;
  amount: number;
  amountRef: string;
  share: number;
  shareRef: string;
}
interface MoneyFlowStreamsParams {
  buyer: string;
  totalValue: number;
  totalRef: string;
  streams: MoneyFlowStream[];
  emphasisSupplierId: string;
  caption: string;
}

interface MoneyFlowStreamsProps {
  params: unknown;
  investigation: InvestigationFull;
  chapter: Chapter;
}

const VB_W = 1000;
const VB_H = 520;
const BUYER_X = VB_W * 0.1;
const SUPPLIER_X = VB_W * 0.8;

export default function MoneyFlowStreams({ params }: MoneyFlowStreamsProps) {
  const { i18n } = useTranslation();
  const p = params as MoneyFlowStreamsParams;
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const [nodesIn, setNodesIn] = useState(false);

  const streams = p.streams.length > 0 ? p.streams : [];
  const buyerY = VB_H / 2;
  const rowH = streams.length > 0 ? VB_H / (streams.length + 1) : VB_H;

  const total = useCountUp(p.totalValue, {
    enabled: nodesIn,
    duration: 1.6,
  });

  const pathTransition = (i: number) =>
    reduce
      ? { duration: 0.001 }
      : {
          duration: 0.9,
          ease: [0.16, 1, 0.3, 1] as const,
          delay: 0.15 + i * 0.08,
        };

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
          {/* Streams */}
          {streams.map((s, i) => {
            const y = rowH * (i + 1);
            const emphasized = s.supplierId === p.emphasisSupplierId;
            const d = `M ${BUYER_X} ${buyerY} C ${VB_W * 0.45} ${buyerY}, ${VB_W * 0.5} ${y}, ${SUPPLIER_X} ${y}`;
            const w = 2 + Math.min(10, Math.max(0, s.share * 14));
            return (
              <m.path
                key={s.supplierId}
                d={d}
                fill="none"
                stroke={
                  emphasized ? 'rgba(225,6,0,0.4)' : 'rgba(154,154,160,0.28)'
                }
                strokeWidth={w}
                strokeLinecap="round"
                initial={
                  reduce
                    ? { pathLength: 1, opacity: 1 }
                    : { pathLength: 0, opacity: 0 }
                }
                animate={
                  inView
                    ? { pathLength: 1, opacity: 1 }
                    : { pathLength: 0, opacity: 0 }
                }
                transition={pathTransition(i)}
                onAnimationComplete={() => {
                  if (i === streams.length - 1) setNodesIn(true);
                }}
              />
            );
          })}

          {/* Buyer node */}
          <m.circle
            cx={BUYER_X}
            cy={buyerY}
            r={18}
            fill="#17171A"
            stroke="#262629"
            strokeWidth={1}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0 }}
            animate={
              inView
                ? { opacity: 1, scale: 1 }
                : { opacity: 0, scale: 0 }
            }
            transition={
              reduce
                ? { duration: 0.2 }
                : { type: 'spring', bounce: 0.15, delay: 0.1 }
            }
            style={{ transformOrigin: `${BUYER_X}px ${buyerY}px` }}
          />

          {/* Supplier nodes */}
          {streams.map((s, i) => {
            const y = rowH * (i + 1);
            const emphasized = s.supplierId === p.emphasisSupplierId;
            return (
              <m.circle
                key={s.supplierId}
                cx={SUPPLIER_X}
                cy={y}
                r={emphasized ? 16 : 12}
                fill="#121214"
                stroke={emphasized ? '#E10600' : '#262629'}
                strokeWidth={emphasized ? 2 : 1}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0 }}
                animate={
                  nodesIn
                    ? { opacity: 1, scale: 1 }
                    : { opacity: 0, scale: reduce ? 1 : 0 }
                }
                transition={
                  reduce
                    ? { duration: 0.2 }
                    : { type: 'spring', bounce: 0.15, delay: i * 0.06 }
                }
                style={{ transformOrigin: `${SUPPLIER_X}px ${y}px` }}
              />
            );
          })}
        </svg>

        {/* HTML overlay labels (glow via CSS box, NOT SVG filter) */}
        <div className="pointer-events-none absolute inset-0">
          {streams.map((s, i) => {
            const y = rowH * (i + 1);
            const emphasized = s.supplierId === p.emphasisSupplierId;
            return (
              <div
                key={s.supplierId}
                className={cn(
                  'absolute -translate-y-1/2 rounded border border-line bg-bg-panel-2 px-3 py-1.5',
                  emphasized && 'red-glow-box border-accent-red',
                )}
                style={{
                  left: `${(SUPPLIER_X / VB_W) * 100}%`,
                  top: `${(y / VB_H) * 100}%`,
                  marginLeft: '1.5rem',
                }}
              >
                <p className="font-body text-body-sm text-text-hi">
                  {s.supplierDisplay}
                </p>
                <p className="numeric-tabular font-body text-[11px] text-text-mid">
                  {formatInt(s.amount, i18n.language)} · {formatShare(s.share)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Total + caption */}
      <div className="mt-8 flex flex-col gap-2 border-t border-line pt-6">
        <p className="numeric-tabular font-display text-display-lg text-text-hi">
          {formatInt(total, i18n.language)}
        </p>
        <p className="font-body text-body-sm text-text-mid">{p.caption}</p>
      </div>
    </div>
  );
}
