export const validCoverHeadline = {
  kicker: 'Compras públicas',
  headline: 'Un proveedor, múltiples adjudicaciones',
  dek: 'Una revisión de los datos abiertos de Guatecompras.',
  bgVariant: 'duotone',
  heroStat: {
    label: 'Valor total adjudicado',
    value: 650000,
    unit: 'GTQ',
    ref: 'sig:supplier_concentration_per_buyer',
  },
  buyer: 'Ministerio de Salud',
  supplierDisplay: 'Proveedor A',
  reviewPriority: 'high',
  intro: 'Fixture intro paragraph for cover headline.',
};

// invalid: bgVariant is not in the enum
export const invalidCoverHeadline = {
  ...validCoverHeadline,
  bgVariant: 'neon',
};
