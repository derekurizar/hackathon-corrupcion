import { describe, it, expect } from 'vitest';
import {
  shouldReplace,
  collapseByOcidKeepLatest,
} from './curated-releases.js';
import type { CuratedRelease } from '../schema/index.js';

/** Minimal CuratedRelease stub — only `ocid`/`date` matter for dedup. */
const rel = (ocid: string, date: string): CuratedRelease =>
  ({ ocid, date }) as unknown as CuratedRelease;

describe('shouldReplace', () => {
  it('returns true when no stored doc (null)', () => {
    expect(shouldReplace({ date: '2026-01-01T00:00:00Z' }, null)).toBe(true);
  });
  it('returns true when no stored doc (undefined)', () => {
    expect(shouldReplace({ date: '2026-01-01T00:00:00Z' }, undefined)).toBe(true);
  });
  it('returns true when incoming is newer', () => {
    expect(
      shouldReplace({ date: '2026-02-01T00:00:00Z' }, { date: '2026-01-01T00:00:00Z' }),
    ).toBe(true);
  });
  it('returns true when dates are equal (keep latest = idempotent)', () => {
    expect(
      shouldReplace({ date: '2026-01-01T00:00:00Z' }, { date: '2026-01-01T00:00:00Z' }),
    ).toBe(true);
  });
  it('returns false when incoming is older', () => {
    expect(
      shouldReplace({ date: '2025-12-01T00:00:00Z' }, { date: '2026-01-01T00:00:00Z' }),
    ).toBe(false);
  });
});

describe('collapseByOcidKeepLatest', () => {
  it('returns empty for empty input', () => {
    expect(collapseByOcidKeepLatest([])).toEqual([]);
  });

  it('passes through distinct ocids untouched', () => {
    const out = collapseByOcidKeepLatest([
      rel('ocid-a', '2026-01-01T00:00:00Z'),
      rel('ocid-b', '2026-02-01T00:00:00Z'),
    ]);
    expect(out).toHaveLength(2);
    expect(new Set(out.map((d) => d.ocid))).toEqual(
      new Set(['ocid-a', 'ocid-b']),
    );
  });

  it('collapses same-ocid dups keeping the latest date', () => {
    const out = collapseByOcidKeepLatest([
      rel('ocid-a', '2026-01-01T00:00:00Z'),
      rel('ocid-a', '2026-03-01T00:00:00Z'),
      rel('ocid-a', '2026-02-01T00:00:00Z'),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.date).toBe('2026-03-01T00:00:00Z');
  });

  it('an earlier op with a later date is NOT clobbered by a later op with an earlier date', () => {
    // Invariant #2: without this collapse, a naive second bulkWrite op would
    // blindly overwrite the newer record.
    const out = collapseByOcidKeepLatest([
      rel('ocid-x', '2026-05-01T00:00:00Z'), // newer, appears first
      rel('ocid-x', '2026-04-01T00:00:00Z'), // older, appears second
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.date).toBe('2026-05-01T00:00:00Z');
  });

  it('equal dates are idempotent (keep-latest, last equal wins, single doc)', () => {
    const out = collapseByOcidKeepLatest([
      rel('ocid-e', '2026-01-01T00:00:00Z'),
      rel('ocid-e', '2026-01-01T00:00:00Z'),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.date).toBe('2026-01-01T00:00:00Z');
  });
});
