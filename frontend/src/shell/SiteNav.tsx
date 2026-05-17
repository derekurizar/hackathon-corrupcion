import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { tk } from '@/i18n/keys';

const LINKS = [
  { to: '/', key: 'nav.dashboard' },
  { to: '/newsroom', key: 'nav.newsroom' },
  { to: '/methodology', key: 'nav.methodology' },
] as const;

type SiteNavProps = {
  /** Fired after a link is tapped — lets the mobile drawer close itself. */
  onNavigate?: () => void;
};

/**
 * Site navigation (Dashboard / Newsroom / Methodology). Shared by the desktop
 * `BrandRail` and the `MobileNavDrawer` so the route list lives in one place.
 */
export function SiteNav({ onNavigate }: SiteNavProps) {
  const { t } = useTranslation();

  return (
    <nav aria-label={t('nav.label')} className="mt-6 mb-4 px-3">
      {LINKS.map(({ to, key }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            `block py-2 kicker transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-red focus-visible:ring-offset-2 focus-visible:ring-offset-bg-panel ${isActive ? 'text-text-hi' : 'text-text-dim hover:text-text-mid'}`
          }
        >
          {t(tk(key))}
        </NavLink>
      ))}
    </nav>
  );
}
