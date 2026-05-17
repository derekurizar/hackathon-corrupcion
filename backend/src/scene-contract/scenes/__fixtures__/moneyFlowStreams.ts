export const validMoneyFlowStreams = {
  buyer: 'Ministerio de Salud',
  totalValue: 650000,
  totalRef: 'sig:supplier_concentration_per_buyer.evidence',
  streams: [
    {
      supplierId: 'GT-NIT:1234567',
      supplierDisplay: 'Proveedor A',
      amount: 420000,
      amountRef: 'ev:1',
      share: 0.65,
      shareRef: 'sig:supplier_concentration_per_buyer',
    },
    {
      supplierId: 'GT-NIT:7654321',
      supplierDisplay: 'Proveedor B',
      amount: 230000,
      amountRef: 'ev:2',
      share: 0.35,
      shareRef: 'ev:3',
    },
  ],
  emphasisSupplierId: 'GT-NIT:1234567',
  caption: 'El flujo del dinero se concentra en un proveedor.',
  narration: 'Fixture narration for money flow.',
};

// invalid: streams is empty (.min(1))
export const invalidMoneyFlowStreams = {
  ...validMoneyFlowStreams,
  streams: [],
};
