import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { m, useInView, useReducedMotion } from 'framer-motion';
import type { Chapter } from '@/_scene-contract';
import type { InvestigationFull } from '@/api/schemas';
import { cn } from '@/lib/utils';
import { formatInt, formatShare } from './format';

/**
 * Hand-mirror of the synced `RepeatBidders` schema
 * (_scene-contract/scenes/repeatBidders.ts). Variant of ConcentrationFan
 * (lasConexiones): the same bidders appearing across tenders, with their win
 * share. `appearancesRef` / `winsRef` are internal — never rendered.
 */
interface RepeatBidder {
  bidderId: string;
  bidderDisplay: string;
  appearances: number;
  appearancesRef: string;
  wins: number;
  winsRef: string;
}
interface RepeatBiddersParams {
  buyer: string;
  bidders: RepeatBidder[];
  caption: string;
}

interface RepeatBiddersProps {
  params: unknown;
  investigation: InvestigationFull;
  chapter: Chapter;
}

export default function RepeatBidders({ params }: RepeatBiddersProps) {
  const { t, i18n } = useTranslation();
  const p = params as RepeatBiddersParams;
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  const maxAppearances = Math.max(...p.bidders.map((b) => b.appearances), 1);

  return (
    <div ref={ref} className="max-w-[760px]">
      <p className="mb-6 font-body text-body-sm text-text-mid text-pretty">{p.buyer}</p>

      {/* Header */}
      <div className="mb-3 flex items-center gap-4 border-b border-line pb-2">
        <span className="w-[200px] shrink-0 kicker">
          {t('article.scene.repeatBidder.company')}
        </span>
        <span className="flex-1 kicker">
          {t('article.scene.repeatBidder.appearances')} ·{' '}
          {t('article.scene.repeatBidder.wins')}
        </span>
        <span className="w-[110px] shrink-0 text-right kicker">
          {t('article.scene.repeatBidder.winRate')}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {p.bidders.map((b, i) => {
          const rate = b.appearances > 0 ? b.wins / b.appearances : 0;
          const dominant = rate > 0.7;
          const appPct = (b.appearances / maxAppearances) * 100;
          const winPct = b.appearances > 0 ? (b.wins / b.appearances) * appPct : 0;
          return (
            <m.div
              key={b.bidderId}
              className={cn(
                'flex items-center gap-4 rounded p-2',
                dominant && 'red-glow-box border border-accent-red',
              )}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: -12 }}
              animate={inView ? { opacity: 1, x: 0 } : { opacity: 0 }}
              transition={
                reduce
                  ? { duration: 0.2 }
                  : { duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.1 + i * 0.07 }
              }
            >
              <span
                className="w-[200px] shrink-0 truncate font-body text-body-sm text-text-hi"
                title={b.bidderDisplay}
              >
                {b.bidderDisplay}
              </span>
              <div className="relative h-5 flex-1">
                <m.div
                  className="absolute inset-y-0 left-0 rounded-l bg-text-mid opacity-40"
                  initial={{ width: reduce ? `${appPct}%` : '0%' }}
                  animate={inView ? { width: `${appPct}%` } : { width: reduce ? `${appPct}%` : '0%' }}
                  transition={
                    reduce
                      ? { duration: 0.001 }
                      : { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 + i * 0.07 }
                  }
                />
                <m.div
                  className="absolute inset-y-0 left-0 rounded-r bg-accent-red"
                  initial={{ width: reduce ? `${winPct}%` : '0%' }}
                  animate={inView ? { width: `${winPct}%` } : { width: reduce ? `${winPct}%` : '0%' }}
                  transition={
                    reduce
                      ? { duration: 0.001 }
                      : { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 + i * 0.07 + 0.1 }
                  }
                />
              </div>
              <span
                className={cn(
                  'w-[110px] shrink-0 text-right numeric-tabular font-body text-body-sm',
                  dominant ? 'text-accent-red' : 'text-text-mid',
                )}
              >
                {formatShare(rate)}
              </span>
            </m.div>
          );
        })}
      </div>

      <p className="mt-8 border-t border-line pt-6 font-body text-body-sm text-text-mid text-pretty">
        {p.caption}
      </p>

      {/* Screen-reader equivalent */}
      <table className="sr-only">
        <caption>{p.caption}</caption>
        <thead>
          <tr>
            <th>{t('article.scene.repeatBidder.company')}</th>
            <th>{t('article.scene.repeatBidder.appearances')}</th>
            <th>{t('article.scene.repeatBidder.wins')}</th>
            <th>{t('article.scene.repeatBidder.winRate')}</th>
          </tr>
        </thead>
        <tbody>
          {p.bidders.map((b) => (
            <tr key={`sr-${b.bidderId}`}>
              <td>{b.bidderDisplay}</td>
              <td>{formatInt(b.appearances, i18n.language)}</td>
              <td>{formatInt(b.wins, i18n.language)}</td>
              <td>{formatShare(b.appearances > 0 ? b.wins / b.appearances : 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
