/** Schema-valid `CaseStatement` params (mirrors the synced Zod schema). */
export const caseStatementParams = {
  lead: 'El Ministerio concentró la mayoría de sus contratos en un solo proveedor durante el período revisado.',
  pullStat: {
    value: 82,
    label: 'Cuota del proveedor principal (%)',
    ref: 'sig:supplier_concentration_per_buyer',
  },
  facts: [
    { text: '14 contratos adjudicados al mismo proveedor.' },
    {
      text: 'Q3.2M en valor total revisado.',
      valueRef: 'ev:0',
    },
    { text: 'Predominio del método de compra directa.' },
  ],
};
