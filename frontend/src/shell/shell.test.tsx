import { useEffect } from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '@/i18n';
import { useArticleState } from '@/article/ArticleStateContext';
import { AppShell } from './AppShell';

// Brand is read from the BRAND constant (env-driven). Stub it to prove no
// component hardcodes the wordmark.
vi.mock('@/brand', () => ({
  BRAND: { name: 'Acme Watch', tagline: '' },
}));

/**
 * Stand-in for ArticleShell: sets an active chapter so the rail/transport
 * leave their inert state (mirrors how a selected investigation behaves).
 */
function SelectedArticleRoute() {
  const { setActiveChapter } = useArticleState();
  useEffect(() => {
    setActiveChapter('elCaso');
  }, [setActiveChapter]);
  return <div>article content</div>;
}

function renderShell({ articleSelected = false }: { articleSelected?: boolean } = {}) {
  // Mirror the real app composition (main.tsx wraps everything in a
  // QueryClientProvider) — the shell now reads cached investigation data for
  // the PDF export.
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter
        initialEntries={['/']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route element={<AppShell />}>
            <Route
              path="/"
              element={
                articleSelected ? <SelectedArticleRoute /> : <div>route content</div>
              }
            />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AppShell — brand + locale', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('es');
  });

  it('renders the wordmark from the swapped BRAND constant (no hardcoded brand)', () => {
    renderShell();
    const rail = screen.getByRole('navigation', { name: i18n.t('chapter.rail') });
    expect(within(rail).getByText('Acme')).toBeInTheDocument();
    expect(within(rail).getByText('Watch')).toBeInTheDocument();
  });

  it('renders the fixed chapter spine from i18n keys once an article is selected', () => {
    renderShell({ articleSelected: true });
    expect(screen.getByText(i18n.t('chapter.cover'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('chapter.01'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('chapter.cierre'))).toBeInTheDocument();
  });

  it('hides the spine + mode buttons when no article is selected, keeping sound + language', () => {
    renderShell();

    // Article-scoped controls are gone.
    expect(screen.queryByText(i18n.t('chapter.cover'))).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: i18n.t('mode.scroll') }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('progressbar', { name: i18n.t('transport.progress') }),
    ).not.toBeInTheDocument();

    // Always-on controls remain.
    expect(
      screen.getByRole('switch', { name: i18n.t('lang.label') }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: i18n.t('audio.ambientOn') }),
    ).toBeInTheDocument();
  });

  it('toggles language via the transport switch and persists to localStorage', async () => {
    const user = userEvent.setup();
    renderShell({ articleSelected: true });

    // ES default: mode button reads LEER.
    expect(screen.getByRole('button', { name: 'LEER' })).toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: i18n.t('lang.label') }));

    // EN now active: same control reads READ.
    expect(screen.getByRole('button', { name: 'READ' })).toBeInTheDocument();
    expect(localStorage.getItem('ep.lang')).toBe('en');
  });

  it('mode buttons reflect aria-pressed and switch on click', async () => {
    const user = userEvent.setup();
    renderShell({ articleSelected: true });
    const scrollBtn = screen.getByRole('button', { name: 'LEER' });
    const presBtn = screen.getByRole('button', { name: 'VER' });
    expect(scrollBtn).toHaveAttribute('aria-pressed', 'true');
    expect(presBtn).toHaveAttribute('aria-pressed', 'false');

    await user.click(presBtn);
    expect(presBtn).toHaveAttribute('aria-pressed', 'true');
    expect(scrollBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('reveals the presentation play/pause control only in VER mode', async () => {
    const user = userEvent.setup();
    renderShell({ articleSelected: true });

    // Scroll mode by default — no presentation transport.
    expect(
      screen.queryByRole('button', { name: i18n.t('presentation.play') }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'VER' }));

    // VER selected → play/pause control appears (idle, so it reads "play").
    expect(
      screen.getByRole('button', { name: i18n.t('presentation.play') }),
    ).toBeInTheDocument();
  });
});
