import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { m } from 'framer-motion';
import { useMode, type NavMode } from './ModeContext';
import { useArticleState } from '@/article/ArticleStateContext';
import { useAmbientAudio } from './useAmbientAudio';
import { cn } from '@/lib/utils';
import { CHAPTER_ORDER, CHAPTER_LABEL_KEY } from './chapters';

const MODES = [
  { mode: 'scroll', key: 'mode.scroll' },
  { mode: 'presentation', key: 'mode.presentation' },
  { mode: 'podcast', key: 'mode.podcast' },
] as const satisfies readonly { mode: NavMode; key: string }[];

type TransportBarProps = {
  /** Kick off the investigation → PDF export (no-op off the article route). */
  onExportPdf?: () => void;
  /** Disable the PDF button (export running, or data not yet cached). */
  pdfDisabled?: boolean;
};

/**
 * Bottom transport bar (idea/05): progress/scrubber + chapter ticks (left),
 * mode buttons (center), language toggle (right). A play/pause control
 * appears only when an audio controller is registered (Podcast mode).
 *
 * The bar is always visible, but the progress/ticks, the READ/VIEW/LISTEN
 * mode buttons and the PDF export only appear once an investigation is
 * selected (`activeChapter !== null`). On the neutral routes the bar shows
 * just the ambient-sound and language controls.
 */
export function TransportBar({ onExportPdf, pdfDisabled }: TransportBarProps) {
  const { t, i18n } = useTranslation();
  const { mode, setMode } = useMode();
  const {
    progress,
    activeChapter,
    audioController,
    caseKey,
    scrollToChapter,
    presentationPlaying,
    togglePresentation,
  } = useArticleState();
  const { enabled: ambientOn, toggle: toggleAmbient } = useAmbientAudio();
  const [playing, setPlaying] = useState(false);

  const articleSelected = activeChapter !== null;
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
      {/* Zone 1 — progress / scrubber + chapter ticks (only with an article;
          otherwise a flex spacer keeps the controls pinned right). */}
      {/* TODO(P4): podcast cue-point scrubbing (seek on tick / drag) */}
      {!articleSelected ? (
        <div className="flex-1" aria-hidden="true" />
      ) : (
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
            role="group"
            aria-label={t('chapter.rail')}
            className="flex items-center justify-between"
          >
            {CHAPTER_ORDER.map((ch) => {
              const active = activeChapter === ch;
              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() => scrollToChapter(ch)}
                  aria-label={t(CHAPTER_LABEL_KEY[ch])}
                  aria-current={active ? 'step' : undefined}
                  className="group flex h-7 flex-1 cursor-pointer items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red focus-visible:ring-offset-2 focus-visible:ring-offset-bg-panel"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'w-[2px] rounded-full transition-[height,background-color] duration-200',
                      active
                        ? 'h-3 bg-accent-red'
                        : 'h-2 bg-line group-hover:bg-text-dim',
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Play/pause — "VER" presentation auto-play (only in that mode) */}
      {articleSelected && mode === 'presentation' && (
        <m.button
          type="button"
          onClick={togglePresentation}
          aria-label={
            presentationPlaying
              ? t('presentation.pause')
              : t('presentation.play')
          }
          aria-pressed={presentationPlaying}
          whileTap={{ scale: 0.88 }}
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-bg-panel-2 text-text-hi',
            presentationPlaying
              ? 'border-accent-red red-glow-box'
              : 'border-line',
          )}
        >
          {presentationPlaying ? (
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

      {/* Zone 2 — mode buttons (only with an investigation selected) */}
      {articleSelected && (
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
      )}

      {/* PDF export — only with an investigation selected. Generates a PDF
          that reproduces the 7 chapters exactly as shown on screen. */}
      {articleSelected && caseKey && onExportPdf && (
        <m.button
          type="button"
          onClick={onExportPdf}
          disabled={pdfDisabled}
          aria-label={t('pdf.export')}
          title={t('pdf.export')}
          whileTap={{ scale: 0.88 }}
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-bg-panel-2 border-line text-text-dim transition-colors',
            pdfDisabled
              ? 'cursor-not-allowed opacity-40'
              : 'hover:text-text-mid',
          )}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 1.5H3.5A1 1 0 0 0 2.5 2.5v9a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V5z" />
            <path d="M8 1.5V5h3.5" />
            <path d="M7 7v3.2M5.4 8.8 7 10.4l1.6-1.6" />
          </svg>
        </m.button>
      )}

      {/* Ambient sound toggle — page-wide audio bed (on by default) */}
      <m.button
        type="button"
        onClick={toggleAmbient}
        aria-label={ambientOn ? t('audio.ambientOn') : t('audio.ambientOff')}
        aria-pressed={ambientOn}
        whileTap={{ scale: 0.88 }}
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-bg-panel-2',
          ambientOn
            ? 'border-accent-red text-accent-red red-glow-box'
            : 'border-line text-text-dim',
        )}
      >
        {ambientOn ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            aria-hidden="true"
            fill="currentColor"
          >
            <path d="M1 5h2.5L7 2v10L3.5 9H1z" />
            <path
              d="M9 4.5a3 3 0 0 1 0 5M10.8 2.7a5.5 5.5 0 0 1 0 8.6"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            aria-hidden="true"
            fill="currentColor"
          >
            <path d="M1 5h2.5L7 2v10L3.5 9H1z" />
            <path
              d="M9.5 5l3.5 4M13 5l-3.5 4"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        )}
      </m.button>

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
