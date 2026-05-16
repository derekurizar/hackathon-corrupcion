export const validPriceBars = {
  buyer: 'Ministerio de Salud',
  category: '8110 — Servicios de salud',
  bars: [
    { label: 'Esta adjudicación', value: 500000, valueRef: 'ev:1', flagged: true },
    { label: 'Mediana de la familia', value: 50000, valueRef: 'ev:2', flagged: false },
  ],
  benchmarkValue: 50000,
  benchmarkRef: 'ev:2',
  caption: 'Precio muy por encima de la mediana de la categoría.',
};

// invalid: bars empty
export const invalidPriceBars = {
  ...validPriceBars,
  bars: [],
};
