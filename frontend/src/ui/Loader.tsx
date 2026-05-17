import { useTranslation } from 'react-i18next';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { I18nKey } from '@/i18n/keys';

type LoaderProps = {
  /** i18n key for the status label. Defaults to the generic loading string. */
  labelKey?: I18nKey;
  /** Extra wrapper classes (e.g. min-height per context). */
  className?: string;
};

/**
 * Single investigative-noir loading indicator for every "waiting for the
 * response" state — data fetches and Suspense fallbacks alike. A thin
 * accent-red ring sweeping over a dim track plus a pulsing uppercase label.
 * Accessible (`role="status"`, `aria-busy`) and honors reduced-motion
 * (no spin / no pulse).
 */
export default function Loader({
  labelKey = 'placeholder.loading',
  className,
}: LoaderProps) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        'flex min-h-[200px] flex-col items-center justify-center gap-4',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-7 w-7 rounded-full border-2 border-line border-t-accent-red',
          !reduce && 'animate-spin',
        )}
      />
      <p className={cn('kicker text-text-dim', !reduce && 'animate-pulse')}>
        {t(labelKey)}
      </p>
    </div>
  );
}
