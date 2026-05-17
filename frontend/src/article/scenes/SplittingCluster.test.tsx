import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { SCENES } from '@/_scene-contract';
import SplittingCluster from './SplittingCluster';
import { renderScene } from './__fixtures__/renderScene';
import { splittingClusterParams } from './__fixtures__/splittingCluster';
import { sampleInvestigation } from './__fixtures__/coverHeadline';

describe('SplittingCluster', () => {
  it('fixture validates against the synced scene-contract schema', () => {
    expect(
      SCENES.SplittingCluster?.schema.safeParse(splittingClusterParams).success,
    ).toBe(true);
  });

  it('renders the buyer, supplier and caption', () => {
    renderScene(
      <SplittingCluster
        params={splittingClusterParams}
        investigation={sampleInvestigation}
        chapter="lasConexiones"
      />,
    );
    expect(
      screen.getAllByText(/Ministerio de Comunicaciones/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Proveedor anónimo C/i).length,
    ).toBeGreaterThan(0);
    // The caption renders both visibly and in the sr-only <caption> mirror.
    expect(
      screen.getAllByText(/Cuatro adjudicaciones consecutivas/i).length,
    ).toBeGreaterThan(0);
  });
});
