/** Schema-valid `EvidenceLedger` params (mirrors the synced Zod schema). */
export const evidenceLedgerParams = {
  items: [
    {
      field: 'Cuota del proveedor principal',
      value: '82%',
      benchmark: 'Promedio sector 41%',
      comparison: 'Casi el doble del promedio del sector revisado.',
    },
    {
      field: 'Método de compra',
      value: 'Compra Directa',
      benchmark: 'Esperado: Licitación',
      comparison: 'Predominio del método no competitivo.',
    },
    {
      field: 'Contratos adjudicados',
      value: 14,
      comparison: 'Concentrados en una ventana corta.',
    },
  ],
  itemCaptions: [
    'Concentración alta.',
    'Método no competitivo.',
    'Volumen elevado.',
  ],
  order: 'original' as const,
};
