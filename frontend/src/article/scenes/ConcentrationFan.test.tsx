import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { SCENES } from '@/_scene-contract';
import ConcentrationFan from './ConcentrationFan';
import { renderScene } from './__fixtures__/renderScene';
import { concentrationFanParams } from './__fixtures__/concentrationFan';
import { sampleInvestigation } from './__fixtures__/coverHeadline';

describe('ConcentrationFan', () => {
  it('fixture validates against the synced scene-contract schema', () => {
    expect(
      SCENES.ConcentrationFan?.schema.safeParse(concentrationFanParams)
        .success,
    ).toBe(true);
  });

  it('renders the caption and a screen-reader supplier table', () => {
    renderScene(
      <ConcentrationFan
        params={concentrationFanParams}
        investigation={sampleInvestigation}
        chapter="lasConexiones"
      />,
    );
    expect(
      screen.getAllByText(/Un proveedor concentra/i).length,
    ).toBeGreaterThan(0);
    // Supplier names appear in the React Flow node AND the sr-only table.
    expect(
      screen.getAllByText('Proveedor anónimo A').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('Proveedor anónimo C').length,
    ).toBeGreaterThanOrEqual(1);
  });
});
