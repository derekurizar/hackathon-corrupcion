import { useCallback, useEffect, useRef, useState } from 'react';
import sealedRecordsUrl from '@/assets/audio/sealed_records.mp3';

const STORAGE_KEY = 'ep:ambient-audio';
/** Low, non-intrusive bed volume — this sits under the whole site. */
const AMBIENT_VOLUME = 0.3;

/**
 * play() returns void in jsdom; normalize to a Promise. Resolves true if
 * playback started, false if it was blocked/failed (e.g. autoplay policy).
 */
function safePlay(el: HTMLAudioElement): Promise<boolean> {
  return Promise.resolve(el.play())
    .then(() => true)
    .catch(() => false);
}

/** pause() is unimplemented in jsdom and throws — swallow for tests/SSR. */
function safePause(el: HTMLAudioElement): void {
  try {
    el.pause();
  } catch {
    /* no-op */
  }
}

function readPreference(): boolean {
  try {
    // Default: on. Only an explicit "off" disables it.
    return window.localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

/**
 * Single looping ambient track for the whole page. Lives in TransportBar,
 * which mounts once in AppShell and survives route changes, so one <audio>
 * instance persists across navigation.
 *
 * Browsers block autoplay-with-sound until a user gesture: we attempt play
 * on mount and, if rejected, retry on the first interaction anywhere.
 */
export function useAmbientAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [enabled, setEnabled] = useState(readPreference);

  // Create the element once.
  if (audioRef.current === null && typeof Audio !== 'undefined') {
    const el = new Audio(sealedRecordsUrl);
    el.loop = true;
    el.volume = AMBIENT_VOLUME;
    el.preload = 'auto';
    audioRef.current = el;
  }

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    if (!enabled) {
      safePause(el);
      return;
    }

    let cancelled = false;
    const unlock = () => {
      void safePlay(el);
      detach();
    };
    const detach = () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };

    void safePlay(el).then((ok) => {
      // Autoplay blocked — arm a one-shot retry on the next user gesture.
      if (ok || cancelled) return;
      document.addEventListener('pointerdown', unlock, { once: true });
      document.addEventListener('keydown', unlock, { once: true });
    });

    return () => {
      cancelled = true;
      detach();
    };
  }, [enabled]);

  // Stop playback if the component ever unmounts (defensive).
  useEffect(() => {
    return () => {
      const el = audioRef.current;
      if (el) safePause(el);
    };
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off');
      } catch {
        /* ignore persistence failure */
      }
      return next;
    });
  }, []);

  return { enabled, toggle };
}
