import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { SCENES } from '@/_scene-contract';
import RegionMap from './RegionMap';
import { renderScene } from './__fixtures__/renderScene';
import { regionMapParams } from './__fixtures__/regionMap';
import { sampleInvestigation } from './__fixtures__/coverHeadline';

describe('RegionMap', () => {
  it('fixture validates against the synced scene-contract schema', () => {
    expect(SCENES.RegionMap?.schema.safeParse(regionMapParams).success).toBe(true);
  });

  it('renders the ranked regions and caption', () => {
    renderScene(
      <RegionMap
        params={regionMapParams}
        investigation={sampleInvestigation}
        chapter="sigueElDinero"
      />,
    );
    expect(screen.getAllByText(/Guatemala/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Quetzaltenango/i).length).toBeGreaterThan(0);
    // The caption renders both visibly and in the sr-only <caption> mirror.
    expect(
      screen.getAllByText(/Distribución geográfica del valor revisado/i).length,
    ).toBeGreaterThan(0);
  });
});
