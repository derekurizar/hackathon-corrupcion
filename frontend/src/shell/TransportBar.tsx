import { useTranslation } from 'react-i18next';
import { useMode, type NavMode } from './ModeContext';
import { cn } from '@/lib/utils';

const MODES = [
  { mode: 'scroll', key: 'mode.scroll' },
  { mode: 'presentation', key: 'mode.presentation' },
  { mode: 'podcast', key: 'mode.podcast' },
] as const satisfies readonly { mode: NavMode; key: string }[];

/**
 * Bottom transport bar (idea/05): progress/scrubber (left), mode buttons
 * (center), language toggle (right). Scrubber fill is scaffold (0%) until
 * Area 11 wires scroll/audio progress.
 */
export function TransportBar() {
  const { t, i18n } = useTranslation();
  const { mode, setMode } = useMode();
  const progress = 0; // Area 11 binds real scroll/audio progress.

  const toggleLang = () => {
    void i18n.changeLanguage(i18n.resolvedLanguage === 'es' ? 'en' : 'es');
  };

  return (
    <div className="flex h-full items-center gap-4 border-t border-line bg-bg-panel px-4">
      {/* Zone 1 — progress / scrubber */}
      <div
        className="flex-1"
        role="progressbar"
        aria-label={t('transport.progress')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div className="h-[3px] w-full rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent-red transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Zone 2 — mode buttons */}
      <div
        role="group"
        aria-label={t('mode.label')}
        className="flex items-center gap-1"
      >
        {MODES.map(({ mode: m, key }) => {
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              aria-pressed={active}
              onClick={() => setMode(m)}
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
