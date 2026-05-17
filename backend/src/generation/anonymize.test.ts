import { describe, it, expect } from 'vitest';
import { anonymizeSupplier } from './anonymize.js';

describe('anonymizeSupplier (HACKATHON MODE — masking disabled)', () => {
  it('company → verbatim name, not individual', () => {
    const a = anonymizeSupplier({
      _id: 'GT-NIT:123',
      name: 'CONSTRUCTORA EJEMPLO S.A.',
      entityType: 'company',
    });
    expect(a).toEqual({
      id: 'GT-NIT:123',
      displayNameEs: 'CONSTRUCTORA EJEMPLO S.A.',
      displayNameEn: 'CONSTRUCTORA EJEMPLO S.A.',
      isIndividual: false,
    });
  });

  it('individual → verbatim name, isIndividual still true (no masking)', () => {
    const a = anonymizeSupplier({
      _id: 'GT-NIT:456',
      name: 'PEREZ,LOPEZ,,JUAN,',
      entityType: 'individual',
    });
    expect(a).toEqual({
      id: 'GT-NIT:456',
      displayNameEs: 'PEREZ,LOPEZ,,JUAN,',
      displayNameEn: 'PEREZ,LOPEZ,,JUAN,',
      isIndividual: true,
    });
  });

  it('unknown → verbatim name, isIndividual false (only individual is true)', () => {
    const a = anonymizeSupplier({
      _id: 'GT-NIT:789',
      name: 'AMBIGUOUS NAME',
      entityType: 'unknown',
    });
    expect(a).toEqual({
      id: 'GT-NIT:789',
      displayNameEs: 'AMBIGUOUS NAME',
      displayNameEn: 'AMBIGUOUS NAME',
      isIndividual: false,
    });
  });
});
