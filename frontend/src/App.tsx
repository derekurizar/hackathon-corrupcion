import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppShell } from '@/shell/AppShell';
import Dashboard from '@/routes/Dashboard';
import Newsroom from '@/routes/Newsroom';
import Investigation from '@/routes/Investigation';
import Methodology from '@/routes/Methodology';

// Dev-only token preview — code-split so it never ships in prod bundles.
const Tokens = lazy(() => import('@/dev/Tokens'));

function RouteFallback() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full items-center justify-center">
      <p className="kicker">{t('placeholder.loading')}</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/newsroom" element={<Newsroom />} />
        <Route path="/investigation/:caseKey" element={<Investigation />} />
        <Route path="/methodology" element={<Methodology />} />
        {import.meta.env.DEV && (
          <Route
            path="/dev/tokens"
            element={
              <Suspense fallback={<RouteFallback />}>
                <Tokens />
              </Suspense>
            }
          />
        )}
      </Route>
    </Routes>
  );
}
