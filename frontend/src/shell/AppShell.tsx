import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { LazyMotion, domAnimation } from 'framer-motion';
import { ModeProvider } from './ModeContext';
import {
  ArticleStateProvider,
  useArticleState,
} from '@/article/ArticleStateContext';
import { usePdfExport } from '@/article/pdf/usePdfExport';
import { CaptureStage } from '@/article/pdf/CaptureStage';
import { ExportOverlay } from '@/article/pdf/ExportOverlay';
import { BrandRail } from './BrandRail';
import { MobileTopBar } from './MobileTopBar';
import { MobileNavDrawer } from './MobileNavDrawer';
import { TransportBar } from './TransportBar';
import { GrainOverlay } from '@/ui/GrainOverlay';

/**
 * Shell body — lives INSIDE the providers so it can read article state
 * (`caseKey`) and own the PDF-export pipeline (orchestrator hook + the
 * off-flow capture stage + the opaque progress overlay).
 */
function ShellContent() {
  const { caseKey } = useArticleState();
  const pdf = usePdfExport(caseKey);
  const [navOpen, setNavOpen] = useState(false);

  return (
    <>
      <div className="app-shell">
        <div style={{ gridArea: 'header' }} className="md:hidden">
          <MobileTopBar
            open={navOpen}
            onToggle={() => setNavOpen((v) => !v)}
          />
        </div>
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
          <TransportBar
            onExportPdf={pdf.start}
            pdfDisabled={pdf.phase !== 'idle' || !pdf.investigation}
          />
        </div>
      </div>
      <MobileNavDrawer open={navOpen} onClose={() => setNavOpen(false)} />
      <GrainOverlay />
      {pdf.phase === 'running' && pdf.investigation && (
        <CaptureStage
          target={pdf.mountTarget}
          investigation={pdf.investigation}
          onReady={pdf.onStageReady}
        />
      )}
      <ExportOverlay controller={pdf} />
    </>
  );
}

/**
 * App frame: CSS-grid rail / main / transport (see .app-shell in tokens.css).
 * Wraps everything in ModeProvider so the transport + future scene engine
 * share navigation-mode state.
 */
export function AppShell() {
  return (
    <ModeProvider>
      <ArticleStateProvider>
        <LazyMotion features={domAnimation} strict>
          <ShellContent />
        </LazyMotion>
      </ArticleStateProvider>
    </ModeProvider>
  );
}
