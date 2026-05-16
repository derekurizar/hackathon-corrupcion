/** Schema-valid `ClosingStatement` params (mirrors the synced Zod schema). */
export const closingStatementParams = {
  whatItMeans:
    'Estos patrones merecen revisión: no son una conclusión, son una invitación a mirar más de cerca.',
  caveat:
    'Estas son señales de revisión, no conclusiones de ilegalidad. Los proveedores se muestran de forma anonimizada.',
  ctas: ['methodology', 'listen', 'share'] as [
    'methodology',
    'listen',
    'share',
  ],
};

/** Empty-caveat variant — component must substitute FIXED_CAVEAT. */
export const closingStatementEmptyCaveat = {
  ...closingStatementParams,
  caveat: '',
};
