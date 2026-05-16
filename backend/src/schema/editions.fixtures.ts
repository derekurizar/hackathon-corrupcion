import type { Edition } from './editions.js';

export const validEdition: Edition = {
  _id: 'edition-2026-02',
  publishedAt: '2026-02-15T00:00:00Z',
  leadCaseKey: 'a3f1c9e8b2d4567890abcdef1234567890abcdef1234567890abcdef12345678',
  highlightCaseKeys: [
    'a3f1c9e8b2d4567890abcdef1234567890abcdef1234567890abcdef12345678',
    'b4e2dac9c3e5678901bcdef02345678901bcdef02345678901bcdef023456789',
  ],
  stats: {
    count: 12,
    totalValueFlagged: 4500000,
    byFamily: { F1: 4, F2: 5, F3: 2, F4: 1 },
  },
};
