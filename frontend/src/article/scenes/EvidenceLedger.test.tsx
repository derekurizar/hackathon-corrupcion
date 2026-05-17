import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { SCENES } from '@/_scene-contract';
import EvidenceLedger from './EvidenceLedger';
import { renderScene } from './__fixtures__/renderScene';
import { evidenceLedgerParams } from './__fixtures__/evidenceLedger';
import { sampleInvestigation } from './__fixtures__/coverHeadline';

describe('EvidenceLedger', () => {
  it('fixture validates against the synced scene-contract schema', () => {
    expect(SCENES.EvidenceLedger?.schema.safeParse(evidenceLedgerParams).success).toBe(true);
  });

  it('renders every evidence card field, value and comparison', () => {
    renderScene(
      <EvidenceLedger
        params={evidenceLedgerParams}
        investigation={sampleInvestigation}
        chapter="evidencia"
      />,
    );
    expect(screen.getByText(/Cuota del proveedor principal/i)).toBeInTheDocument();
    expect(screen.getByText('82%')).toBeInTheDocument();
    // The component renders `itemCaptions[idx] ?? comparison`; the fixture
    // supplies an explicit caption for row 0, so the editorial caption — not
    // the raw `comparison` — is what reaches the reader.
    expect(screen.getByText(/Concentración alta/i)).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('Fixture narration for evidence ledger.')).toBeInTheDocument();
  });
});
