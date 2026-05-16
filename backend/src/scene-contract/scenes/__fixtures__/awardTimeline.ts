export const validAwardTimeline = {
  events: [
    { date: '2026-01-05', kind: 'published', label: 'Publicación' },
    { date: '2026-01-07', kind: 'award', label: 'Adjudicación', valueRef: 'ev:1' },
  ],
  missingStages: ['tenderClose', 'contractSigned'],
  highlightIdx: 1,
  caption: 'Adjudicación dos días después de la publicación.',
};

// invalid: highlightIdx is not an integer
export const invalidAwardTimeline = {
  ...validAwardTimeline,
  highlightIdx: 1.5,
};
