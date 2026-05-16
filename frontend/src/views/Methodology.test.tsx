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
import Methodology from './Methodology';

const mockedUseStats = vi.mocked(useStats);

const statsFixture: Partial<StatsDTO> = {
  counters: {
    records: 1,
    valueAnalyzed: 1,
    entities: 1,
    monthsCovered: 12,
    investigations: 1,
  },
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

describe('Methodology', () => {
  beforeEach(() => {
    // Force reduced motion so `useCountUp` jumps straight to its final value
    // (deterministic in jsdom — RAF-driven count-up never settles otherwise).
    // This also exercises the real reduced-motion branch.
    window.matchMedia = (query: string) =>
      ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList;

    mockedUseStats.mockReturnValue({
      data: statsFixture,
      isLoading: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it('renders the scope stat (monthsCovered) and the mandatory caveat (ES)', async () => {
    await i18n.changeLanguage('es');
    wrap(<Methodology />);
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText(i18n.t('methodology.caveat'))).toBeInTheDocument();
  });

  it('renders in English without crashing', async () => {
    await i18n.changeLanguage('en');
    wrap(<Methodology />);
    expect(screen.getByText(i18n.t('methodology.caveat'))).toBeInTheDocument();
    expect(
      screen.getByText(i18n.t('methodology.headline')),
    ).toBeInTheDocument();
    await i18n.changeLanguage('es');
  });
});
