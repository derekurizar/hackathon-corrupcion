import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useScroll, useMotionValueEvent } from 'framer-motion';
import type { Chapter } from '@/_scene-contract';
import { useInvestigation } from '@/api/hooks';
import { useArticleState } from './ArticleStateContext';
import { useMode } from '@/shell/ModeContext';
import { createAudioController } from './audio';
import { usePresentationPlayback } from './usePresentationPlayback';
import { ChapterSlot } from './ChapterSlot';
import { PodcastPlayer } from './PodcastPlayer';
import { resolveMediaUrl } from '@/api/media';
import Loader from '@/ui/Loader';

/** The constant chapter spine (idea/05) — order is fixed. */
const CHAPTERS: Chapter[] = [
  'cover',
  'elCaso',
  'sigueElDinero',
  'lasConexiones',
  'evidencia',
  'cronologia',
  'cierre',
];

function ArticleLoadingState() {
  return <Loader labelKey="article.loading" className="min-h-[60vh]" />;
}

function ArticleErrorState() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[640px] flex-col items-center justify-center px-6 text-center">
      <p className="kicker text-accent-red">{t('article.errorKicker')}</p>
      <h1 className="headline-display mt-3 text-display-lg text-text-hi">
        {t('article.errorTitle')}
      </h1>
      <p className="mt-4 font-body text-body-md text-text-mid">
        {t('article.errorBody')}
      </p>
    </div>
  );
}

/**
 * Cinematic Investigation Article (idea/05). Owns:
 *  - the constant 7-chapter spine,
 *  - scroll progress → TransportBar (framer-motion `useScroll`),
 *  - active-chapter tracking → BrandRail (IntersectionObserver, no layout risk),
 *  - the single audio controller (Podcast mode).
 *
 * Presentation / Podcast full-screen choreography is P4.
 */
export function ArticleShell() {
  const { caseKey } = useParams<{ caseKey: string }>();
  const { data, isLoading, error } = useInvestigation(caseKey ?? '');
  const {
    setActiveChapter,
    setProgress,
    setAudioController,
    setCaseKey,
    audioController,
    registerScrollToChapter,
    setPresentationPlaying,
  } = useArticleState();
  const { mode } = useMode();
  const { i18n } = useTranslation();

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    container: scrollRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setProgress(Math.min(1, Math.max(0, v)));
  });

  // Single audio controller, created once for the article's lifetime.
  useEffect(() => {
    const ac = createAudioController();
    setAudioController(ac);
    return () => {
      ac.dispose();
      setAudioController(null);
    };
  }, [setAudioController]);

  // Bilingual audio: pick the current-language track and absolutize the
  // site-relative `/audio/…` path (so it works in local dev / off-CDN hosts).
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'es';
  const track = data?.audio ? resolveMediaUrl(data.audio[lang]) : undefined;

  // Mirror true play state so a language swap can resume if it was playing.
  const wasPlayingRef = useRef(false);
  useEffect(() => {
    if (!audioController) return;
    return audioController.onPlayState((p) => {
      wasPlayingRef.current = p;
    });
  }, [audioController]);

  // Re-set the track on language toggle (no re-fetch). `setTrack` no-ops on an
  // unchanged URL; a real change reloads, so resume if it was playing.
  useEffect(() => {
    if (!track || !audioController) return;
    const resume = wasPlayingRef.current;
    audioController.setTrack(track);
    if (resume) void audioController.play();
  }, [track, audioController]);

  // Active-chapter tracking via IntersectionObserver (simpler than scroll
  // math, no layout thrash). We watch a thin band in the vertical center of
  // the scroll container (rootMargin shrinks the root to ~10svh): the chapter
  // crossing that line is active. A `threshold: 0.5` would NEVER fire for a
  // chapter taller than 2× the viewport (e.g. `evidencia`'s evidence grid),
  // since its intersectionRatio caps at viewport/sectionHeight — that was the
  // "scene 4 not recognized" bug. The center band is height-independent.
  useEffect(() => {
    if (!data) return;
    const root = scrollRef.current;
    if (!root) return;

    const sections = CHAPTERS.map((ch) =>
      root.querySelector<HTMLElement>(`#${ch}`),
    ).filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the most-visible chapter crossing the center band.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          setActiveChapter(visible.target.id as Chapter);
        }
      },
      { root, rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );

    for (const el of sections) observer.observe(el);
    return () => observer.disconnect();
  }, [data, setActiveChapter]);

  // Bridge rail clicks → smooth scroll. Registered while the article is
  // mounted; cleared on unmount so neutral routes get a no-op.
  useEffect(() => {
    registerScrollToChapter((ch) => {
      const root = scrollRef.current;
      const el = root?.querySelector<HTMLElement>(`#${ch}`);
      if (!el) return;
      setActiveChapter(ch); // optimistic — observer settles it during scroll
      const reduce = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      el.scrollIntoView({
        behavior: reduce ? 'auto' : 'smooth',
        block: 'start',
      });
    });
    return () => registerScrollToChapter(null);
  }, [registerScrollToChapter, setActiveChapter]);

  // Expose the selected caseKey to the shell (TransportBar's PDF export lives
  // outside the route `<Outlet/>`, so it can't read it via `useParams`).
  useEffect(() => {
    setCaseKey(caseKey ?? null);
    return () => setCaseKey(null);
  }, [caseKey, setCaseKey]);

  // Reset rail state on unmount so other routes render the neutral spine.
  useEffect(() => {
    return () => {
      setActiveChapter(null);
      setProgress(0);
      setPresentationPlaying(false);
    };
  }, [setActiveChapter, setProgress, setPresentationPlaying]);

  // "VER" presentation auto-play: smooth-scrolls chapter by chapter, dwelling
  // on each scene long enough to read it. Called unconditionally (rules of
  // hooks) — the engine no-ops until data is loaded. TODO(P4): podcast
  // cue-point auto-advance still pending.
  usePresentationPlayback({
    mode,
    enabled: Boolean(data),
    chapters: CHAPTERS,
    scrollRef,
  });

  if (isLoading) return <ArticleLoadingState />;
  if (error || !data) return <ArticleErrorState />;

  // LISTEN mode swaps the cinematic article for the dedicated audio player.
  if (mode === 'podcast') return <PodcastPlayer data={data} />;

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      <article>
        {CHAPTERS.map((ch, i) => (
          <ChapterSlot
            key={ch}
            chapter={ch}
            index={i}
            planEntry={
              data.scenePlan[ch] as
                | { sceneId: string; params: unknown }
                | undefined
            }
            investigation={data}
          />
        ))}
      </article>
    </div>
  );
}
