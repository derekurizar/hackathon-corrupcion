export const validRegionMap = {
  buyer: 'Ministerio de Salud',
  regions: [
    { region: 'Guatemala', value: 420000, valueRef: 'ev:1' },
    { region: 'Quetzaltenango', value: 230000, valueRef: 'ev:2' },
  ],
  caption: 'Distribución geográfica del gasto.',
};

// invalid: regions empty
export const invalidRegionMap = {
  ...validRegionMap,
  regions: [],
};
