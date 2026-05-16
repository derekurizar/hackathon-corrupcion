import type { ContractSignal } from './types.js';

/**
 * Review Priority badge (idea/03 §"Risk presentation"). NO composite numeric
 * score is ever surfaced — only this three-level badge.
 *
 *   high   = any high-severity signal OR ≥ 3 medium signals
 *   medium = any medium-severity signal OR ≥ 2 low signals
 *   low    = otherwise
 *
 * Consumed by Area 07 for `investigations.reviewPriority`.
 */
export function reviewPriority(
  signals: Pick<ContractSignal, 'severity'>[],
): 'high' | 'medium' | 'low' {
  let highCount = 0;
  let medCount = 0;
  let lowCount = 0;
  for (const s of signals) {
    if (s.severity === 'high') highCount++;
    else if (s.severity === 'medium') medCount++;
    else lowCount++;
  }
  if (highCount > 0 || medCount >= 3) return 'high';
  if (medCount > 0 || lowCount >= 2) return 'medium';
  return 'low';
}
