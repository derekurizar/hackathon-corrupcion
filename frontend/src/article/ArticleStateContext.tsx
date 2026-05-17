import {
  createContext,
  useContext,
  useMemo,
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
  setActiveChapter: (ch: Chapter | null) => void;
  setProgress: (p: number) => void;
  setAudioController: (ac: AudioController | null) => void;
};

const ArticleStateContext = createContext<ArticleState | null>(null);

export function ArticleStateProvider({ children }: { children: ReactNode }) {
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [progress, setProgress] = useState(0);
  const [audioController, setAudioController] =
    useState<AudioController | null>(null);

  const value = useMemo<ArticleState>(
    () => ({
      activeChapter,
      progress,
      audioController,
      setActiveChapter,
      setProgress,
      setAudioController,
    }),
    [activeChapter, progress, audioController],
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
