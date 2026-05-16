import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import type { ReactElement } from 'react';
import i18n from '@/i18n';
import type { InvestigationListItem } from '@/api/schemas';
import DossierCard from './DossierCard';

function wrap(ui: ReactElement) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        {ui}
      </MemoryRouter>
    </I18nextProvider>,
  );
}

const baseItem: InvestigationListItem = {
  caseKey: 'GT-2024-077',
  buyer: { id: 'GT-NIT:999', name: 'Ministerio de Educación' },
  supplier: {
    displayNameEs: 'Proveedor anónimo Z',
    displayNameEn: 'Anonymous supplier Z',
    isIndividual: false,
    id: 'sup-secret-9',
  },
  signalFamily: 'F3',
  reviewPriority: 'high',
  totalValue: 5_400_000,
  currency: 'GTQ',
  timeWindow: '2024',
  headline: {
    kicker: 'EL CASO',
    headline: 'Patrón de adjudicaciones que vale la pena revisar',
    dek: 'Bajada',
  },
};

describe('DossierCard — privacy + rendering', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('es');
  });

  it('renders the headline as a link to the investigation', () => {
    wrap(<DossierCard item={baseItem} />);
    expect(
      screen.getByRole('heading', {
        name: /Patrón de adjudicaciones/i,
      }),
    ).toBeInTheDocument();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/investigation/GT-2024-077');
  });

  it('never renders supplier.id (internal field) for a company', () => {
    wrap(<DossierCard item={baseItem} />);
    expect(screen.queryByText(/sup-secret-9/)).not.toBeInTheDocument();
    expect(screen.getByText('Proveedor anónimo Z')).toBeInTheDocument();
  });

  it('renders ONLY the localized display name for an individual (ES)', async () => {
    await i18n.changeLanguage('es');
    const individual: InvestigationListItem = {
      ...baseItem,
      supplier: {
        displayNameEs: 'Persona anonimizada',
        displayNameEn: 'Anonymized person',
        isIndividual: true,
        // No `id` for an individual by contract; assert nothing leaks anyway.
      },
    };
    wrap(<DossierCard item={individual} />);
    expect(screen.getByText('Persona anonimizada')).toBeInTheDocument();
    expect(
      screen.queryByText('Anonymized person'),
    ).not.toBeInTheDocument();
  });

  it('renders ONLY the localized display name for an individual (EN)', async () => {
    await i18n.changeLanguage('en');
    const individual: InvestigationListItem = {
      ...baseItem,
      supplier: {
        displayNameEs: 'Persona anonimizada',
        displayNameEn: 'Anonymized person',
        isIndividual: true,
      },
    };
    wrap(<DossierCard item={individual} />);
    expect(screen.getByText('Anonymized person')).toBeInTheDocument();
    expect(
      screen.queryByText('Persona anonimizada'),
    ).not.toBeInTheDocument();
  });
});
