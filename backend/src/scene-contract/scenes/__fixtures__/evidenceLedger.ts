export const validEvidenceLedger = {
  items: [
    { field: 'bidCounts.count', value: 1 },
    {
      field: 'awards.value.amount',
      value: 500000,
      comparison: '3x median',
      benchmark: { median: 50000, level: 'family' },
    },
  ],
  itemCaptions: ['Un solo oferente.', 'Valor 3x sobre la mediana.'],
  order: 'severity',
};

// invalid: order not in enum
export const invalidEvidenceLedger = {
  ...validEvidenceLedger,
  order: 'random',
};
