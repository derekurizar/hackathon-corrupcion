export const validEvidenceCompare = {
  rows: [
    {
      field: 'awards.value.amount',
      value: 500000,
      benchmark: { median: 50000, level: 'family' },
      comparison: '10x median',
    },
  ],
  rowCaptions: ['Valor 10x sobre la mediana de la familia.'],
  caption: 'Comparación contra los puntos de referencia.',
};

// invalid: rows empty
export const invalidEvidenceCompare = {
  ...validEvidenceCompare,
  rows: [],
};
