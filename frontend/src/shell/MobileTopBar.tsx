import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { BRAND } from '@/brand';

type MobileTopBarProps = {
  open: boolean;
  onToggle: () => void;
};

/**
 * Mobile-only slim top bar (the desktop `BrandRail` is hidden < md). Hosts the
 * brand wordmark + a hamburger that toggles the `MobileNavDrawer`. Rendered in
 * the `header` grid area; `md:hidden` keeps it out of the desktop layout.
 */
export function MobileTopBar({ open, onToggle }: MobileTopBarProps) {
  const { t } = useTranslation();
  const wordmark = BRAND.name.split(/\s+/).join(' ');

  return (
    <header className="flex h-full items-center justify-between border-b border-line bg-bg-panel px-4">
      <NavLink
        to="/"
        className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red focus-visible:ring-offset-2 focus-visible:ring-offset-bg-panel"
      >
        <span
          className="block h-4 w-[2px] shrink-0 bg-accent-red"
          aria-hidden="true"
        />
        <span
          className="block truncate font-display uppercase text-text-hi"
          style={{ fontSize: '13px', letterSpacing: '0.15em' }}
        >
          {wordmark}
        </span>
      </NavLink>

      <button
        type="button"
        onClick={onToggle}
        aria-label={open ? t('nav.menuClose') : t('nav.menu')}
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-line bg-bg-panel-2 text-text-hi transition-colors hover:text-accent-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red focus-visible:ring-offset-2 focus-visible:ring-offset-bg-panel"
      >
        {open ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M2 4h12M2 8h12M2 12h12" />
          </svg>
        )}
      </button>
    </header>
  );
}
