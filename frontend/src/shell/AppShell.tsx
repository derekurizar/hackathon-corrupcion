import { Outlet } from 'react-router-dom';
import { ModeProvider } from './ModeContext';
import { BrandRail } from './BrandRail';
import { TransportBar } from './TransportBar';
import { GrainOverlay } from '@/ui/GrainOverlay';

/**
 * App frame: CSS-grid rail / main / transport (see .app-shell in tokens.css).
 * Wraps everything in ModeProvider so the transport + future scene engine
 * share navigation-mode state.
 */
export function AppShell() {
  return (
    <ModeProvider>
      <div className="app-shell">
        <div style={{ gridArea: 'rail' }}>
          <BrandRail />
        </div>
        <main
          style={{ gridArea: 'main' }}
          className="overflow-y-auto bg-bg-base text-text-hi"
        >
          <Outlet />
        </main>
        <div style={{ gridArea: 'transport' }}>
          <TransportBar />
        </div>
      </div>
      <GrainOverlay />
    </ModeProvider>
  );
}
