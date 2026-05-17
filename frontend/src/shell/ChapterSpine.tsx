import { useTranslation } from 'react-i18next';
import { m } from 'framer-motion';
import { useArticleState } from '@/article/ArticleStateContext';
import { cn } from '@/lib/utils';
import { CHAPTER_ORDER, CHAPTER_NUMERAL, CHAPTER_LABEL_KEY } from './chapters';

type ChapterSpineProps = {
  /** Fired after a chapter is tapped — lets the mobile drawer close itself. */
  onNavigate?: () => void;
};

/**
 * The fixed 7-chapter spine. The active chapter is tracked via ArticleState
 * (Area 11): the red pill indicator + numeral/label tier animate on the active
 * item. Shared by the desktop `BrandRail` and the `MobileNavDrawer`.
 *
 * Callers gate rendering on `activeChapter !== null` (an investigation is
 * selected) — this component itself always renders the spine.
 */
export function ChapterSpine({ onNavigate }: ChapterSpineProps) {
  const { t } = useTranslation();
  const { activeChapter, scrollToChapter } = useArticleState();

  return (
    <ol className="mt-10 flex flex-col" role="list">
      {CHAPTER_ORDER.map((ch) => {
        const active = activeChapter === ch;
        return (
          <li key={ch} aria-current={active ? 'step' : undefined}>
            <button
              type="button"
              onClick={() => {
                scrollToChapter(ch);
                onNavigate?.();
              }}
              className="flex w-full cursor-pointer items-center gap-3 text-left transition-colors hover:bg-bg-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red focus-visible:ring-offset-2 focus-visible:ring-offset-bg-panel"
              style={{ padding: '10px 16px 10px 14px' }}
            >
              <m.span
                aria-hidden="true"
                className="w-[2px] self-stretch rounded-full bg-accent-red"
                initial={false}
                animate={
                  active
                    ? { opacity: 1, scaleY: 1 }
                    : { opacity: 0, scaleY: 0.6 }
                }
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: 'center' }}
              />
              <m.span
                className={cn(
                  'font-display',
                  active ? 'text-text-hi' : 'text-text-dim',
                )}
                style={{
                  fontSize: '28px',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
                initial={false}
                animate={{ opacity: active ? 1 : 0.4 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                {CHAPTER_NUMERAL[ch]}
              </m.span>
              <span
                className={cn(
                  'font-body uppercase transition-colors',
                  active ? 'text-text-mid' : 'text-text-dim',
                )}
                style={{ fontSize: '11px', letterSpacing: '0.15em' }}
              >
                {t(CHAPTER_LABEL_KEY[ch])}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
