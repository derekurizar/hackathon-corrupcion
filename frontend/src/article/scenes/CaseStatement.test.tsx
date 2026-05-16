import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { SCENES } from '@/_scene-contract';
import CaseStatement from './CaseStatement';
import { renderScene } from './__fixtures__/renderScene';
import { caseStatementParams } from './__fixtures__/caseStatement';
import { sampleInvestigation } from './__fixtures__/coverHeadline';

describe('CaseStatement', () => {
  it('fixture validates against the synced scene-contract schema', () => {
    expect(
      SCENES.CaseStatement?.schema.safeParse(caseStatementParams).success,
    ).toBe(true);
  });

  it('renders the lead, pull-stat label and all facts', () => {
    renderScene(
      <CaseStatement
        params={caseStatementParams}
        investigation={sampleInvestigation}
        chapter="elCaso"
      />,
    );
    expect(screen.getByText(/El Ministerio concentró/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Cuota del proveedor principal/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/14 contratos adjudicados/i),
    ).toBeInTheDocument();
  });
});
