import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import i18n from '@/i18n';
import { AppShell } from './AppShell';

// Brand is read from the BRAND constant (env-driven). Stub it to prove no
// component hardcodes the wordmark.
vi.mock('@/brand', () => ({
  BRAND: { name: 'Acme Watch', tagline: '' },
}));

function renderShell() {
  return render(
    <MemoryRouter
      initialEntries={['/']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<div>route content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
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

  it('renders the fixed 6-slot chapter spine from i18n keys', () => {
    renderShell();
    expect(screen.getByText(i18n.t('chapter.cover'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('chapter.01'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('chapter.cierre'))).toBeInTheDocument();
  });

  it('toggles language via the transport switch and persists to localStorage', async () => {
    const user = userEvent.setup();
    renderShell();

    // ES default: mode button reads LEER.
    expect(screen.getByRole('button', { name: 'LEER' })).toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: i18n.t('lang.label') }));

    // EN now active: same control reads READ.
    expect(screen.getByRole('button', { name: 'READ' })).toBeInTheDocument();
    expect(localStorage.getItem('ep.lang')).toBe('en');
  });

  it('mode buttons reflect aria-pressed and switch on click', async () => {
    const user = userEvent.setup();
    renderShell();
    const scrollBtn = screen.getByRole('button', { name: 'LEER' });
    const presBtn = screen.getByRole('button', { name: 'VER' });
    expect(scrollBtn).toHaveAttribute('aria-pressed', 'true');
    expect(presBtn).toHaveAttribute('aria-pressed', 'false');

    await user.click(presBtn);
    expect(presBtn).toHaveAttribute('aria-pressed', 'true');
    expect(scrollBtn).toHaveAttribute('aria-pressed', 'false');
  });
});
