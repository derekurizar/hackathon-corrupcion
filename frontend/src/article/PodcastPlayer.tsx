import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { m } from 'framer-motion';
import type { InvestigationFull, CuePoint } from '@/api/schemas';
import type { I18nKey } from '@/i18n/keys';
import { resolveMediaUrl } from '@/api/media';
import { cn } from '@/lib/utils';
import { useArticleState } from './ArticleStateContext';

const PRIORITY_STYLE: Record<
  InvestigationFull['reviewPriority'],
  { dot: string; text: string; key: I18nKey }
> = {
  high: { dot: 'bg-priority-high', text: 'text-priority-high', key: 'article.priorityHigh' },
  medium: { dot: 'bg-priority-med', text: 'text-priority-med', key: 'article.priorityMedium' },
  low: { dot: 'bg-priority-low', text: 'text-priority-low', key: 'article.priorityLow' },
};

/** `s` → `m:ss` (`-` while duration is unknown). */
function clock(s: number): string {
  if (!Number.isFinite(s) || s < 0) return '–:––';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/**
 * LISTEN-mode player (idea/05). Replaces the cinematic article when
 * `mode === 'podcast'`: an elegant transport over the shared audio
 * controller — play/pause, scrub, per-chapter cue jumps, and a download of
 * the current-language `.mp3`. Track selection + language switching live in
 * `ArticleShell` (it owns `setTrack`); this component only drives playback.
 */
export function PodcastPlayer({ data }: { data: InvestigationFull }) {
  const { t, i18n } = useTranslation();
  const { audioController } = useArticleState();
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'es';

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!audioController) return;
    const offTime = audioController.onTime(setCurrent);
    const offDur = audioController.onDuration((d) =>
      setDuration(Number.isFinite(d) ? d : 0),
    );
    const offState = audioController.onPlayState(setPlaying);
    return () => {
      offTime();
      offDur();
      offState();
    };
  }, [audioController]);

  const audioUrl = data.audio ? resolveMediaUrl(data.audio[lang]) : undefined;
  const cues: CuePoint[] = useMemo(
    () => data.podcastCuePoints?.[lang] ?? [],
    [data.podcastCuePoints, lang],
  );
  const supplierName =
    lang === 'es' ? data.supplier.displayNameEs : data.supplier.displayNameEn;
  const prio = PRIORITY_STYLE[data.reviewPriority] ?? PRIORITY_STYLE.low;

  const activeCueIdx = cues.reduce(
    (acc, c, i) => (current + 0.25 >= c.tSec ? i : acc),
    -1,
  );

  const togglePlay = () => {
    if (!audioController) return;
    if (playing) audioController.pause();
    else void audioController.play();
  };

  const downloadName = `Expediente-${data.caseKey.replace(/[^\w.-]+/g, '_')}-${lang}.mp3`;

  return (
    <div className="relative flex min-h-svh flex-col overflow-y-auto">
      <div
        aria-hidden="true"
        className="duotone-red vignette-heavy absolute inset-0 z-0 bg-bg-panel"
      />
      <div
        className="relative z-10 mx-auto flex w-full max-w-[820px] flex-1 flex-col justify-center py-16"
        style={{ paddingInline: 'clamp(1rem, 5vw, 4rem)' }}
      >
        {/* Header — case identity */}
        <p className="kicker text-text-mid">{data.headline.kicker}</p>
        <h1 className="headline-display mt-3 text-display-xl text-text-hi text-balance">
          {data.headline.headline}
        </h1>

        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-line pt-6">
          <div>
            <p className="kicker">{t('article.heroBuyer')}</p>
            <p className="font-body text-body-md text-text-hi">{data.buyer.name}</p>
          </div>
          <div>
            <p className="kicker">{t('article.heroSupplier')}</p>
            <p className="font-body text-body-md text-text-mid">{supplierName}</p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-line px-3 py-1.5">
            <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', prio.dot)} />
            <span className={cn('font-body text-[11px] uppercase tracking-label', prio.text)}>
              {t(prio.key)}
            </span>
          </div>
        </div>

        {audioUrl ? (
          <>
            {/* Transport */}
            <div className="mt-12 flex items-center gap-5">
              <m.button
                type="button"
                onClick={togglePlay}
                aria-label={playing ? t('podcast.pause') : t('podcast.play')}
                aria-pressed={playing}
                whileTap={{ scale: 0.9 }}
                className={cn(
                  'flex h-16 w-16 shrink-0 items-center justify-center rounded-full border bg-bg-panel-2 text-text-hi transition-colors',
                  playing ? 'border-accent-red red-glow-box' : 'border-line',
                )}
              >
                {playing ? (
                  <svg width="20" height="20" viewBox="0 0 14 14" aria-hidden="true" fill="currentColor">
                    <rect x="2" y="1.5" width="3.5" height="11" rx="0.5" />
                    <rect x="8.5" y="1.5" width="3.5" height="11" rx="0.5" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 14 14" aria-hidden="true" fill="currentColor">
                    <path d="M3 1.8v10.4a.6.6 0 0 0 .92.5l8.2-5.2a.6.6 0 0 0 0-1l-8.2-5.2A.6.6 0 0 0 3 1.8Z" />
                  </svg>
                )}
              </m.button>

              <div className="flex min-w-[180px] flex-1 flex-col gap-2">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={Math.min(current, duration || 0)}
                  onChange={(e) =>
                    audioController?.seek(Number(e.target.value))
                  }
                  aria-label={t('podcast.elapsed')}
                  className="h-1 w-full cursor-pointer appearance-none rounded-full bg-line accent-accent-red"
                />
                <div className="flex justify-between font-body text-[11px] uppercase tracking-label text-text-dim">
                  <span className="numeric-tabular">{clock(current)}</span>
                  <span className="numeric-tabular">{clock(duration)}</span>
                </div>
              </div>
            </div>

            {/* Download — its own row so it never clips at narrow widths */}
            <a
              href={audioUrl}
              download={downloadName}
              aria-label={t('podcast.download')}
              title={t('podcast.download')}
              className="mt-5 inline-flex h-10 w-fit items-center gap-2 rounded-full border border-line bg-bg-panel-2 px-4 font-body text-[11px] uppercase tracking-label text-text-mid transition-colors hover:text-text-hi"
            >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 1.5v8M3.6 6.1 7 9.5l3.4-3.4M2 12h10" />
                </svg>
                {t('podcast.download')}
              </a>

            {/* Chapter cues */}
            {cues.length > 0 && (
              <div className="mt-12 border-t border-line pt-6">
                <p className="kicker mb-3">{t('podcast.chapters')}</p>
                <ul className="flex flex-col">
                  {cues.map((c, i) => {
                    const active = i === activeCueIdx;
                    return (
                      <li key={`${c.chapter}-${c.tSec}`}>
                        <button
                          type="button"
                          onClick={() => audioController?.seek(c.tSec)}
                          aria-current={active ? 'true' : undefined}
                          className={cn(
                            'flex w-full items-center justify-between gap-4 border-b border-line/60 py-3 text-left transition-colors',
                            active
                              ? 'text-accent-red'
                              : 'text-text-mid hover:text-text-hi',
                          )}
                        >
                          <span className="flex items-center gap-3">
                            <span
                              aria-hidden="true"
                              className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                active ? 'bg-accent-red' : 'bg-line',
                              )}
                            />
                            <span className="font-body text-body-md">{c.chapter}</span>
                          </span>
                          <span className="numeric-tabular font-body text-[11px] uppercase tracking-label text-text-dim">
                            {clock(c.tSec)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="mt-12 border-t border-line pt-6 font-body text-body-md text-text-mid">
            {t('podcast.noAudio')}
          </p>
        )}
      </div>
    </div>
  );
}
