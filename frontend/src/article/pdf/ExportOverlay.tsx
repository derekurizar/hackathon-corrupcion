import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { PdfExportController } from './usePdfExport';

const BTN =
  'h-9 min-w-[96px] rounded-sm border px-4 font-body text-[11px] uppercase tracking-label transition-colors';

/**
 * Fully-opaque dark curtain shown while the PDF is generated. It sits above
 * the `CaptureStage` (higher z-index) so the user never sees the per-chapter
 * capture happening underneath — only a progress indicator. Keeps the dark
 * cinematic look in-UI. Portaled to `document.body` so the app-shell CSS grid
 * never clips it.
 */
export function ExportOverlay({ controller }: { controller: PdfExportController }) {
  const { t } = useTranslation();
  const { phase, current, total, cancel, retry, dismissError } = controller;

  if (phase === 'idle') return null;

  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('pdf.generating')}
      style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
      className="flex items-center justify-center bg-bg-base"
    >
      <div className="mx-auto flex w-full max-w-[420px] flex-col items-center px-6 text-center">
        {phase === 'running' ? (
          <>
            <p className="kicker text-text-mid">{t('pdf.generating')}</p>
            <p className="numeric-tabular mt-4 font-display text-display-lg text-text-hi">
              {t('pdf.progress', { n: current, total })}
            </p>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              className="mt-6 h-[3px] w-full rounded-full bg-line"
            >
              <div
                className="h-full rounded-full bg-accent-red transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <button
              type="button"
              onClick={cancel}
              className={`${BTN} mt-10 border-line text-text-dim hover:text-text-mid`}
            >
              {t('pdf.cancel')}
            </button>
          </>
        ) : (
          <>
            <p className="kicker text-accent-red">{t('pdf.error')}</p>
            <div className="mt-10 flex items-center gap-3">
              <button
                type="button"
                onClick={retry}
                className={`${BTN} border-accent-red text-text-hi red-glow-box`}
              >
                {t('pdf.retry')}
              </button>
              <button
                type="button"
                onClick={dismissError}
                className={`${BTN} border-line text-text-dim hover:text-text-mid`}
              >
                {t('pdf.close')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
