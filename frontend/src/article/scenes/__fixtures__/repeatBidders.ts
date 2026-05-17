/** Schema-valid `RepeatBidders` params (mirrors the synced Zod schema). */
export const repeatBiddersParams = {
  buyer: 'Ministerio de Educación',
  bidders: [
    {
      bidderId: 'bid-1',
      bidderDisplay: 'Oferente anónimo 1',
      appearances: 12,
      appearancesRef: 'ev:0',
      wins: 10,
      winsRef: 'ev:1',
    },
    {
      bidderId: 'bid-2',
      bidderDisplay: 'Oferente anónimo 2',
      appearances: 12,
      appearancesRef: 'ev:2',
      wins: 2,
      winsRef: 'ev:3',
    },
    {
      bidderId: 'bid-3',
      bidderDisplay: 'Oferente anónimo 3',
      appearances: 8,
      appearancesRef: 'ev:4',
      wins: 1,
      winsRef: 'ev:5',
    },
  ],
  caption: 'Un mismo oferente gana la mayoría de las licitaciones revisadas.',
};
