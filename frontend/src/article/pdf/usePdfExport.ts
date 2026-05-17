import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toPng, getFontEmbedCSS } from 'html-to-image';
import type { InvestigationFull } from '@/api/schemas';
import { useInvestigation } from '@/api/hooks';
import { buildPdf, type CapturedPage } from './buildPdf';
import { PDF_CHAPTERS, BG_BASE } from './constants';
import type { CaptureTarget } from './CaptureStage';

export type PdfPhase = 'idle' | 'running' | 'error';

export type PdfExportController = {
  phase: PdfPhase;
  /** 1-based chapter being captured while running (0 otherwise). */
  current: number;
  total: number;
  /** True when a PDF can be generated (data cached, not already running). */
  canExport: boolean;
  start: () => void;
  cancel: () => void;
  retry: () => void;
  dismissError: () => void;
  // Wiring for `AppShell` to render the capture stage:
  investigation: InvestigationFull | undefined;
  mountTarget: CaptureTarget | null;
  onStageReady: (el: HTMLElement) => void;
};

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

class AbortedError extends Error {}

/**
 * Orchestrates the "export investigation as PDF" pipeline. Walks the 7-chapter
 * spine, mounting one chapter at a time into the `CaptureStage`, waiting for it
 * to settle, rasterising it with `html-to-image`, then assembling one page per
 * chapter with jsPDF and downloading it. Reads the already-cached
 * investigation via TanStack Query (no refetch).
 */
export function usePdfExport(caseKey: string | null): PdfExportController {
  const { i18n } = useTranslation();
  const { data } = useInvestigation(caseKey ?? undefined);

  const [phase, setPhase] = useState<PdfPhase>('idle');
  const [current, setCurrent] = useState(0);
  const [mountTarget, setMountTarget] = useState<CaptureTarget | null>(null);

  const phaseRef = useRef<PdfPhase>('idle');
  phaseRef.current = phase;
  const dataRef = useRef(data);
  dataRef.current = data;
  const caseKeyRef = useRef(caseKey);
  caseKeyRef.current = caseKey;

  const abortRef = useRef(false);
  const settleRef = useRef<{
    resolve: (el: HTMLElement) => void;
    reject: (e: unknown) => void;
  } | null>(null);

  const onStageReady = useCallback((el: HTMLElement) => {
    const s = settleRef.current;
    settleRef.current = null;
    s?.resolve(el);
  }, []);

  const mountAndSettle = useCallback(
    (target: CaptureTarget) =>
      new Promise<HTMLElement>((resolve, reject) => {
        settleRef.current = { resolve, reject };
        setMountTarget(target);
      }),
    [],
  );

  const run = useCallback(async () => {
    if (phaseRef.current === 'running') return;
    const inv = dataRef.current;
    const ck = caseKeyRef.current;
    if (!inv || !ck) return;

    abortRef.current = false;
    phaseRef.current = 'running';
    setPhase('running');
    setCurrent(0);

    const throwIfAborted = () => {
      if (abortRef.current) throw new AbortedError();
    };

    try {
      await document.fonts.ready;
      let fontEmbedCSS: string | undefined;
      const pages: CapturedPage[] = [];

      for (let i = 0; i < PDF_CHAPTERS.length; i += 1) {
        throwIfAborted();
        const chapter = PDF_CHAPTERS[i];
        if (!chapter) continue;
        setCurrent(i + 1);
        const el = await mountAndSettle({ chapter, index: i });
        throwIfAborted();

        // Parse/encode @font-face once; reuse for all 7 captures.
        if (fontEmbedCSS === undefined) {
          try {
            fontEmbedCSS = await getFontEmbedCSS(el);
          } catch {
            fontEmbedCSS = ''; // fall back to html-to-image default embedding
          }
        }

        // Capture at an explicit, deterministic box so the image and the PDF
        // page match exactly:
        //  - width  = clientWidth (the fixed stage/viewport width; horizontal
        //    overflow is clipped in the stage). Using `scrollWidth` here was
        //    the off-centring bug — an overflowing scene (timeline / React
        //    Flow) made the page wider than the image, dropping the centred
        //    `margin-inline:auto` column into the left of an empty page.
        //  - height = scrollHeight (full natural chapter — never cropped).
        const pageW = Math.ceil(el.clientWidth);
        const pageH = Math.ceil(el.scrollHeight);
        const opts = {
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: BG_BASE,
          width: pageW,
          height: pageH,
          ...(fontEmbedCSS ? { fontEmbedCSS } : {}),
        };
        let dataUrl: string;
        try {
          dataUrl = await toPng(el, opts);
        } catch {
          await delay(200);
          dataUrl = await toPng(el, opts); // single retry
        }
        throwIfAborted();

        pages.push({ dataUrl, width: pageW, height: pageH });
      }

      setMountTarget(null);
      buildPdf(pages, { caseKey: ck, lang: i18n.resolvedLanguage ?? 'es' });
      phaseRef.current = 'idle';
      setPhase('idle');
      setCurrent(0);
    } catch (err) {
      setMountTarget(null);
      setCurrent(0);
      if (abortRef.current || err instanceof AbortedError) {
        phaseRef.current = 'idle';
        setPhase('idle');
      } else {
        phaseRef.current = 'error';
        setPhase('error');
      }
    }
  }, [i18n, mountAndSettle]);

  const start = useCallback(() => {
    void run();
  }, [run]);

  const cancel = useCallback(() => {
    abortRef.current = true;
    const s = settleRef.current;
    settleRef.current = null;
    s?.reject(new AbortedError());
  }, []);

  const dismissError = useCallback(() => {
    phaseRef.current = 'idle';
    setPhase('idle');
    setCurrent(0);
  }, []);

  const retry = useCallback(() => {
    phaseRef.current = 'idle';
    setPhase('idle');
    void run();
  }, [run]);

  return {
    phase,
    current,
    total: PDF_CHAPTERS.length,
    canExport: phase === 'idle' && Boolean(data) && Boolean(caseKey),
    start,
    cancel,
    retry,
    dismissError,
    investigation: data,
    mountTarget,
    onStageReady,
  };
}
