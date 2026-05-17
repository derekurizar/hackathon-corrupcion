import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { SCENES } from '@/_scene-contract';
import PriceBars from './PriceBars';
import { renderScene } from './__fixtures__/renderScene';
import { priceBarsParams } from './__fixtures__/priceBars';
import { sampleInvestigation } from './__fixtures__/coverHeadline';

describe('PriceBars', () => {
  it('fixture validates against the synced scene-contract schema', () => {
    expect(SCENES.PriceBars?.schema.safeParse(priceBarsParams).success).toBe(true);
  });

  it('renders the category, bar labels and caption', () => {
    renderScene(
      <PriceBars
        params={priceBarsParams}
        investigation={sampleInvestigation}
        chapter="sigueElDinero"
      />,
    );
    expect(screen.getByText(/Insumos médicos/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Contrato 2023-A/i).length).toBeGreaterThan(0);
    // The caption renders both visibly and in the sr-only <caption> mirror.
    expect(
      screen.getAllByText(/Precios revisados frente a la referencia/i).length,
    ).toBeGreaterThan(0);
  });
});
