import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { SCENES } from '@/_scene-contract';
import RepeatBidders from './RepeatBidders';
import { renderScene } from './__fixtures__/renderScene';
import { repeatBiddersParams } from './__fixtures__/repeatBidders';
import { sampleInvestigation } from './__fixtures__/coverHeadline';

describe('RepeatBidders', () => {
  it('fixture validates against the synced scene-contract schema', () => {
    expect(
      SCENES.RepeatBidders?.schema.safeParse(repeatBiddersParams).success,
    ).toBe(true);
  });

  it('renders the bidder names and caption', () => {
    renderScene(
      <RepeatBidders
        params={repeatBiddersParams}
        investigation={sampleInvestigation}
        chapter="lasConexiones"
      />,
    );
    expect(
      screen.getAllByText(/Oferente anónimo 1/i).length,
    ).toBeGreaterThan(0);
    // The caption renders both visibly and in the sr-only <caption> mirror.
    expect(
      screen.getAllByText(/Un mismo oferente gana la mayoría/i).length,
    ).toBeGreaterThan(0);
  });
});
