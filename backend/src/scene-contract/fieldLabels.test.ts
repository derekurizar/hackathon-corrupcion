import { describe, it, expect } from 'vitest';
import { FIELD_LABELS, humanField } from './fieldLabels.js';

/**
 * The exhaustive set of `field` strings emitted by the 23 detection rules in
 * backend/src/detection/rules/. If a rule starts emitting a new field, this
 * list (and FIELD_LABELS) must grow with it.
 */
const RULE_FIELDS = [
  'awards[].value.amount',
  'awards[].date',
  'awards[].status',
  'awards[].supplierIds',
  'bids[].amount',
  'bids[].status',
  'bids[].tendererId',
  'buyer.id',
  'entities.entityType',
  'tender.datePublished',
  'tender.documentsSummary.count',
  'tender.numberOfTenderers',
  'tender.procurementMethodDetails',
  'tender.statusDetails',
  'tender.tenderPeriod.endDate',
];

describe('FIELD_LABELS', () => {
  it('has a Spanish label for every field emitted by a detection rule', () => {
    for (const field of RULE_FIELDS) {
      expect(FIELD_LABELS[field], `missing label for ${field}`).toBeTruthy();
    }
  });

  it('maps the reported regressions to the expected labels', () => {
    expect(humanField('tender.procurementMethodDetails')).toBe('Método de contratación');
    expect(humanField('buyer.id')).toBe('Entidad compradora');
  });
});

describe('humanField fallback for unknown fields', () => {
  it('strips a leading object prefix and splits camelCase', () => {
    expect(humanField('tender.someUnknownField')).toBe('Some Unknown Field');
    expect(humanField('awards[].mysteryValue')).toBe('Mystery Value');
  });

  it('handles a bare camelCase field with no prefix', () => {
    expect(humanField('numberOfTenderers')).toBe('Number Of Tenderers');
  });

  it('never throws on degenerate input', () => {
    expect(humanField('')).toBe('—');
    expect(humanField('tender.')).toBe('tender.');
    // @ts-expect-error — exercising the runtime guard against non-string input
    expect(humanField(undefined)).toBe('—');
  });
});
