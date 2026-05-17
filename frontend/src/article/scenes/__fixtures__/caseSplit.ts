/** Schema-valid `CaseSplit` params (mirrors the synced Zod schema). */
export const caseSplitParams = {
  lead: 'Una sola entidad concentró la mayor parte de su gasto en compras directas durante la ventana revisada.',
  body: 'El patrón combina adjudicaciones repetidas al mismo proveedor con montos que se mantienen por debajo de los umbrales de licitación, una combinación que merece revisión editorial.',
  keyFigure: {
    value: 4_750_000,
    label: 'Valor total revisado (GTQ)',
    ref: 'sig:supplier_concentration_per_buyer',
  },
  caption: 'Concentración del gasto en un único proveedor.',
};
