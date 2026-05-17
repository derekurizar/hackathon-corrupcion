import { useEffect, useRef, type RefObject } from 'react';
import type { Chapter } from '@/_scene-contract';
import type { NavMode } from '@/shell/ModeContext';
import { useArticleState } from './ArticleStateContext';

/**
 * Reading-pace constants for presentation auto-advance. Deliberately generous:
 * the scenes use large cinematic type and the audience reads ES/EN at mixed
 * fluency — we'd rather linger than cut a read short. Tunable.
 */
export const PACING = {
  WORDS_PER_MINUTE: 130, // generous; sparse, large-type cinematic scenes
  BASE_MS: 2500, // land on + visually parse the scene/chart
  ANIM_BUDGET_MS: 2200, // count-ups (≤1.8s) + staggered entrances settle
  ANIM_BUDGET_REDUCED_MS: 600,
  MIN_DWELL_MS: 5000,
  MAX_DWELL_MS: 18000,
} as const;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * How long to dwell on one chapter before auto-advancing, sized to the scene's
 * rendered text so the reader can finish it. Pure — unit-tested.
 */
export function computeDwellMs(
  text: string,
  opts: { reducedMotion: boolean },
): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const anim = opts.reducedMotion
    ? PACING.ANIM_BUDGET_REDUCED_MS
    : PACING.ANIM_BUDGET_MS;
  const readMs = (words / PACING.WORDS_PER_MINUTE) * 60_000;
  return clamp(
    PACING.BASE_MS + anim + readMs,
    PACING.MIN_DWELL_MS,
    PACING.MAX_DWELL_MS,
  );
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Keys that mean "I want to scroll/navigate myself" → pause auto-play. */
const TAKEOVER_KEYS = new Set([
  'ArrowDown',
  'ArrowUp',
  'PageDown',
  'PageUp',
  'Home',
  'End',
  ' ',
  'Spacebar',
]);

type Options = {
  mode: NavMode;
  enabled: boolean;
  chapters: Chapter[];
  scrollRef: RefObject<HTMLDivElement | null>;
};

/**
 * Presentation auto-play engine (idea/05 "VER" mode). While
 * `mode === 'presentation'` and playing, it smooth-scrolls the article chapter
 * by chapter, dwelling on each scene long enough to read it (dwell sized to the
 * scene's text), then stops on the last chapter.
 *
 * Lives in `ArticleShell` (which owns the scroll DOM); state
 * (`presentationPlaying`) + the play/pause toggle are bridged through
 * `ArticleStateContext` so the TransportBar — outside the route `<Outlet/>` —
 * can drive it. Reuses `scrollToChapter` for the scroll itself (smooth /
 * reduced-motion fallback + optimistic active-chapter already handled there).
 */
export function usePresentationPlayback({
  mode,
  enabled,
  chapters,
  scrollRef,
}: Options): void {
  const {
    activeChapter,
    presentationPlaying,
    setPresentationPlaying,
    registerPresentationToggle,
    scrollToChapter,
  } = useArticleState();

  const indexRef = useRef(0);
  // Latest values readable from the long-lived toggle handler without
  // re-registering it on every render.
  const stateRef = useRef({ playing: presentationPlaying, activeChapter });
  stateRef.current = { playing: presentationPlaying, activeChapter };

  // Auto-start on entering presentation mode (always from the cover);
  // stop on leaving it. `presentationPlaying` is intentionally NOT a dep so a
  // pause (button / reader takeover) or the natural end-of-deck stop is not
  // immediately re-started by this effect.
  useEffect(() => {
    if (!enabled) return;
    if (mode === 'presentation') {
      indexRef.current = 0;
      setPresentationPlaying(true);
    } else {
      setPresentationPlaying(false);
    }
  }, [mode, enabled, setPresentationPlaying]);

  // Register the play/pause toggle for the TransportBar.
  useEffect(() => {
    registerPresentationToggle(() => {
      if (stateRef.current.playing) {
        setPresentationPlaying(false);
        return;
      }
      const last = chapters.length - 1;
      if (indexRef.current >= last) {
        indexRef.current = 0; // replay from the cover
      } else {
        // resume from wherever the reader currently is
        const ai = stateRef.current.activeChapter
          ? chapters.indexOf(stateRef.current.activeChapter)
          : -1;
        if (ai >= 0) indexRef.current = ai;
      }
      setPresentationPlaying(true);
    });
    return () => registerPresentationToggle(null);
  }, [registerPresentationToggle, setPresentationPlaying, chapters]);

  // Playback loop: a cancellable recursive setTimeout chain.
  useEffect(() => {
    if (!enabled || mode !== 'presentation' || !presentationPlaying) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const last = chapters.length - 1;

    const step = () => {
      if (cancelled) return;
      const i = Math.min(indexRef.current, last);
      const ch = chapters[i];
      if (!ch) return;

      scrollToChapter(ch);

      const el = scrollRef.current?.querySelector<HTMLElement>(`#${ch}`);
      const dwell = computeDwellMs(el?.textContent ?? '', {
        reducedMotion: prefersReducedMotion(),
      });

      timer = setTimeout(() => {
        if (cancelled) return;
        if (indexRef.current >= last) {
          setPresentationPlaying(false); // idle at the end
          return;
        }
        indexRef.current += 1;
        step();
      }, dwell);
    };

    step();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [
    enabled,
    mode,
    presentationPlaying,
    chapters,
    scrollRef,
    scrollToChapter,
    setPresentationPlaying,
  ]);

  // Reader takeover: a manual scroll / touch / nav-key pauses auto-advance so
  // the engine never fights the reader. Our programmatic `scrollIntoView`
  // emits none of these, so there are no false positives.
  useEffect(() => {
    if (!enabled || mode !== 'presentation' || !presentationPlaying) return;
    const root = scrollRef.current;
    if (!root) return;

    const pause = () => setPresentationPlaying(false);
    const onKey = (e: KeyboardEvent) => {
      if (TAKEOVER_KEYS.has(e.key)) pause();
    };

    root.addEventListener('wheel', pause, { passive: true });
    root.addEventListener('touchmove', pause, { passive: true });
    // Keyboard scrolling targets document/window (the scroll div isn't
    // focusable), so the nav-key listener lives on window.
    window.addEventListener('keydown', onKey);
    return () => {
      root.removeEventListener('wheel', pause);
      root.removeEventListener('touchmove', pause);
      window.removeEventListener('keydown', onKey);
    };
  }, [enabled, mode, presentationPlaying, scrollRef, setPresentationPlaying]);
}
