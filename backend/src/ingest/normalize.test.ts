import { describe, it, expect } from 'vitest';
import { toCuratedRelease } from './normalize.js';
import { CuratedReleaseSchema } from '../schema/index.js';
import { compiledReleaseFixture, noPartiesRecordFixture } from './__fixtures__/compiled-release.js';

describe('toCuratedRelease', () => {
  const ctx = { year: 2026, month: 4 };
  const curated = toCuratedRelease(compiledReleaseFixture, ctx);

  it('produces a CuratedReleaseSchema-valid document', () => {
    expect(() => CuratedReleaseSchema.parse(curated)).not.toThrow();
  });

  it('drops the heavy blobs — no documents/attributes keys anywhere', () => {
    const json = JSON.stringify(curated);
    expect(json).not.toContain('"documents"');
    expect(json).not.toContain('"attributes"');
    // items keep only the curated projection (no raw `classification` object)
    for (const item of curated.tender.items) {
      expect(Object.keys(item).sort()).toEqual(
        ['classificationId', 'description', 'quantity', 'scheme', 'unitName'].sort(),
      );
    }
  });

  it('summarizes tender.documents into documentsSummary', () => {
    expect(curated.tender.documentsSummary.count).toBe(2);
    expect(curated.tender.documentsSummary.types.sort()).toEqual(
      ['purchaseRequest', 'tenderNotice'].sort(),
    );
    // earliest datePublished across the 2 docs
    expect(curated.tender.documentsSummary.firstDatePublished).toBe('2026-04-01T18:24:01-06:00');
  });

  it('reconstructs bids and bidCounts (rules 5/10/17 input)', () => {
    expect(curated.bids).toHaveLength(2);
    expect(curated.bidCounts).toEqual({
      count: 2,
      valid: 1,
      disqualified: 1,
    });
    const statuses = curated.bids.map((b) => b.status).sort();
    expect(statuses).toEqual(['disqualified', 'valid']);
  });

  it('keeps bids[].tendererId as the RAW tenderer id (not canonicalized)', () => {
    const validBid = curated.bids.find((b) => b.status === 'valid');
    expect(validBid?.tendererId).toBe('GT-NIT-7894880'); // raw, NOT GT-NIT:7894880
    const dq = curated.bids.find((b) => b.status === 'disqualified');
    expect(dq?.tendererId).toBe('GT-NIT-15856801');
  });

  it('keeps awards[].supplierIds as RAW ids and amounts exact (Number)', () => {
    expect(curated.awards).toHaveLength(1);
    expect(curated.awards[0]!.supplierIds).toEqual(['GT-NIT-7894880']);
    expect(curated.awards[0]!.value.amount).toBe(92000.5);
    expect(typeof curated.awards[0]!.value.amount).toBe('number');
    // round-trip exactness
    expect(JSON.parse(JSON.stringify(curated)).awards[0].value.amount).toBe(92000.5);
  });

  it('itemFamilies = 4-char UNSPSC prefixes; skips ids shorter than 4', () => {
    // 80131500 → 8013 ; 43221724 → 4322 ; '81' (len 2) → excluded
    expect(curated.tender.itemFamilies.sort()).toEqual(['4322', '8013'].sort());
    expect(curated.tender.itemFamilies).not.toContain('81');
  });

  it('maps contracts with documentsCount = documents.length and period', () => {
    expect(curated.contracts).toHaveLength(1);
    expect(curated.contracts[0]!.documentsCount).toBe(1);
    expect(curated.contracts[0]!.period).toEqual({
      start: '2026-05-01T00:00:00-06:00',
      end: '2026-12-31T00:00:00-06:00',
    });
    expect(curated.contracts[0]!.value.amount).toBe(92000.5);
  });

  it('derives region from the buyer party address', () => {
    expect(curated.region).toBe('ALTA VERAPAZ');
  });

  it('maps buyer.id to the canonical id when the buyer party is present', () => {
    expect(curated.buyer.id).toBe('GT-NIT:4132726');
    expect(curated.buyer.name).toBe('MUNICIPALIDAD DE SAN PEDRO CARCHA, ALTA VERAPAZ');
  });

  it('carries year/month from ctx', () => {
    expect(curated.year).toBe(2026);
    expect(curated.month).toBe(4);
  });

  describe('parties absent / sparsity defaults', () => {
    const sparse = toCuratedRelease(noPartiesRecordFixture, ctx);

    it('still validates against the schema', () => {
      expect(() => CuratedReleaseSchema.parse(sparse)).not.toThrow();
    });

    it('falls back to raw buyer id and empty region', () => {
      expect(sparse.buyer.id).toBe('GT-NIT-2455404'); // raw — no party map
      expect(sparse.region).toBe('');
    });

    it('uses raw supplier ids when no parties map', () => {
      expect(sparse.awards[0]!.supplierIds).toEqual([
        'GT-GCID-CO-0D13D3EE908F02969DED73509B7566AB',
      ]);
    });

    it('absent bids/contracts → []; absent mainProcurementCategory → "unknown"', () => {
      expect(sparse.bids).toEqual([]);
      expect(sparse.bidCounts).toEqual({ count: 0, valid: 0, disqualified: 0 });
      expect(sparse.contracts).toEqual([]);
      expect(sparse.tender.mainProcurementCategory).toBe('unknown');
    });

    it('absent tenderPeriod.endDate → null', () => {
      expect(sparse.tender.tenderPeriod.endDate).toBeNull();
    });

    it('no documents → documentsSummary.firstDatePublished is "" sentinel', () => {
      expect(sparse.tender.documentsSummary.count).toBe(0);
      expect(sparse.tender.documentsSummary.firstDatePublished).toBe('');
      expect(sparse.tender.documentsSummary.types).toEqual([]);
    });
  });
});
