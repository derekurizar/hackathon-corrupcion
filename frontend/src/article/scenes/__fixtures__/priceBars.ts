/** Schema-valid `PriceBars` params (mirrors the synced Zod schema). */
export const priceBarsParams = {
  buyer: 'Ministerio de Salud Pública',
  category: 'Insumos médicos — guantes de nitrilo',
  bars: [
    { label: 'Contrato 2023-A', value: 185_000, valueRef: 'ev:0', flagged: true },
    { label: 'Contrato 2023-B', value: 142_500, valueRef: 'ev:1', flagged: false },
    { label: 'Contrato 2024-A', value: 168_300, valueRef: 'ev:2', flagged: true },
  ],
  benchmarkValue: 120_000,
  benchmarkRef: 'sig:price_vs_benchmark',
  caption: 'Precios revisados frente a la referencia del sector.',
};
