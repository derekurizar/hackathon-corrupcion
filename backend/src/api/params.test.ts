import { describe, it, expect } from 'vitest';
import { parseCaseKey, parseQuery } from './params.js';

describe('parseQuery', () => {
  it('roundtrips a full valid query', () => {
    const r = parseQuery({
      family: 'F2',
      priority: 'high',
      buyer: 'MINFIN',
      minValue: '1000',
      maxValue: '5000.50',
      q: 'hospital',
      page: '3',
      lang: 'en',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    expect(r.value).toEqual({
      family: 'F2',
      priority: 'high',
      buyer: 'MINFIN',
      minValue: 1000,
      maxValue: 5000.5,
      q: 'hospital',
      page: 3,
      lang: 'en',
    });
  });

  it('defaults lang to es and is ok with all optionals missing', () => {
    const r = parseQuery({});
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.lang).toBe('es');
    expect(r.value.family).toBeUndefined();
  });

  it('rejects bad family', () => {
    const r = parseQuery({ family: 'F5' });
    expect(r.ok).toBe(false);
  });

  it('rejects bad priority', () => {
    const r = parseQuery({ priority: 'critical' });
    expect(r.ok).toBe(false);
  });

  it('rejects page=0, page=-1 and page=abc', () => {
    expect(parseQuery({ page: '0' }).ok).toBe(false);
    expect(parseQuery({ page: '-1' }).ok).toBe(false);
    expect(parseQuery({ page: 'abc' }).ok).toBe(false);
  });

  it('rejects non-numeric minValue', () => {
    const r = parseQuery({ minValue: 'abc' });
    expect(r.ok).toBe(false);
  });

  it('rejects minValue > maxValue (cross-field)', () => {
    const r = parseQuery({ minValue: '5000', maxValue: '1000' });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected fail');
    expect(r.issue).toMatch(/minValue/);
  });

  it('accepts minValue == maxValue', () => {
    const r = parseQuery({ minValue: '1000', maxValue: '1000' });
    expect(r.ok).toBe(true);
  });
});

describe('parseCaseKey', () => {
  it('accepts a non-empty caseKey', () => {
    const r = parseCaseKey({ caseKey: 'abc123' });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    expect(r.value.caseKey).toBe('abc123');
  });

  it('rejects empty caseKey', () => {
    expect(parseCaseKey({ caseKey: '' }).ok).toBe(false);
  });

  it('rejects missing caseKey', () => {
    expect(parseCaseKey({ caseKey: undefined }).ok).toBe(false);
  });
});
