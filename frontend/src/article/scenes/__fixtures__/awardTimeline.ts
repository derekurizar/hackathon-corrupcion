/** Schema-valid `AwardTimeline` params (mirrors the synced Zod schema). */
export const awardTimelineParams = {
  events: [
    { date: '2023-03-01', kind: 'published' as const, label: 'Convocatoria' },
    {
      date: '2023-03-09',
      kind: 'award' as const,
      label: 'Adjudicación',
      valueRef: 'ev:0',
    },
    {
      date: '2023-03-20',
      kind: 'contractSigned' as const,
      label: 'Firma de contrato',
    },
  ],
  missingStages: ['tenderClose'],
  highlightIdx: 1,
  caption: 'Adjudicación rápida tras la publicación.',
};
