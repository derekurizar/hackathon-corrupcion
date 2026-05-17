import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@/shell/AppShell';
import Dashboard from '@/views/Dashboard';
import Newsroom from '@/views/Newsroom';
import { ArticleShell } from '@/article/ArticleShell';
import Methodology from '@/views/Methodology';
import Loader from '@/ui/Loader';

// Dev-only previews — code-split so they never ship in prod bundles.
const Tokens = lazy(() => import('@/dev/Tokens'));
const ArticlePreview = lazy(() => import('@/dev/ArticlePreview'));

function RouteFallback() {
  return <Loader className="h-full" />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/newsroom" element={<Newsroom />} />
        <Route path="/investigation/:caseKey" element={<ArticleShell />} />
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
        {import.meta.env.DEV && (
          <Route
            path="/dev/article"
            element={
              <Suspense fallback={<RouteFallback />}>
                <ArticlePreview />
              </Suspense>
            }
          />
        )}
      </Route>
    </Routes>
  );
}
