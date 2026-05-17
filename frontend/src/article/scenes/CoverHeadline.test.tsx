import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { SCENES } from '@/_scene-contract';
import CoverHeadline from './CoverHeadline';
import { renderScene } from './__fixtures__/renderScene';
import { coverHeadlineParams, sampleInvestigation } from './__fixtures__/coverHeadline';

describe('CoverHeadline', () => {
  it('fixture validates against the synced scene-contract schema', () => {
    expect(SCENES.CoverHeadline?.schema.safeParse(coverHeadlineParams).success).toBe(true);
  });

  it('renders the headline, kicker, dek and buyer', () => {
    renderScene(
      <CoverHeadline
        params={coverHeadlineParams}
        investigation={sampleInvestigation}
        chapter="cover"
      />,
    );
    expect(
      screen.getByRole('heading', {
        name: /Ministerio de Salud — señales de revisión/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/COMPRAS PÚBLICAS/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Ministerio de Salud Pública/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Fixture intro paragraph for cover headline.')).toBeInTheDocument();
  });
});
