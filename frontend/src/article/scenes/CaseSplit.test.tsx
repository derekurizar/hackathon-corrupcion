import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { SCENES } from '@/_scene-contract';
import CaseSplit from './CaseSplit';
import { renderScene } from './__fixtures__/renderScene';
import { caseSplitParams } from './__fixtures__/caseSplit';
import { sampleInvestigation } from './__fixtures__/coverHeadline';

describe('CaseSplit', () => {
  it('fixture validates against the synced scene-contract schema', () => {
    expect(SCENES.CaseSplit?.schema.safeParse(caseSplitParams).success).toBe(true);
  });

  it('renders the lead, body and framed key-figure label', () => {
    renderScene(
      <CaseSplit
        params={caseSplitParams}
        investigation={sampleInvestigation}
        chapter="elCaso"
      />,
    );
    expect(screen.getByText(/Una sola entidad concentró/i)).toBeInTheDocument();
    expect(screen.getByText(/montos que se mantienen por debajo/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Valor total revisado/i).length).toBeGreaterThan(0);
  });
});
