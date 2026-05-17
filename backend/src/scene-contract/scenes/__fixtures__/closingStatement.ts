export const validClosingStatement = {
  whatItMeans: 'Indica un patrón que merece revisión, no una conclusión de ilegalidad.',
  caveat: 'Estas son señales de revisión, no conclusiones de ilegalidad.',
  ctas: ['methodology', 'listen', 'share'] as ['methodology', 'listen', 'share'],
  conclusions: ['Fixture conclusion sentence.'],
};

// invalid: caveat is empty (.min(1))
export const invalidClosingStatement = {
  ...validClosingStatement,
  caveat: '',
};
