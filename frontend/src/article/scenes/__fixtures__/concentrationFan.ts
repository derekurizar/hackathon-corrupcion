/** Schema-valid `ConcentrationFan` params (mirrors the synced Zod schema). */
export const concentrationFanParams = {
  buyer: 'Ministerio de Salud Pública',
  topShare: 0.82,
  topShareRef: 'sig:supplier_concentration_per_buyer',
  suppliers: [
    {
      supplierId: 'sup-1',
      supplierDisplay: 'Proveedor anónimo A',
      value: 2_600_000,
      valueRef: 'ev:0',
      share: 0.82,
      shareRef: 'sig:supplier_concentration_per_buyer',
      flagged: true,
    },
    {
      supplierId: 'sup-2',
      supplierDisplay: 'Proveedor anónimo B',
      value: 400_000,
      valueRef: 'ev:1',
      share: 0.12,
      shareRef: 'sig:supplier_concentration_per_buyer',
      flagged: false,
    },
    {
      supplierId: 'sup-3',
      supplierDisplay: 'Proveedor anónimo C',
      value: 200_000,
      valueRef: 'ev:2',
      share: 0.06,
      shareRef: 'sig:supplier_concentration_per_buyer',
      flagged: false,
    },
  ],
  caption: 'Un proveedor concentra la mayor parte del valor adjudicado.',
  narration: 'Fixture narration for concentration fan.',
};
