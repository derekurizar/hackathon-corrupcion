export const validCaseSplit = {
  lead: 'Una compra concentrada.',
  body: 'El comprador adjudicó la mayor parte del valor a un solo proveedor.',
  keyFigure: { value: 420000, label: 'al proveedor principal', ref: 'ev:1' },
  caption: 'Cifra clave del caso.',
};

// invalid: keyFigure.value is a string
export const invalidCaseSplit = {
  ...validCaseSplit,
  keyFigure: { value: 'mucho', label: 'al proveedor principal', ref: 'ev:1' },
};
