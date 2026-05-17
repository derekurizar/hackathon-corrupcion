/** Schema-valid `RegionMap` params (mirrors the synced Zod schema). */
export const regionMapParams = {
  buyer: 'Ministerio de Desarrollo Social',
  regions: [
    { region: 'Guatemala', value: 2_400_000, valueRef: 'ev:0' },
    { region: 'Quetzaltenango', value: 1_150_000, valueRef: 'ev:1' },
    { region: 'Alta Verapaz', value: 780_000, valueRef: 'ev:2' },
    { region: 'Petén', value: 410_000, valueRef: 'ev:3' },
  ],
  caption: 'Distribución geográfica del valor revisado.',
};
