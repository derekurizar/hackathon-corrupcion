import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Chapter } from '@/_scene-contract';
import type { AudioController } from './audio';

/**
 * Shared article state (active chapter, scroll progress, audio controller)
 * bridged from `ArticleShell` to `BrandRail` + `TransportBar` without
 * prop-drilling across the router `<Outlet/>`.
 *
 * The default state is INERT: routes that never call the setters (Dashboard,
 * Newsroom, Methodology) keep `activeChapter: null`, `progress: 0`,
 * `audioController: null`. In that neutral state the rail hides the chapter
 * spine and the transport hides the progress/ticks + READ/VIEW/LISTEN mode
 * buttons — only once an investigation is selected (`activeChapter !== null`)
 * do those article-scoped controls appear.
 */
type ArticleState = {
  activeChapter: Chapter | null;
  progress: number; // 0 → 1 scroll progress
  audioController: AudioController | null;
  /** The selected investigation's caseKey, or null off the article route.
   * Bridged so `TransportBar` (outside the route `<Outlet/>`) can offer the
   * PDF export. */
  caseKey: string | null;
  /** True while the "VER" presentation engine is auto-advancing. */
  presentationPlaying: boolean;
  setActiveChapter: (ch: Chapter | null) => void;
  setProgress: (p: number) => void;
  setAudioController: (ac: AudioController | null) => void;
  setCaseKey: (k: string | null) => void;
  setPresentationPlaying: (p: boolean) => void;
  /** Smooth-scroll the article to a chapter (no-op off the article route). */
  scrollToChapter: (ch: Chapter) => void;
  /** ArticleShell registers the real scroller; null clears it on unmount. */
  registerScrollToChapter: (fn: ((ch: Chapter) => void) | null) => void;
  /** Play/pause the presentation auto-play (no-op off the article route). */
  togglePresentation: () => void;
  /** ArticleShell registers the real toggle; null clears it on unmount. */
  registerPresentationToggle: (fn: (() => void) | null) => void;
};

const ArticleStateContext = createContext<ArticleState | null>(null);

export function ArticleStateProvider({ children }: { children: ReactNode }) {
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [progress, setProgress] = useState(0);
  const [audioController, setAudioController] =
    useState<AudioController | null>(null);
  const [caseKey, setCaseKey] = useState<string | null>(null);
  const [presentationPlaying, setPresentationPlaying] = useState(false);

  // The scroller lives in ArticleShell (it owns the scroll container ref).
  // Held in a ref so registering it never re-renders rail/transport.
  const scrollHandlerRef = useRef<((ch: Chapter) => void) | null>(null);
  const registerScrollToChapter = useCallback(
    (fn: ((ch: Chapter) => void) | null) => {
      scrollHandlerRef.current = fn;
    },
    [],
  );
  const scrollToChapter = useCallback((ch: Chapter) => {
    scrollHandlerRef.current?.(ch);
  }, []);

  // Same ref-bridge pattern for the presentation play/pause toggle: the engine
  // lives in ArticleShell, the button in the (out-of-Outlet) TransportBar.
  const presentationToggleRef = useRef<(() => void) | null>(null);
  const registerPresentationToggle = useCallback(
    (fn: (() => void) | null) => {
      presentationToggleRef.current = fn;
    },
    [],
  );
  const togglePresentation = useCallback(() => {
    presentationToggleRef.current?.();
  }, []);

  const value = useMemo<ArticleState>(
    () => ({
      activeChapter,
      progress,
      audioController,
      caseKey,
      presentationPlaying,
      setActiveChapter,
      setProgress,
      setAudioController,
      setCaseKey,
      setPresentationPlaying,
      scrollToChapter,
      registerScrollToChapter,
      togglePresentation,
      registerPresentationToggle,
    }),
    [
      activeChapter,
      progress,
      audioController,
      caseKey,
      presentationPlaying,
      scrollToChapter,
      registerScrollToChapter,
      togglePresentation,
      registerPresentationToggle,
    ],
  );

  return (
    <ArticleStateContext.Provider value={value}>
      {children}
    </ArticleStateContext.Provider>
  );
}

// Pinned to this module alongside the provider (mirrors the `useMode`
// pattern); the react-refresh hint is intentional — provider rarely hot-swaps.
// eslint-disable-next-line react-refresh/only-export-components
export function useArticleState(): ArticleState {
  const ctx = useContext(ArticleStateContext);
  if (!ctx) {
    throw new Error(
      'useArticleState must be used within an ArticleStateProvider',
    );
  }
  return ctx;
}
