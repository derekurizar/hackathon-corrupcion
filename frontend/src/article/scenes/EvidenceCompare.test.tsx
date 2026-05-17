import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { SCENES } from '@/_scene-contract';
import EvidenceCompare from './EvidenceCompare';
import { renderScene } from './__fixtures__/renderScene';
import { evidenceCompareParams } from './__fixtures__/evidenceCompare';
import { sampleInvestigation } from './__fixtures__/coverHeadline';

describe('EvidenceCompare', () => {
  it('fixture validates against the synced scene-contract schema', () => {
    expect(
      SCENES.EvidenceCompare?.schema.safeParse(evidenceCompareParams).success,
    ).toBe(true);
  });

  it('renders the humanised field, values and row caption', () => {
    renderScene(
      <EvidenceCompare
        params={evidenceCompareParams}
        investigation={sampleInvestigation}
        chapter="evidencia"
      />,
    );
    // `tender.procurementMethodDetails` → "Método de contratación" via humanField
    expect(
      screen.getAllByText(/Método de contratación/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/Compra Directa/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/El método empleado no es el competitivo esperado/i),
    ).toBeInTheDocument();
  });
});
