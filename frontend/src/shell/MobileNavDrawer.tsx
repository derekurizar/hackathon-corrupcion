import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { BRAND } from '@/brand';
import { useArticleState } from '@/article/ArticleStateContext';
import { SiteNav } from './SiteNav';
import { ChapterSpine } from './ChapterSpine';

const EASE = [0.16, 1, 0.3, 1] as const;

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Mobile-only left slide-in drawer (the desktop `BrandRail` is hidden < md).
 * Surfaces the same site nav + chapter spine as the rail. Closed ⇒ unmounted
 * (AnimatePresence) so the DOM stays clean and nav content is never duplicated.
 */
export function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const { t } = useTranslation();
  const { activeChapter } = useArticleState();
  const articleSelected = activeChapter !== null;
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const { pathname } = useLocation();

  // Close on route change (e.g. browser back/forward). Link/chapter taps
  // already close via the shared `onNavigate`. Skip the initial mount.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    onClose();
    // onClose is a stable setter wrapper; pathname is the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Open side-effects: capture/restore focus, lock body scroll, move focus
  // into the panel, Escape to close, simple Tab focus-trap.
  useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement as HTMLElement | null;
    const { body } = document;
    const prevOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    const focusables = () =>
      panelRef.current
        ? Array.from(
            panelRef.current.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          )
        : [];
    focusables()[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      body.style.overflow = prevOverflow;
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <m.div
          className="fixed inset-0 z-[60] md:hidden"
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <m.div
            aria-hidden="true"
            onClick={onClose}
            className="absolute inset-0 bg-black/70"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
            transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
          />
          <m.div
            ref={panelRef}
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.label')}
            className="absolute inset-y-0 left-0 flex w-[78%] max-w-[320px] flex-col overflow-y-auto border-r border-line bg-bg-panel"
            style={{ padding: '24px 16px' }}
            variants={{
              hidden: { x: reduce ? 0 : '-100%', opacity: reduce ? 0 : 1 },
              visible: { x: 0, opacity: 1 },
            }}
            transition={{ duration: reduce ? 0 : 0.32, ease: EASE }}
          >
            <NavLink
              to="/"
              onClick={onClose}
              className="flex items-stretch gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red focus-visible:ring-offset-2 focus-visible:ring-offset-bg-panel"
            >
              <span
                className="block w-[2px] shrink-0 self-stretch bg-accent-red"
                aria-hidden="true"
              />
              <span
                className="block font-display uppercase text-text-hi"
                style={{
                  fontSize: '13px',
                  letterSpacing: '0.15em',
                  lineHeight: 1.25,
                }}
              >
                {BRAND.name.split(/\s+/).map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </span>
            </NavLink>

            <SiteNav onNavigate={onClose} />

            {articleSelected && <ChapterSpine onNavigate={onClose} />}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
