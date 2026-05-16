export const validSplittingCluster = {
  buyer: 'Ministerio de Salud',
  supplierId: 'GT-NIT:1234567',
  supplierDisplay: 'Proveedor A',
  awards: [
    { date: '2026-01-05', value: 85000, valueRef: 'ev:1' },
    { date: '2026-01-10', value: 88000, valueRef: 'ev:2' },
    { date: '2026-01-20', value: 86000, valueRef: 'ev:3' },
  ],
  clusterSum: 259000,
  clusterSumRef: 'sig:contract_splitting',
  caption: 'Tres adjudicaciones en 30 días, cada una bajo Q90k.',
};

// invalid: awards empty
export const invalidSplittingCluster = {
  ...validSplittingCluster,
  awards: [],
};
