/**
 * Pure-DOM audio controller for Podcast mode (idea/05 — 60s ES/EN narration).
 * Factory function (NOT a class); wraps a single `HTMLAudioElement`. No React,
 * no `@aws-sdk`. Tight word-level sync is an explicit non-goal — `onTime`
 * drives best-effort per-chapter cue advancement only.
 *
 * TODO(P4): per-language audio track when API exposes `audio.{es,en}`.
 */
export type AudioController = {
  setTrack: (url: string) => void;
  play: () => Promise<void>;
  pause: () => void;
  seek: (t: number) => void;
  /** Subscribe to `timeupdate` (seconds). Returns a cleanup fn. */
  onTime: (cb: (t: number) => void) => () => void;
  dispose: () => void;
};

export function createAudioController(): AudioController {
  const el = new Audio();
  el.preload = 'metadata';
  let currentUrl: string | null = null;

  const timeListeners = new Set<(t: number) => void>();
  const handleTimeUpdate = (): void => {
    const t = el.currentTime;
    for (const cb of timeListeners) cb(t);
  };
  el.addEventListener('timeupdate', handleTimeUpdate);

  return {
    setTrack(url: string) {
      // Guard: do not reset playback if the same URL is already loaded.
      if (url === currentUrl) return;
      currentUrl = url;
      el.src = url;
      el.load();
    },

    async play() {
      // `play()` rejects if there is no source or autoplay is blocked;
      // swallow so callers (UI buttons) never throw on a missing track.
      try {
        await el.play();
      } catch {
        /* no-op: no track / autoplay policy */
      }
    },

    pause() {
      el.pause();
    },

    seek(t: number) {
      if (Number.isFinite(t) && t >= 0) el.currentTime = t;
    },

    onTime(cb: (t: number) => void) {
      timeListeners.add(cb);
      return () => {
        timeListeners.delete(cb);
      };
    },

    dispose() {
      el.pause();
      el.removeEventListener('timeupdate', handleTimeUpdate);
      timeListeners.clear();
      el.removeAttribute('src');
      el.load();
      currentUrl = null;
    },
  };
}
