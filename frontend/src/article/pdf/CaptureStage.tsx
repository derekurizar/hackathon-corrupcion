import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LazyMotion, domAnimation, MotionConfig } from 'framer-motion';
import type { Chapter } from '@/_scene-contract';
import type { InvestigationFull } from '@/api/schemas';
import { ChapterSlot } from '@/article/ChapterSlot';
import { ExportModeProvider } from './ExportModeContext';
import { BG_BASE } from './constants';
import './pdf.css';

export type CaptureTarget = { chapter: Chapter; index: number };

type CaptureStageProps = {
  target: CaptureTarget | null;
  investigation: InvestigationFull;
  /** Called with the capture element once the chapter is mounted + settled.
   * Must be stable (the orchestrator wraps it in `useCallback`). */
  onReady: (el: HTMLElement) => void;
};

const nextFrame = () =>
  new Promise<void>((r) => requestAnimationFrame(() => r()));
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Stepwise-scroll the stage so every scene's `useInView({once:true})` observer
 * fires. The scenes gate their visible state on it
 * (`animate={inView ? 'show' : 'hidden'}`, where `hidden` is `opacity:0`), so
 * without this a tall chapter would rasterise blank. `once:true` latches the
 * state, so we can scroll back to the top afterwards and the content stays
 * shown. Stepping (vs. one jump) guarantees every element passes through an
 * intersecting frame for IntersectionObserver to sample.
 */
async function triggerInView(root: HTMLElement) {
  const step = Math.max(240, Math.floor(window.innerHeight * 0.6));
  const max = root.scrollHeight;
  for (let y = 0; y <= max; y += step) {
    root.scrollTop = y;
    await nextFrame();
    await nextFrame();
  }
  root.scrollTop = max;
  await nextFrame();
  await delay(140); // let observers fire + React commit the 'show' state
  root.scrollTop = 0;
  await nextFrame();
  await nextFrame();
}

/** React Flow (ConcentrationFan) mounts lazily on inView then runs a one-shot
 * `fitView`; wait until the viewport transform is applied and nodes/edges are
 * painted before capturing. Bounded — never blocks the export indefinitely. */
async function waitForReactFlow(scope: HTMLElement, timeoutMs: number) {
  const startedAt = performance.now();
  while (performance.now() - startedAt < timeoutMs) {
    const vp = scope.querySelector<HTMLElement>('.react-flow__viewport');
    const nodes = scope.querySelectorAll('.react-flow__node');
    const edge = scope.querySelector('.react-flow__edges path');
    if (vp && nodes.length > 0 && edge) {
      const tf = getComputedStyle(vp).transform;
      if (tf && tf !== 'none' && tf !== 'matrix(1, 0, 0, 1, 0, 0)') return;
    }
    await delay(50);
  }
}

/**
 * Off-DOM-flow but in-viewport capture stage. Mounts ONE chapter at a time
 * (via the real `ChapterSlot` → `ScenePicker` → scene path, with the cached
 * investigation data) at the TRUE viewport width — the scenes' display type
 * uses viewport units (`clamp(…, 10vw, …)`, `min-h-svh`), so the capture box
 * must equal the viewport or that type overflows and clips. `ChapterSlot`
 * already caps its inner column at `max-width:1200px`, so this reproduces the
 * on-screen layout exactly. It forces the settled final visual
 * (`MotionConfig reducedMotion="always"` for entrances + `ExportModeProvider`
 * for count-ups), then hands the element back for rasterisation.
 *
 * It is `position:fixed; inset:0` so the scenes' viewport-rooted `useInView`
 * observers fire and React Flow measures a real box — the user never sees it
 * because `ExportOverlay` paints an opaque curtain on top (higher z-index).
 */
export function CaptureStage({
  target,
  investigation,
  onReady,
}: CaptureStageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    if (!target) return;
    let cancelled = false;

    void (async () => {
      const root = rootRef.current;
      const cap = captureRef.current;
      if (!root || !cap) return;

      await nextFrame();
      await nextFrame();
      if (cancelled) return;

      await triggerInView(root);
      if (cancelled) return;

      if (target.chapter === 'lasConexiones') {
        await waitForReactFlow(cap, 2500);
        if (cancelled) return;
      }

      await delay(450); // absorb residual reduced transitions / RF paint
      await nextFrame();
      if (cancelled) return;

      if (captureRef.current) onReadyRef.current(captureRef.current);
    })();

    return () => {
      cancelled = true;
    };
  }, [target]);

  const planEntry = target
    ? (investigation.scenePlan[target.chapter] as
        | { sceneId: string; params: unknown }
        | undefined)
    : undefined;

  return createPortal(
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pdf-capture-root"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9990,
        // Vertical scroll only (the settle pass scrolls through the chapter to
        // fire `useInView`). Horizontal overflow is clipped so a scene that
        // internally overflows (React Flow pane, timeline spine) doesn't widen
        // the capture box and push the centred column off-page — the live
        // article never scrolls sideways either.
        overflowX: 'hidden',
        overflowY: 'auto',
        background: BG_BASE,
      }}
    >
      <div
        ref={captureRef}
        style={{
          // Full viewport width so `vw`/`svh`-based scene type resolves
          // exactly as on screen (a fixed px width clips the cover headline).
          width: '100%',
          overflowX: 'hidden',
          background: BG_BASE,
        }}
      >
        {target && (
          <LazyMotion features={domAnimation}>
            <MotionConfig reducedMotion="always">
              <ExportModeProvider value={true}>
                <ChapterSlot
                  key={target.chapter}
                  chapter={target.chapter}
                  index={target.index}
                  planEntry={planEntry}
                  investigation={investigation}
                />
              </ExportModeProvider>
            </MotionConfig>
          </LazyMotion>
        )}
      </div>
    </div>,
    document.body,
  );
}
