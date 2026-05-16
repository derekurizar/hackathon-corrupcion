import { describe, it, expect } from 'vitest';
import { reviewPriority } from './review-priority.js';

const sev = (s: 'low' | 'medium' | 'high') => ({ severity: s });

describe('reviewPriority (idea/03 threshold table)', () => {
  it('empty → low', () => {
    expect(reviewPriority([])).toBe('low');
  });

  it('any high → high', () => {
    expect(reviewPriority([sev('high')])).toBe('high');
    expect(reviewPriority([sev('low'), sev('high')])).toBe('high');
  });

  it('>= 3 medium → high', () => {
    expect(reviewPriority([sev('medium'), sev('medium'), sev('medium')])).toBe('high');
  });

  it('1-2 medium (and no high) → medium', () => {
    expect(reviewPriority([sev('medium')])).toBe('medium');
    expect(reviewPriority([sev('medium'), sev('medium')])).toBe('medium');
  });

  it('>= 2 low (and no medium/high) → medium', () => {
    expect(reviewPriority([sev('low'), sev('low')])).toBe('medium');
    expect(reviewPriority([sev('low'), sev('low'), sev('low')])).toBe('medium');
  });

  it('exactly 1 low → low', () => {
    expect(reviewPriority([sev('low')])).toBe('low');
  });

  it('1 medium beats 1 low (medium)', () => {
    expect(reviewPriority([sev('low'), sev('medium')])).toBe('medium');
  });
});
