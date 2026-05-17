import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { SCENES } from '@/_scene-contract';
import AwardTimeline from './AwardTimeline';
import { renderScene } from './__fixtures__/renderScene';
import { awardTimelineParams } from './__fixtures__/awardTimeline';
import { sampleInvestigation } from './__fixtures__/coverHeadline';

describe('AwardTimeline', () => {
  it('fixture validates against the synced scene-contract schema', () => {
    expect(SCENES.AwardTimeline?.schema.safeParse(awardTimelineParams).success).toBe(true);
  });

  it('renders events, the i18n kind label, and the hardcoded SIN DATO PÚBLICO', () => {
    renderScene(
      <AwardTimeline
        params={awardTimelineParams}
        investigation={sampleInvestigation}
        chapter="cronologia"
      />,
    );
    // "Adjudicación" label appears twice (desktop + mobile spines).
    expect(screen.getAllByText('Adjudicación').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ADJUDICADO').length).toBeGreaterThan(0);
    expect(screen.getByText('SIN DATO PÚBLICO')).toBeInTheDocument();
    expect(screen.getByText('Fixture narration for award timeline.')).toBeInTheDocument();
  });
});
