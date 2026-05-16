import { describe, it, expect } from 'vitest';
import { extractEntities } from './entities.js';
import { deriveEntityType } from '../identity/index.js';
import {
  compiledReleaseFixture,
  noPartiesRecordFixture,
} from './__fixtures__/compiled-release.js';
import type { GuatecomprasRecord } from '../ocds/index.js';

describe('deriveEntityType — data-expert fix for bare "INDIVIDUAL"', () => {
  it('classifies SOCIEDAD ANÓNIMA as company', () => {
    expect(
      deriveEntityType({ legalEntityTypeDetail: 'SOCIEDAD ANÓNIMA', name: 'X' }),
    ).toBe('company');
  });

  it('classifies the bare word "INDIVIDUAL" as individual (regression)', () => {
    // Before the fix this fell through to "unknown" — see identity/index.ts.
    expect(deriveEntityType({ legalEntityTypeDetail: 'INDIVIDUAL' })).toBe(
      'individual',
    );
    expect(deriveEntityType({ legalEntityTypeDetail: 'individual' })).toBe(
      'individual',
    );
  });

  it('classifies individual via the Guatemalan single-token name pattern', () => {
    // Area 03 pattern: /^[A-ZÁÉÍÓÚÑÜ]+,[A-ZÁÉÍÓÚÑÜ]+,,/ — surnames are single
    // tokens (no spaces). Confirms the heuristic path still works post-fix.
    expect(deriveEntityType({ name: 'CUXULIC,CHUJ,,ANDRES,' })).toBe(
      'individual',
    );
  });

  it('returns unknown for a spaced-surname natural name with no detail', () => {
    // `DE LEON,...` has a space in the first token so it does NOT match the
    // Area 03 name regex → unknown (treated as individual downstream). The
    // bare-"INDIVIDUAL" legalEntityTypeDetail path is the reliable signal and
    // is covered above. Area 03 regex is out of Area 04 scope to change.
    expect(deriveEntityType({ name: 'DE LEON,MALDONADO,,CESAR,AUGUSTO' })).toBe(
      'unknown',
    );
  });

  it('returns unknown when nothing matches', () => {
    expect(deriveEntityType({ name: 'ALGO INDETERMINADO' })).toBe('unknown');
  });
});

describe('extractEntities', () => {
  const entities = extractEntities(compiledReleaseFixture);

  it('emits a buyer entity with canonical _id and verbatim name', () => {
    const buyer = entities.find((e) => e.kind === 'buyer');
    expect(buyer?._id).toBe('GT-NIT:4132726');
    expect(buyer?.name).toBe('MUNICIPALIDAD DE SAN PEDRO CARCHA, ALTA VERAPAZ');
    expect(buyer?.entityType).toBe('unknown'); // gov't body, no detail/pattern
  });

  it('emits a supplier company with raw legalEntityTypeDetail stored', () => {
    const supplier = entities.find((e) => e.kind === 'supplier');
    expect(supplier?._id).toBe('GT-NIT:7894880');
    expect(supplier?.entityType).toBe('company');
    expect(supplier?.legalEntityTypeDetail).toBe('SOCIEDAD ANÓNIMA');
    expect(supplier?.name).toBe('CONSTRUCTORA EJEMPLO, S.A.');
  });

  it('ignores parties that are only tenderers (not buyer/supplier)', () => {
    // GT-NIT-15856801 is only a `tenderer` in the fixture → no entity doc.
    expect(entities.some((e) => e._id === 'GT-NIT:15856801')).toBe(false);
  });

  it('emits TWO docs for a party that is both buyer and supplier', () => {
    const dual: GuatecomprasRecord = {
      ...compiledReleaseFixture,
      compiledRelease: {
        ...compiledReleaseFixture.compiledRelease,
        parties: [
          {
            identifier: { scheme: 'GT-NIT', id: '99999' },
            roles: ['buyer', 'supplier'],
            details: { legalEntityTypeDetail: { id: '2', description: 'COOPERATIVA' } },
            id: 'GT-NIT-99999',
            name: 'COOPERATIVA DOBLE ROL',
          },
        ],
      },
    };
    const out = extractEntities(dual);
    expect(out).toHaveLength(2);
    expect(out.map((e) => e.kind).sort()).toEqual(['buyer', 'supplier']);
    expect(out.every((e) => e._id === 'GT-NIT:99999')).toBe(true);
    expect(out.every((e) => e.entityType === 'company')).toBe(true);
  });

  it('returns [] when compiledRelease.parties is absent (no fabricated ids)', () => {
    expect(extractEntities(noPartiesRecordFixture)).toEqual([]);
  });

  it('omits legalEntityTypeDetail key entirely when party has no detail', () => {
    const noDetail: GuatecomprasRecord = {
      ...compiledReleaseFixture,
      compiledRelease: {
        ...compiledReleaseFixture.compiledRelease,
        parties: [
          {
            identifier: { scheme: 'GT-NIT', id: '12345' },
            roles: ['supplier'],
            id: 'GT-NIT-12345',
            name: 'GARCIA,LOPEZ,,JUAN,',
          },
        ],
      },
    };
    const [e] = extractEntities(noDetail);
    expect(e).toBeDefined();
    expect('legalEntityTypeDetail' in e!).toBe(false);
    expect(e!.entityType).toBe('individual'); // name-pattern heuristic
  });
});
