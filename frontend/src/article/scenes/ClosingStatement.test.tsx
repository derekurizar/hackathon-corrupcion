import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { SCENES, FIXED_CAVEAT } from '@/_scene-contract';
import ClosingStatement from './ClosingStatement';
import { renderScene } from './__fixtures__/renderScene';
import {
  closingStatementParams,
  closingStatementEmptyCaveat,
} from './__fixtures__/closingStatement';
import { sampleInvestigation } from './__fixtures__/coverHeadline';

describe('ClosingStatement', () => {
  it('fixture validates against the synced scene-contract schema', () => {
    expect(SCENES.ClosingStatement?.schema.safeParse(closingStatementParams).success).toBe(true);
  });

  it('renders whatItMeans, the caveat, and the three fixed CTAs', () => {
    renderScene(
      <ClosingStatement
        params={closingStatementParams}
        investigation={sampleInvestigation}
        chapter="cierre"
      />,
    );
    expect(screen.getByText(/Estos patrones merecen revisión/i)).toBeInTheDocument();
    expect(screen.getByText(/señales de revisión, no conclusiones/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /METODOLOGÍA/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ESCUCHAR/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /COMPARTIR/i })).toBeInTheDocument();
    expect(screen.getByText('Fixture conclusion sentence.')).toBeInTheDocument();
  });

  it('substitutes FIXED_CAVEAT when caveat is empty (never renders empty)', () => {
    renderScene(
      <ClosingStatement
        params={closingStatementEmptyCaveat}
        investigation={sampleInvestigation}
        chapter="cierre"
      />,
    );
    expect(screen.getByText(FIXED_CAVEAT)).toBeInTheDocument();
  });
});
