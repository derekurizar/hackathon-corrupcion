import { useEffect, useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Chapter } from '@/_scene-contract';
import { ModeProvider, useMode } from '@/shell/ModeContext';
import {
  ArticleStateProvider,
  useArticleState,
} from './ArticleStateContext';
import { usePresentationPlayback } from './usePresentationPlayback';

const CHAPTERS: Chapter[] = [
  'cover',
  'elCaso',
  'sigueElDinero',
  'lasConexiones',
  'evidencia',
  'cronologia',
  'cierre',
];

const visited: Chapter[] = [];

/**
 * Stands in for ArticleShell: owns the scroll DOM, registers the real
 * `scrollToChapter` (here a spy that records the visited chapter, mirroring
 * the optimistic `setActiveChapter` the real one does), and runs the engine.
 */
function Harness() {
  const { mode, setMode } = useMode();
  const {
    registerScrollToChapter,
    setActiveChapter,
    startPresentation,
    togglePresentation,
    presentationPlaying,
  } = useArticleState();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Registered BEFORE the engine hook so the scroll handler is live by the
  // time playback's first step runs (same ordering as ArticleShell).
  useEffect(() => {
    registerScrollToChapter((ch) => {
      visited.push(ch);
      setActiveChapter(ch);
    });
    return () => registerScrollToChapter(null);
  }, [registerScrollToChapter, setActiveChapter]);

  usePresentationPlayback({
    mode,
    enabled: true,
    chapters: CHAPTERS,
    scrollRef,
  });

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setMode('presentation');
          startPresentation();
        }}
      >
        VER
      </button>
      <button type="button" onClick={togglePresentation}>
        toggle
      </button>
      <span data-testid="playing">{String(presentationPlaying)}</span>
      <div ref={scrollRef}>
        {CHAPTERS.map((ch) => (
          <section key={ch} id={ch}>
            {ch} scene copy
          </section>
        ))}
      </div>
    </div>
  );
}

function renderHarness() {
  return render(
    <ModeProvider>
      <ArticleStateProvider>
        <Harness />
      </ArticleStateProvider>
    </ModeProvider>,
  );
}

const playing = () => screen.getByTestId('playing').textContent;

describe('usePresentationPlayback — engine', () => {
  beforeEach(() => {
    visited.length = 0;
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto-advances through every chapter then stops at the end', () => {
    renderHarness();
    expect(playing()).toBe('false');

    act(() => {
      fireEvent.click(screen.getByText('VER'));
    });
    // Engine started: first chapter shown immediately, still playing.
    expect(visited).toEqual(['cover']);
    expect(playing()).toBe('true');

    // Walk the whole deck (each dwell is min-clamped at 5s for short copy;
    // 7 chapters fit well under 120s).
    act(() => {
      vi.advanceTimersByTime(120_000);
    });

    expect(visited).toEqual(CHAPTERS);
    expect(playing()).toBe('false'); // idle at the end
  });

  it('pause (toggle) freezes auto-advance; nothing more is visited', () => {
    renderHarness();
    act(() => {
      fireEvent.click(screen.getByText('VER'));
    });
    act(() => {
      vi.advanceTimersByTime(8_000); // past the cover dwell (~6.1s) → elCaso
    });
    expect(visited).toEqual(['cover', 'elCaso']);

    act(() => {
      fireEvent.click(screen.getByText('toggle')); // pause
    });
    expect(playing()).toBe('false');

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(visited).toEqual(['cover', 'elCaso']); // unchanged while paused
  });

  it('re-clicking VER restarts from the cover even mid-presentation', () => {
    renderHarness();
    act(() => {
      fireEvent.click(screen.getByText('VER'));
    });
    act(() => {
      vi.advanceTimersByTime(11_000); // a couple of chapters in
    });
    expect(visited.length).toBeGreaterThan(1);

    visited.length = 0;
    act(() => {
      fireEvent.click(screen.getByText('VER')); // restart
    });
    expect(visited).toEqual(['cover']); // back to the top, fresh run
    expect(playing()).toBe('true');
  });
});
