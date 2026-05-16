import { describe, it, expect } from 'vitest';
import { canonicalEntityId, caseKey, evidenceHash, deriveEntityType } from './index.js';
import type { Signal } from '../schema/index.js';

describe('canonicalEntityId', () => {
  it('formats scheme:id', () => {
    expect(canonicalEntityId('GT-NIT', '7894880')).toBe('GT-NIT:7894880');
  });
});

describe('caseKey', () => {
  it('matches a fixed sha256 vector and is 64-char hex', () => {
    // sha256('GT-NIT:4132726|F2|2025-08..2026-07') — locks the caseKey contract.
    const expected = caseKey('GT-NIT:4132726', 'F2', '2025-08..2026-07');
    expect(expected).toBe('f14d25fa803d0758d9e81692f8d1d7017ebd8a93dc08ca05506befc8bd107e41');
    expect(expected).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(expected)).toBe(true);
  });
  it('differs when any component changes', () => {
    const base = caseKey('GT-NIT:4132726', 'F2', '2025-08..2026-07');
    expect(caseKey('GT-NIT:4132726', 'F1', '2025-08..2026-07')).not.toBe(base);
    expect(caseKey('GT-NIT:0000000', 'F2', '2025-08..2026-07')).not.toBe(base);
  });
});

describe('evidenceHash', () => {
  const sig1: Pick<Signal, 'rule_id' | 'ocid' | 'evidence'> = {
    rule_id: 'single_bidder',
    ocid: 'ocds-abc-001',
    evidence: [{ field: 'bidCounts.count', value: 1 }],
  };
  const sig2: Pick<Signal, 'rule_id' | 'ocid' | 'evidence'> = {
    rule_id: 'price_spike',
    ocid: 'ocds-abc-002',
    evidence: [{ field: 'awards.value.amount', value: 500000, comparison: '3x median' }],
  };

  it('produces a 64-char hex string', () => {
    const h = evidenceHash([sig1]);
    expect(h).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(h)).toBe(true);
  });

  it('is stable under input signal order shuffle', () => {
    const h1 = evidenceHash([sig1, sig2]);
    const h2 = evidenceHash([sig2, sig1]);
    expect(h1).toBe(h2);
  });

  it('changes when signals change', () => {
    expect(evidenceHash([sig1])).not.toBe(evidenceHash([sig2]));
  });

  it('omits undefined optional fields (comparison/benchmark)', () => {
    const withOptional: typeof sig1 = {
      ...sig1,
      evidence: [{ field: 'f', value: 1, comparison: 'x' }],
    };
    const withoutOptional: typeof sig1 = {
      ...sig1,
      evidence: [{ field: 'f', value: 1 }],
    };
    expect(evidenceHash([withOptional])).not.toBe(evidenceHash([withoutOptional]));
  });

  it('matches a fixed regression vector (locks the algorithm)', () => {
    // If this value changes, the normalization contract changed → all stored
    // evidenceHash values are invalidated (duplicate articles). Update the
    // expected vector ONLY when the change is intentional and cross-area-coordinated.
    expect(evidenceHash([sig1, sig2])).toBe(
      'b23226ba946a95c62a9aeab02ec80befa90f75ff839eff8dd60bc79820ce299d',
    );
  });
});

describe('deriveEntityType', () => {
  it('detects company from legalEntityTypeDetail', () => {
    expect(deriveEntityType({ legalEntityTypeDetail: 'Sociedad Anónima', name: '' })).toBe(
      'company',
    );
  });
  it('detects individual from legalEntityTypeDetail', () => {
    expect(deriveEntityType({ legalEntityTypeDetail: 'Persona Individual', name: '' })).toBe(
      'individual',
    );
  });
  it('detects company from name pattern', () => {
    expect(deriveEntityType({ name: 'CONSTRUCTORA S.A.' })).toBe('company');
  });
  it('detects individual from Guatemalan name pattern', () => {
    expect(deriveEntityType({ name: 'GARCIA,LOPEZ,,JUAN,' })).toBe('individual');
  });
  it('returns unknown when no match', () => {
    expect(deriveEntityType({ name: 'SOMETHING UNCLEAR' })).toBe('unknown');
  });
});
