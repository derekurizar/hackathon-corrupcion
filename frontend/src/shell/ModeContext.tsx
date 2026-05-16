import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/** Navigation modes for the Investigation Article (idea/05 — three modes). */
export type NavMode = 'scroll' | 'presentation' | 'podcast';

type ModeContextValue = {
  mode: NavMode;
  setMode: (mode: NavMode) => void;
};

const ModeContext = createContext<ModeContextValue | null>(null);

/**
 * Scaffold-only mode state (Area 10). Scene mechanics — scroll choreography,
 * presentation transitions, podcast cue sync — land in Area 11.
 */
export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<NavMode>('scroll');
  const value = useMemo(() => ({ mode, setMode }), [mode]);
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

// Plan pins this hook to ModeContext.tsx alongside the provider; the
// react-refresh hint is intentional here (provider rarely hot-swaps).
// eslint-disable-next-line react-refresh/only-export-components
export function useMode(): ModeContextValue {
  const ctx = useContext(ModeContext);
  if (!ctx) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return ctx;
}
