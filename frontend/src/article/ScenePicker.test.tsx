import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { LazyMotion, domAnimation } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import i18n from '@/i18n';
import { ArticleStateProvider } from './ArticleStateContext';
import { ScenePicker } from './ScenePicker';
import { sampleInvestigation } from './scenes/__fixtures__/coverHeadline';
import { coverHeadlineParams } from './scenes/__fixtures__/coverHeadline';

function wrap(ui: ReactElement) {
  void i18n.changeLanguage('es');
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <ArticleStateProvider>
            <LazyMotion features={domAnimation} strict>
              {ui}
            </LazyMotion>
          </ArticleStateProvider>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe('ScenePicker', () => {
  it('renders the planned scene when the plan is valid', async () => {
    wrap(
      <ScenePicker
        chapter="cover"
        planEntry={{ sceneId: 'CoverHeadline', params: coverHeadlineParams }}
        investigation={sampleInvestigation}
      />,
    );
    await waitFor(() =>
      expect(
        screen.getByRole('heading', {
          name: /Ministerio de Salud — señales de revisión/i,
        }),
      ).toBeInTheDocument(),
    );
  });

  it('falls back to the default scene on an unknown sceneId (never throws)', async () => {
    wrap(
      <ScenePicker
        chapter="cover"
        planEntry={{ sceneId: 'NotARealScene', params: {} }}
        investigation={sampleInvestigation}
      />,
    );
    // Default = CoverHeadline; derived params use the buyer name as headline.
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: /señales de revisión/i }),
      ).toBeInTheDocument(),
    );
  });

  it('falls back to deriveFromEvidence on a params parse failure (never throws)', async () => {
    wrap(
      <ScenePicker
        chapter="cover"
        planEntry={{
          sceneId: 'CoverHeadline',
          params: { headline: 123 /* wrong shape */ },
        }}
        investigation={sampleInvestigation}
      />,
    );
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: /señales de revisión/i }),
      ).toBeInTheDocument(),
    );
  });
});
