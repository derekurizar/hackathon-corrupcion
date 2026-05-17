import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { LazyMotion, domAnimation } from 'framer-motion';
import type { ReactElement } from 'react';
import i18n from '@/i18n';
import type { StatsDTO } from '@/api/schemas';

vi.mock('@/api/hooks', () => ({
  useStats: vi.fn(),
}));

import { useStats } from '@/api/hooks';
import Dashboard from './Dashboard';

const mockedUseStats = vi.mocked(useStats);

const statsFixture: StatsDTO = {
  computedAt: '2026-05-16T00:00:00Z',
  counters: {
    records: 124_500,
    valueAnalyzed: 8_900_000_000,
    entities: 1_240,
    monthsCovered: 18,
    investigations: 42,
  },
  methodBreakdown: { 'Compra directa': 61.4, 'Licitación pública': 24.2, Otro: 14.4 },
  byFamily: { F1: 12, F2: 8, F3: 5, F4: 3 },
  priorityDist: { high: 14, medium: 19, low: 9 },
  trend: [
    { month: '2025-01', flagged: 3, value: 1_000_000 },
    { month: '2025-02', flagged: 7, value: 2_500_000 },
  ],
  topBuyersByFlaggedValue: [
    { id: 'GT-NIT:2342855', name: 'Ministerio de Salud', value: 1_592_430.37 },
  ],
};

function wrap(ui: ReactElement) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <LazyMotion features={domAnimation} strict>
          {ui}
        </LazyMotion>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe('Dashboard', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('es');
  });

  it('renders counter labels, hero kicker, and section headings', () => {
    mockedUseStats.mockReturnValue({
      data: statsFixture,
      isLoading: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    wrap(<Dashboard />);

    expect(screen.getByText(i18n.t('dashboard.kicker'))).toBeInTheDocument();
    expect(
      screen.getByText(i18n.t('dashboard.stat.valueAnalyzed')),
    ).toBeInTheDocument();
    expect(
      screen.getByText(i18n.t('dashboard.section.methods')),
    ).toBeInTheDocument();
    expect(
      screen.getByText(i18n.t('dashboard.section.signals')),
    ).toBeInTheDocument();
    expect(
      screen.getByText(i18n.t('dashboard.section.top')),
    ).toBeInTheDocument();
  });

  it('shows the empty state when there is no data', () => {
    mockedUseStats.mockReturnValue({
      data: undefined,
      isLoading: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    wrap(<Dashboard />);
    expect(screen.getByText(i18n.t('dashboard.empty'))).toBeInTheDocument();
  });
});
