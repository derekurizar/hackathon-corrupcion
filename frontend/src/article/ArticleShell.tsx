import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useScroll, useMotionValueEvent } from 'framer-motion';
import type { Chapter } from '@/_scene-contract';
import { useInvestigation } from '@/api/hooks';
import { useArticleState } from './ArticleStateContext';
import { useMode } from '@/shell/ModeContext';
import { createAudioController } from './audio';
import { ChapterSlot } from './ChapterSlot';

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
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="kicker animate-pulse">{t('article.loading')}</p>
    </div>
  );
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
  const { setActiveChapter, setProgress, setAudioController, audioController } =
    useArticleState();
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

  // CRITICAL: `data.audio` is a single `string | undefined` (NOT per-lang).
  // P3 ships one track. TODO(P4): per-language audio track when API exposes
  // `audio.{es,en}` — re-set on `i18n.language` change.
  useEffect(() => {
    if (data?.audio && audioController) {
      audioController.setTrack(data.audio);
    }
  }, [data?.audio, audioController, i18n.language]);

  // Active-chapter tracking via IntersectionObserver (simpler than scroll
  // math, no layout thrash). A chapter is "active" when ≥50% in view.
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
        // Pick the most-visible intersecting chapter.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          setActiveChapter(visible.target.id as Chapter);
        }
      },
      { root, threshold: [0.5] },
    );

    for (const el of sections) observer.observe(el);
    return () => observer.disconnect();
  }, [data, setActiveChapter]);

  // Reset rail state on unmount so other routes render the neutral spine.
  useEffect(() => {
    return () => {
      setActiveChapter(null);
      setProgress(0);
    };
  }, [setActiveChapter, setProgress]);

  if (isLoading) return <ArticleLoadingState />;
  if (error || !data) return <ArticleErrorState />;

  // TODO(P4): full-screen Presentation (mask-wipe / fade-through-black
  // cross-chapter transitions, ◀ ▶ / Space / Home / End) + Podcast cue-point
  // auto-advance. P3 renders the scroll experience for all modes.
  void mode;

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
