/** Schema-valid `GapSpotlight` params (mirrors the synced Zod schema). */
export const gapSpotlightParams = {
  events: [
    { date: '2023-09-01', kind: 'published' as const, label: 'Convocatoria' },
    { date: '2023-09-04', kind: 'tenderClose' as const, label: 'Cierre de ofertas' },
    { date: '2023-09-05', kind: 'award' as const, label: 'Adjudicación' },
    { date: '2023-09-06', kind: 'contractSigned' as const, label: 'Firma de contrato' },
  ],
  gapDays: 3,
  gapDaysRef: 'sig:short_tender_window',
  spotlightLabel: 'Ventana de recepción',
  caption: 'Período de recepción de ofertas inusualmente breve.',
};
