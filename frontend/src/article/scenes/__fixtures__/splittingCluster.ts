/** Schema-valid `SplittingCluster` params (mirrors the synced Zod schema). */
export const splittingClusterParams = {
  buyer: 'Ministerio de Comunicaciones',
  supplierId: 'sup-cluster-1',
  supplierDisplay: 'Proveedor anónimo C',
  awards: [
    { date: '2023-06-02', value: 84_000, valueRef: 'ev:0' },
    { date: '2023-06-09', value: 87_500, valueRef: 'ev:1' },
    { date: '2023-06-16', value: 89_200, valueRef: 'ev:2' },
    { date: '2023-06-23', value: 86_700, valueRef: 'ev:3' },
  ],
  clusterSum: 347_400,
  clusterSumRef: 'sig:contract_splitting',
  caption: 'Cuatro adjudicaciones consecutivas al mismo proveedor.',
};
