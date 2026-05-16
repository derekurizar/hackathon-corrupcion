import { describe, it, expect } from 'vitest';
import { rawToCanonical } from './entity-id.js';

describe('rawToCanonical', () => {
  it('GT-NIT-7894880 → GT-NIT:7894880', () => {
    expect(rawToCanonical('GT-NIT-7894880')).toBe('GT-NIT:7894880');
  });

  it('GT-GCUC-409-2 → GT-GCUC:409-2 (identifier id keeps its hyphen)', () => {
    expect(rawToCanonical('GT-GCUC-409-2')).toBe('GT-GCUC:409-2');
  });

  it('GT-CISP-12101609 → GT-CISP:12101609', () => {
    expect(rawToCanonical('GT-CISP-12101609')).toBe('GT-CISP:12101609');
  });

  it('GT-GCID compound id keeps the full CO-... identifier (no naive split)', () => {
    expect(
      rawToCanonical('GT-GCID-CO-0D13D3EE908F02969DED73509B7566AB'),
    ).toBe('GT-GCID:CO-0D13D3EE908F02969DED73509B7566AB');
  });

  it('unknown scheme is returned verbatim', () => {
    expect(rawToCanonical('GT-XXXX-12345')).toBe('GT-XXXX-12345');
  });

  it('already-canonical id (contains ":") is returned verbatim', () => {
    expect(rawToCanonical('GT-NIT:7894880')).toBe('GT-NIT:7894880');
  });

  it('matches ingestion canonical form for the GT-GCID supplier sample', () => {
    // The schema report shows party.id `GT-GCID-CO-...` whose identifier is
    // scheme=GT-GCID, id=`CO-...`; ingestion stores `GT-GCID:CO-...`.
    expect(rawToCanonical('GT-GCID-CO-ABC')).toBe('GT-GCID:CO-ABC');
  });
});
