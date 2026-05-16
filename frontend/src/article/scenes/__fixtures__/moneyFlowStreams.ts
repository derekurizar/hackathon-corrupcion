/** Schema-valid `MoneyFlowStreams` params (mirrors the synced Zod schema). */
export const moneyFlowStreamsParams = {
  buyer: 'Ministerio de Salud Pública',
  totalValue: 3_200_000,
  totalRef: 'ev:0',
  streams: [
    {
      supplierId: 'sup-1',
      supplierDisplay: 'Proveedor anónimo A',
      amount: 2_600_000,
      amountRef: 'ev:0',
      share: 0.82,
      shareRef: 'sig:supplier_concentration_per_buyer',
    },
    {
      supplierId: 'sup-2',
      supplierDisplay: 'Proveedor anónimo B',
      amount: 600_000,
      amountRef: 'ev:1',
      share: 0.18,
      shareRef: 'sig:supplier_concentration_per_buyer',
    },
  ],
  emphasisSupplierId: 'sup-1',
  caption: 'La mayor parte del valor fluyó hacia un solo proveedor.',
};
