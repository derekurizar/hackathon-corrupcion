import { describe, it, expect } from 'vitest';
import { formatBenchmark } from './benchmark.js';

describe('formatBenchmark — scalar pass-through', () => {
  it('returns numbers/strings/booleans/null/undefined unchanged', () => {
    expect(formatBenchmark(0.98)).toBe(0.98);
    expect(formatBenchmark('3x median')).toBe('3x median');
    expect(formatBenchmark(true)).toBe(true);
    expect(formatBenchmark(null)).toBe(null);
    expect(formatBenchmark(undefined)).toBe(undefined);
  });
});

describe('formatBenchmark — object summaries', () => {
  it('emits the primary numeric key for directValueShare', () => {
    expect(formatBenchmark({ directValueShare: 0.98, level: 'family' })).toBe(0.98);
  });

  it('emits "<primary> (threshold: <t>)" when a threshold sibling exists', () => {
    expect(formatBenchmark({ count: 1, threshold: 3 })).toBe('1 (threshold: 3)');
  });

  it('falls back to a generic capped key:value summary', () => {
    const out = formatBenchmark({ level: 'family', note: 'unusual', tags: ['a', 'b'] });
    expect(typeof out).toBe('string');
    expect(out as string).toContain('level: family');
    expect((out as string).length).toBeLessThanOrEqual(81); // 80 + ellipsis
  });

  it('never throws on odd inputs', () => {
    expect(() => formatBenchmark([1, 2, 3])).not.toThrow();
    expect(() => formatBenchmark(() => 1)).not.toThrow();
  });
});
