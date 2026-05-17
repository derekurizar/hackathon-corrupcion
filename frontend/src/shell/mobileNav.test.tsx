import { useEffect } from 'react';
import {
  describe,
  expect,
  it,
  beforeEach,
  vi,
  type Mock,
} from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '@/i18n';
import { useArticleState } from '@/article/ArticleStateContext';
import { AppShell } from './AppShell';

vi.mock('@/brand', () => ({
  BRAND: { name: 'Acme Watch', tagline: '' },
}));

const scrollSpy: Mock<(ch: string) => void> = vi.fn();

/**
 * Stand-in for ArticleShell: marks an investigation as selected and registers
 * a scroll spy so we can assert chapter navigation drives `scrollToChapter`.
 */
function SelectedArticleRoute() {
  const { setActiveChapter, registerScrollToChapter } = useArticleState();
  useEffect(() => {
    setActiveChapter('elCaso');
    registerScrollToChapter((ch) => scrollSpy(ch));
    return () => registerScrollToChapter(null);
  }, [setActiveChapter, registerScrollToChapter]);
  return <div>article content</div>;
}

function renderShell({ articleSelected = false } = {}) {
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
                articleSelected ? (
                  <SelectedArticleRoute />
                ) : (
                  <div>route content</div>
                )
              }
            />
            <Route path="/newsroom" element={<div>newsroom content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Mobile navigation — top bar + drawer', () => {
  beforeEach(async () => {
    scrollSpy.mockClear();
    localStorage.clear();
    // Force reduced motion so the drawer's enter/exit is instant — keeps the
    // AnimatePresence unmount deterministic under jsdom.
    window.matchMedia = ((q: string) =>
      ({
        matches: /prefers-reduced-motion/.test(q),
        media: q,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList) as typeof window.matchMedia;
    await i18n.changeLanguage('es');
  });

  it('toggles the drawer open/closed via the hamburger (aria-expanded + dialog)', async () => {
    const user = userEvent.setup();
    renderShell();

    const trigger = screen.getByRole('button', { name: i18n.t('nav.menu') });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(trigger);

    const dialog = await screen.findByRole('dialog');
    expect(
      screen.getByRole('button', { name: i18n.t('nav.menuClose') }),
    ).toHaveAttribute('aria-expanded', 'true');
    // Site nav is always available inside the drawer.
    expect(
      within(dialog).getByRole('link', { name: i18n.t('nav.newsroom') }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: i18n.t('nav.menuClose') }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('shows the chapter spine in the drawer only once an investigation is selected', async () => {
    const user = userEvent.setup();

    const neutral = renderShell();
    await user.click(screen.getByRole('button', { name: i18n.t('nav.menu') }));
    const neutralDialog = await screen.findByRole('dialog');
    expect(
      within(neutralDialog).queryByText(i18n.t('chapter.cover')),
    ).not.toBeInTheDocument();
    neutral.unmount();

    renderShell({ articleSelected: true });
    await user.click(screen.getByRole('button', { name: i18n.t('nav.menu') }));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(i18n.t('chapter.cover')),
    ).toBeInTheDocument();
  });

  it('a drawer chapter tap calls scrollToChapter and closes the drawer', async () => {
    const user = userEvent.setup();
    renderShell({ articleSelected: true });

    await user.click(screen.getByRole('button', { name: i18n.t('nav.menu') }));
    const dialog = await screen.findByRole('dialog');

    await user.click(
      within(dialog).getByRole('button', { name: /SIGUE EL DINERO/ }),
    );

    expect(scrollSpy).toHaveBeenCalledWith('sigueElDinero');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('closes the drawer on Escape', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('button', { name: i18n.t('nav.menu') }));
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('a site-nav tap navigates and closes the drawer', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('button', { name: i18n.t('nav.menu') }));
    const dialog = await screen.findByRole('dialog');

    await user.click(
      within(dialog).getByRole('link', { name: i18n.t('nav.newsroom') }),
    );

    expect(await screen.findByText('newsroom content')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('transport-bar chapter ticks call scrollToChapter', async () => {
    const user = userEvent.setup();
    renderShell({ articleSelected: true });

    // Tick buttons expose just the chapter label (exact accessible name),
    // distinct from the rail spine buttons ("01 EL CASO").
    await user.click(
      screen.getByRole('button', { name: i18n.t('chapter.evidencia') }),
    );
    expect(scrollSpy).toHaveBeenCalledWith('evidencia');
  });
});
