import { useEffect, useState } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

type CountUpOptions = {
  /** Start the count-up (e.g. when the scene enters view). */
  enabled?: boolean;
  /** Seconds. Scaled to magnitude by the caller; default 1.8s. */
  duration?: number;
  /** Fires once the count-up settles (used for the red-glow accent). */
  onComplete?: () => void;
};

/**
 * Count-up driven by framer-motion `animate` (compositor-safe — it only
 * mutates a number we render as text). Reduced motion → jumps to the final
 * value instantly and fires `onComplete` immediately (the glow still lands;
 * reduced-motion is not "no feedback").
 */
export function useCountUp(
  target: number,
  { enabled = true, duration = 1.8, onComplete }: CountUpOptions = {},
): number {
  const reduce = useReducedMotion();
  const safeTarget = Number.isFinite(target) ? target : 0;
  const [value, setValue] = useState(reduce ? safeTarget : 0);

  useEffect(() => {
    if (!enabled) return;

    if (reduce) {
      setValue(safeTarget);
      onComplete?.();
      return;
    }

    const controls = animate(0, safeTarget, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValue(v),
      onComplete: () => {
        setValue(safeTarget);
        onComplete?.();
      },
    });
    return () => controls.stop();
    // onComplete intentionally excluded — callers pass inline fns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reduce, safeTarget, duration]);

  return value;
}
