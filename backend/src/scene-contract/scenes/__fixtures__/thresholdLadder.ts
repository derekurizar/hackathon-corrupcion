export const validThresholdLadder = {
  buyer: 'Ministerio de Salud',
  bands: [
    { label: 'Compra Directa (≤ Q90k)', ceiling: 90000 },
    { label: 'Cotización (≤ Q900k)', ceiling: 900000 },
  ],
  awards: [
    { value: 89500, valueRef: 'ev:1', bandLabel: 'Compra Directa' },
    { value: 88000, valueRef: 'ev:2', bandLabel: 'Compra Directa' },
  ],
  caption: 'Adjudicaciones justo debajo del techo de Compra Directa.',
};

// invalid: bands empty
export const invalidThresholdLadder = {
  ...validThresholdLadder,
  bands: [],
};
