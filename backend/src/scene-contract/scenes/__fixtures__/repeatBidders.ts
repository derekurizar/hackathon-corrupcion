export const validRepeatBidders = {
  buyer: 'Ministerio de Salud',
  bidders: [
    {
      bidderId: 'GT-NIT:1234567',
      bidderDisplay: 'Proveedor A',
      appearances: 5,
      appearancesRef: 'ev:1',
      wins: 4,
      winsRef: 'ev:2',
    },
  ],
  caption: 'El mismo conjunto de oferentes se repite.',
};

// invalid: appearances is a float, not int
export const invalidRepeatBidders = {
  ...validRepeatBidders,
  bidders: [
    {
      bidderId: 'GT-NIT:1234567',
      bidderDisplay: 'Proveedor A',
      appearances: 5.5,
      appearancesRef: 'ev:1',
      wins: 4,
      winsRef: 'ev:2',
    },
  ],
};
