/** Schema-valid `ThresholdLadder` params (mirrors the synced Zod schema). */
export const thresholdLadderParams = {
  buyer: 'Municipalidad de Quetzaltenango',
  bands: [
    { label: 'Compra directa', ceiling: 90_000 },
    { label: 'Cotización', ceiling: 900_000 },
  ],
  awards: [
    { value: 88_500, valueRef: 'ev:0', bandLabel: 'Compra directa' },
    { value: 89_900, valueRef: 'ev:1', bandLabel: 'Compra directa' },
    { value: 540_000, valueRef: 'ev:2', bandLabel: 'Cotización' },
  ],
  caption: 'Adjudicaciones presionadas contra el techo del método.',
};
