import type { Signal } from './signals.js';

export const validSignal: Signal = {
  _id: 'sig-0001',
  ocid: 'ocds-abc-001',
  caseKey: 'a3f1c9e8b2d4567890abcdef1234567890abcdef1234567890abcdef12345678',
  rule_id: 'single_bidder',
  family: 'F1',
  severity: 'high',
  confidence: 0.92,
  primaryEntityId: 'GT-NIT:1234567',
  secondaryEntityIds: ['GT-NIT:4132726'],
  timeWindow: '2025-08..2026-07',
  title: 'Single-bidder award',
  explanation: 'Only one bidder participated in this open tender.',
  story_angle: 'A pattern of single-bidder awards to the same supplier.',
  evidence: [
    { field: 'bidCounts.count', value: 1 },
    {
      field: 'awards.value.amount',
      value: 500000,
      comparison: '3x median',
      benchmark: { median: 50000, level: 'family' },
    },
  ],
};
