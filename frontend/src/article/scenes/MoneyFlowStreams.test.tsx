import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { SCENES } from '@/_scene-contract';
import MoneyFlowStreams from './MoneyFlowStreams';
import { renderScene } from './__fixtures__/renderScene';
import { moneyFlowStreamsParams } from './__fixtures__/moneyFlowStreams';
import { sampleInvestigation } from './__fixtures__/coverHeadline';

describe('MoneyFlowStreams', () => {
  it('fixture validates against the synced scene-contract schema', () => {
    expect(
      SCENES.MoneyFlowStreams?.schema.safeParse(moneyFlowStreamsParams)
        .success,
    ).toBe(true);
  });

  it('renders the caption and every supplier label', () => {
    renderScene(
      <MoneyFlowStreams
        params={moneyFlowStreamsParams}
        investigation={sampleInvestigation}
        chapter="sigueElDinero"
      />,
    );
    expect(
      screen.getByRole('img', { name: /La mayor parte del valor/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Proveedor anónimo A')).toBeInTheDocument();
    expect(screen.getByText('Proveedor anónimo B')).toBeInTheDocument();
  });
});
