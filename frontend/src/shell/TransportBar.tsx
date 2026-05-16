import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { m } from 'framer-motion';
import type { Chapter } from '@/_scene-contract';
import { useMode, type NavMode } from './ModeContext';
import { useArticleState } from '@/article/ArticleStateContext';
import { cn } from '@/lib/utils';

const MODES = [
  { mode: 'scroll', key: 'mode.scroll' },
  { mode: 'presentation', key: 'mode.presentation' },
  { mode: 'podcast', key: 'mode.podcast' },
] as const satisfies readonly { mode: NavMode; key: string }[];

/** Fixed chapter spine — drives the 7 center tick marks. */
const CHAPTER_TICKS: Chapter[] = [
  'cover',
  'elCaso',
  'sigueElDinero',
  'lasConexiones',
  'evidencia',
  'cronologia',
  'cierre',
];

/**
 * Bottom transport bar (idea/05): progress/scrubber + chapter ticks (left),
 * mode buttons (center), language toggle (right). A play/pause control
 * appears only when an audio controller is registered (Podcast mode).
 */
export function TransportBar() {
  const { t, i18n } = useTranslation();
  const { mode, setMode } = useMode();
  const { progress, activeChapter, audioController } = useArticleState();
  const [playing, setPlaying] = useState(false);

  const pct = Math.round(progress * 100);

  const toggleLang = () => {
    void i18n.changeLanguage(i18n.resolvedLanguage === 'es' ? 'en' : 'es');
  };

  const togglePlay = () => {
    if (!audioController) return;
    if (playing) {
      audioController.pause();
      setPlaying(false);
    } else {
      void audioController.play();
      setPlaying(true);
    }
  };

  return (
    <div className="flex h-full items-center gap-4 border-t border-line bg-bg-panel px-4">
      {/* Zone 1 — progress / scrubber + chapter ticks */}
      {/* TODO(P4): podcast cue-point scrubbing (seek on tick / drag) */}
      <div className="flex flex-1 flex-col gap-1.5">
        <div
          role="progressbar"
          aria-label={t('transport.progress')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="h-[3px] w-full rounded-full bg-line"
        >
          <div
            className="h-full rounded-full bg-accent-red transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div
          aria-hidden="true"
          className="flex items-center justify-between"
        >
          {CHAPTER_TICKS.map((ch) => {
            const active = activeChapter === ch;
            return (
              <span
                key={ch}
                className={cn(
                  'w-[2px] rounded-full transition-[height,background-color] duration-200',
                  active ? 'h-3 bg-accent-red' : 'h-2 bg-line',
                )}
              />
            );
          })}
        </div>
      </div>

      {/* Play/pause — Podcast transport (only when audio is registered) */}
      {audioController && (
        <m.button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? t('podcast.pause') : t('podcast.play')}
          aria-pressed={playing}
          whileTap={{ scale: 0.88 }}
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-bg-panel-2 text-text-hi',
            playing ? 'border-accent-red red-glow-box' : 'border-line',
          )}
        >
          {playing ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              aria-hidden="true"
              fill="currentColor"
            >
              <rect x="2" y="1.5" width="3.5" height="11" rx="0.5" />
              <rect x="8.5" y="1.5" width="3.5" height="11" rx="0.5" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              aria-hidden="true"
              fill="currentColor"
            >
              <path d="M3 1.8v10.4a.6.6 0 0 0 .92.5l8.2-5.2a.6.6 0 0 0 0-1l-8.2-5.2A.6.6 0 0 0 3 1.8Z" />
            </svg>
          )}
        </m.button>
      )}

      {/* Zone 2 — mode buttons */}
      <div
        role="group"
        aria-label={t('mode.label')}
        className="flex items-center gap-1"
      >
        {MODES.map(({ mode: m2, key }) => {
          const active = mode === m2;
          return (
            <button
              key={m2}
              type="button"
              aria-pressed={active}
              onClick={() => setMode(m2)}
              className={cn(
                'h-8 min-w-[72px] rounded-sm border px-3 font-body text-[10px] uppercase tracking-label transition-colors',
                active
                  ? 'border-line bg-bg-panel-2 text-text-hi'
                  : 'border-transparent text-text-dim hover:text-text-mid',
              )}
            >
              {t(key)}
            </button>
          );
        })}
      </div>

      {/* Zone 3 — language toggle */}
      <button
        type="button"
        role="switch"
        aria-checked={i18n.resolvedLanguage === 'en'}
        aria-label={t('lang.label')}
        onClick={toggleLang}
        className="flex h-7 items-center gap-1 rounded-full border border-line px-2 font-body text-[10px] uppercase tracking-label"
      >
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5',
            i18n.resolvedLanguage === 'es'
              ? 'bg-accent-red text-text-hi'
              : 'text-text-dim',
          )}
        >
          ES
        </span>
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5',
            i18n.resolvedLanguage === 'en'
              ? 'bg-accent-red text-text-hi'
              : 'text-text-dim',
          )}
        >
          EN
        </span>
      </button>
    </div>
  );
}
