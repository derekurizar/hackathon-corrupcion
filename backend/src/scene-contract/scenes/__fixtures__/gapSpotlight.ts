export const validGapSpotlight = {
  events: [
    { date: '2026-01-05', kind: 'published', label: 'Publicación' },
    { date: '2026-01-06', kind: 'award', label: 'Adjudicación' },
  ],
  gapDays: 1,
  gapDaysRef: 'ev:1',
  spotlightLabel: 'Adjudicación 1 día después de publicar',
  caption: 'Ventana inusualmente corta.',
};

// invalid: gapDays is a string
export const invalidGapSpotlight = {
  ...validGapSpotlight,
  gapDays: 'one',
};
