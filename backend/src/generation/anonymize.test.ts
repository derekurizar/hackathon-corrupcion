import { describe, it, expect } from 'vitest';
import { anonymizeSupplier } from './anonymize.js';

describe('anonymizeSupplier (idea/00 individual-anonymization rule)', () => {
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

  it('individual → anonymized labels, isIndividual true', () => {
    const a = anonymizeSupplier({
      _id: 'GT-NIT:456',
      name: 'PEREZ,LOPEZ,,JUAN,',
      entityType: 'individual',
    });
    expect(a).toEqual({
      id: 'GT-NIT:456',
      displayNameEs: 'un proveedor individual',
      displayNameEn: 'an individual supplier',
      isIndividual: true,
    });
    expect(a.displayNameEs).not.toContain('PEREZ');
    expect(a.displayNameEn).not.toContain('JUAN');
  });

  it('unknown → treated as individual (privacy-safe)', () => {
    const a = anonymizeSupplier({
      _id: 'GT-NIT:789',
      name: 'AMBIGUOUS NAME',
      entityType: 'unknown',
    });
    expect(a.isIndividual).toBe(true);
    expect(a.displayNameEs).toBe('un proveedor individual');
    expect(a.displayNameEn).toBe('an individual supplier');
  });
});
