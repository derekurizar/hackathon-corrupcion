import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { SCENES } from '@/_scene-contract';
import GapSpotlight from './GapSpotlight';
import { renderScene } from './__fixtures__/renderScene';
import { gapSpotlightParams } from './__fixtures__/gapSpotlight';
import { sampleInvestigation } from './__fixtures__/coverHeadline';

describe('GapSpotlight', () => {
  it('fixture validates against the synced scene-contract schema', () => {
    expect(
      SCENES.GapSpotlight?.schema.safeParse(gapSpotlightParams).success,
    ).toBe(true);
  });

  it('renders the events, spotlight label and caption', () => {
    renderScene(
      <GapSpotlight
        params={gapSpotlightParams}
        investigation={sampleInvestigation}
        chapter="cronologia"
      />,
    );
    expect(screen.getAllByText(/Convocatoria/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Ventana de recepción/i).length,
    ).toBeGreaterThan(0);
    // The caption renders both visibly and in the sr-only <caption> mirror.
    expect(
      screen.getAllByText(/Período de recepción de ofertas inusualmente breve/i)
        .length,
    ).toBeGreaterThan(0);
  });
});
