export const validConcentrationFan = {
  buyer: 'Ministerio de Salud',
  topShare: 0.65,
  topShareRef: 'sig:supplier_concentration_per_buyer',
  suppliers: [
    {
      supplierId: 'GT-NIT:1234567',
      supplierDisplay: 'Proveedor A',
      value: 420000,
      valueRef: 'ev:1',
      share: 0.65,
      shareRef: 'sig:supplier_concentration_per_buyer',
      flagged: true,
    },
    {
      supplierId: 'GT-NIT:7654321',
      supplierDisplay: 'Proveedor B',
      value: 230000,
      valueRef: 'ev:2',
      share: 0.35,
      shareRef: 'ev:3',
      flagged: false,
    },
  ],
  caption: 'Un proveedor domina las adjudicaciones del comprador.',
};

// invalid: flagged is a string, not boolean
export const invalidConcentrationFan = {
  ...validConcentrationFan,
  suppliers: [
    {
      supplierId: 'GT-NIT:1234567',
      supplierDisplay: 'Proveedor A',
      value: 420000,
      valueRef: 'ev:1',
      share: 0.65,
      shareRef: 'sig:supplier_concentration_per_buyer',
      flagged: 'yes',
    },
  ],
};
