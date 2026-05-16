import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import type { ReactElement } from 'react';
import i18n from '@/i18n';

// Mock the data hooks before importing the component under test.
vi.mock('@/api/hooks', () => ({
  useFilters: vi.fn(),
  useInvestigations: vi.fn(),
}));

import { useFilters } from '@/api/hooks';
import FeedFilters from './FeedFilters';
import { useFeedParams } from './useFeedParams';

const mockedUseFilters = vi.mocked(useFilters);

/** Probe that surfaces the live URL search params + parsed feed state. */
function UrlProbe() {
  const [sp] = useSearchParams();
  const { filters } = useFeedParams();
  return (
    <div>
      <span data-testid="raw">{sp.toString()}</span>
      <span data-testid="priority">{filters.priority ?? 'none'}</span>
      <span data-testid="page">{String(filters.page)}</span>
    </div>
  );
}

function wrap(ui: ReactElement, entries = ['/newsroom']) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter
        initialEntries={entries}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        {ui}
        <UrlProbe />
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe('FeedFilters — URL is the single source of truth', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('es');
    mockedUseFilters.mockReturnValue({
      isLoading: false,
      data: {
        families: ['F1', 'F2', 'F3', 'F4'],
        priorities: ['high', 'medium', 'low'],
        buyers: [{ id: 'b1', name: 'Ministerio de Salud' }],
        valueBounds: { min: 0, max: 9_000_000 },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it('writes the selected family to the URL search params', async () => {
    const user = userEvent.setup();
    wrap(<FeedFilters />);
    await user.selectOptions(
      screen.getByLabelText(i18n.t('newsroom.filters.family')),
      'F1',
    );
    expect(screen.getByTestId('raw').textContent).toContain('family=F1');
  });

  it('restores priority + page from the mounting URL', () => {
    wrap(<FeedFilters />, ['/newsroom?priority=high&page=2']);
    expect(screen.getByTestId('priority').textContent).toBe('high');
    expect(screen.getByTestId('page').textContent).toBe('2');
  });

  it('falls back to default for an invalid param (never throws)', () => {
    wrap(<FeedFilters />, ['/newsroom?priority=invalid']);
    expect(screen.getByTestId('priority').textContent).toBe('none');
  });

  it('resets page to 1 when a filter changes', async () => {
    const user = userEvent.setup();
    wrap(<FeedFilters />, ['/newsroom?page=3']);
    expect(screen.getByTestId('page').textContent).toBe('3');
    await user.selectOptions(
      screen.getByLabelText(i18n.t('newsroom.filters.priority')),
      'high',
    );
    expect(screen.getByTestId('page').textContent).toBe('1');
    expect(screen.getByTestId('raw').textContent).not.toContain('page=');
  });
});
