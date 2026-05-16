import type { ReactElement } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { LazyMotion, domAnimation } from 'framer-motion';
import i18n from '@/i18n';
import { ModeProvider } from '@/shell/ModeContext';

/**
 * Renders a scene under the providers it expects in the app: i18n, router
 * (CTAs use `<Link>`), `ModeProvider` (ClosingStatement triggers Podcast
 * mode), and a `LazyMotion` feature bundle (scenes use `m`).
 */
export function renderScene(ui: ReactElement): RenderResult {
  // i18next is a shared singleton across test files; pin ES so scene
  // assertions (Spanish copy) are deterministic regardless of run order.
  void i18n.changeLanguage('es');
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <ModeProvider>
          <LazyMotion features={domAnimation} strict>
            {ui}
          </LazyMotion>
        </ModeProvider>
      </MemoryRouter>
    </I18nextProvider>,
  );
}
