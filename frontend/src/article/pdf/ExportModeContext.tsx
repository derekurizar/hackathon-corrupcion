import { createContext, useContext, type ReactNode } from 'react';

/**
 * "We are rasterising this subtree for the PDF — render the settled final
 * visual now (no count-up animation)." Default `false`, so normal viewing is
 * completely unaffected.
 *
 * This is the deliberate fallback for a verified framer-motion gap: the
 * standalone `useReducedMotion()` hook (used by `useCountUp`) reads ONLY the OS
 * media query and ignores `<MotionConfig reducedMotion="always">`. `MotionConfig`
 * settles the scenes' `m.*` entrance transitions, but count-ups would still
 * animate 0→target. `useCountUp` therefore also consults this flag.
 */
const ExportModeContext = createContext<boolean>(false);

export function ExportModeProvider({
  value,
  children,
}: {
  value: boolean;
  children: ReactNode;
}) {
  return (
    <ExportModeContext.Provider value={value}>
      {children}
    </ExportModeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useExportMode(): boolean {
  return useContext(ExportModeContext);
}
