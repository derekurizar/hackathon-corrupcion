import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { SCENES } from '@/_scene-contract';
import ThresholdLadder from './ThresholdLadder';
import { renderScene } from './__fixtures__/renderScene';
import { thresholdLadderParams } from './__fixtures__/thresholdLadder';
import { sampleInvestigation } from './__fixtures__/coverHeadline';

describe('ThresholdLadder', () => {
  it('fixture validates against the synced scene-contract schema', () => {
    expect(
      SCENES.ThresholdLadder?.schema.safeParse(thresholdLadderParams).success,
    ).toBe(true);
  });

  it('renders the band labels and caption', () => {
    renderScene(
      <ThresholdLadder
        params={thresholdLadderParams}
        investigation={sampleInvestigation}
        chapter="sigueElDinero"
      />,
    );
    expect(screen.getAllByText(/Compra directa/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cotización/i).length).toBeGreaterThan(0);
    // The caption renders both visibly and in the sr-only <caption> mirror.
    expect(
      screen.getAllByText(/Adjudicaciones presionadas contra el techo/i).length,
    ).toBeGreaterThan(0);
  });
});
