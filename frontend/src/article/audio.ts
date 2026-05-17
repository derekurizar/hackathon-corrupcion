/**
 * Pure-DOM audio controller for Podcast mode (idea/05 — 60s ES/EN narration).
 * Factory function (NOT a class); wraps a single `HTMLAudioElement`. No React,
 * no `@aws-sdk`. Tight word-level sync is an explicit non-goal — `onTime`
 * drives best-effort per-chapter cue advancement only.
 *
 * The API now exposes `audio.{es,en}`; callers pick the language track and
 * call `setTrack`. `onDuration`/`onPlayState` let the LISTEN player and the
 * TransportBar reflect true element state without each owning an `<audio>`.
 */
export type AudioController = {
  setTrack: (url: string) => void;
  play: () => Promise<void>;
  pause: () => void;
  seek: (t: number) => void;
  /** Subscribe to `timeupdate` (seconds). Returns a cleanup fn. */
  onTime: (cb: (t: number) => void) => () => void;
  /** Subscribe to track duration (seconds; may emit `NaN`/`0` before load). */
  onDuration: (cb: (d: number) => void) => () => void;
  /** Subscribe to play/pause/ended → boolean `playing`. */
  onPlayState: (cb: (playing: boolean) => void) => () => void;
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

  const durationListeners = new Set<(d: number) => void>();
  const emitDuration = (): void => {
    const d = el.duration;
    for (const cb of durationListeners) cb(d);
  };
  el.addEventListener('loadedmetadata', emitDuration);
  el.addEventListener('durationchange', emitDuration);

  const playStateListeners = new Set<(playing: boolean) => void>();
  const emitPlayState = (playing: boolean) => (): void => {
    for (const cb of playStateListeners) cb(playing);
  };
  const handlePlay = emitPlayState(true);
  const handlePause = emitPlayState(false);
  el.addEventListener('play', handlePlay);
  el.addEventListener('pause', handlePause);
  el.addEventListener('ended', handlePause);

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

    onDuration(cb: (d: number) => void) {
      durationListeners.add(cb);
      // Emit immediately if metadata is already loaded (late subscribers).
      if (Number.isFinite(el.duration) && el.duration > 0) cb(el.duration);
      return () => {
        durationListeners.delete(cb);
      };
    },

    onPlayState(cb: (playing: boolean) => void) {
      playStateListeners.add(cb);
      cb(!el.paused);
      return () => {
        playStateListeners.delete(cb);
      };
    },

    dispose() {
      el.pause();
      el.removeEventListener('timeupdate', handleTimeUpdate);
      el.removeEventListener('loadedmetadata', emitDuration);
      el.removeEventListener('durationchange', emitDuration);
      el.removeEventListener('play', handlePlay);
      el.removeEventListener('pause', handlePause);
      el.removeEventListener('ended', handlePause);
      timeListeners.clear();
      durationListeners.clear();
      playStateListeners.clear();
      el.removeAttribute('src');
      el.load();
      currentUrl = null;
    },
  };
}
