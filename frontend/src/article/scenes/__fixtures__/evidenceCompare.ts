/** Schema-valid `EvidenceCompare` params (mirrors the synced Zod schema). */
export const evidenceCompareParams = {
  rows: [
    {
      field: 'tender.procurementMethodDetails',
      value: 'Compra Directa',
      benchmark: 'Licitación Pública',
      comparison: 'Método no competitivo frente al esperado.',
    },
    {
      field: 'tender.numberOfTenderers',
      value: 1,
      benchmark: 4,
      comparison: 'Un único oferente frente al promedio del sector.',
    },
    {
      field: 'awards[].value.amount',
      value: 185_000,
      benchmark: 120_000,
    },
  ],
  rowCaptions: [
    'El método empleado no es el competitivo esperado para este monto.',
    'La concurrencia observada está muy por debajo de la referencia.',
    '',
  ],
  caption: 'Valores observados frente a la referencia del sector.',
};
