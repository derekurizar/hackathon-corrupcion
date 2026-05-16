export const validCaseStatement = {
  lead: 'El comprador concentró el gasto en un solo proveedor.',
  pullStat: {
    value: 0.65,
    label: 'de participación del proveedor principal',
    ref: 'sig:supplier_concentration_per_buyer',
  },
  facts: [
    { text: '5 adjudicaciones al mismo proveedor.', valueRef: 'ev:0' },
    { text: 'Q650,000 en valor total.', valueRef: 'ev:1' },
    { text: 'Sin competencia en la mayoría de los procesos.' },
  ],
};

// invalid: facts exceeds max of 3
export const invalidCaseStatement = {
  ...validCaseStatement,
  facts: [{ text: 'a' }, { text: 'b' }, { text: 'c' }, { text: 'd' }],
};
