import { z } from 'zod';

export const CuratedReleaseSchema = z.object({
  ocid: z.string(),
  id: z.string(),
  date: z.string(),
  year: z.number().int(),
  month: z.number().int(),
  buyer: z.object({
    id: z.string(),
    name: z.string(),
  }),
  tender: z.object({
    id: z.string(),
    title: z.string(),
    statusDetails: z.string(),
    procurementMethodDetails: z.string(),
    mainProcurementCategory: z.string(),
    numberOfTenderers: z.number().int(),
    datePublished: z.string(),
    tenderPeriod: z.object({
      startDate: z.string(),
      endDate: z.string().nullable(),
    }),
    items: z.array(
      z.object({
        classificationId: z.string(),
        scheme: z.string(),
        description: z.string(),
        quantity: z.number(),
        unitName: z.string(),
      }),
    ),
    itemFamilies: z.array(z.string()),
    documentsSummary: z.object({
      count: z.number().int(),
      types: z.array(z.string()),
      firstDatePublished: z.string(),
    }),
  }),
  bids: z.array(
    z.object({
      status: z.string(),
      amount: z.number(),
      tendererId: z.string(),
    }),
  ),
  bidCounts: z.object({
    count: z.number().int(),
    valid: z.number().int(),
    disqualified: z.number().int(),
  }),
  awards: z.array(
    z.object({
      id: z.string(),
      date: z.string(),
      status: z.string(),
      statusDetails: z.string(),
      value: z.object({ amount: z.number(), currency: z.string() }),
      supplierIds: z.array(z.string()),
    }),
  ),
  contracts: z.array(
    z.object({
      id: z.string(),
      awardID: z.string(),
      dateSigned: z.string(),
      value: z.object({ amount: z.number(), currency: z.string() }),
      period: z.object({ start: z.string(), end: z.string() }),
      documentsCount: z.number().int(),
      contractNumber: z.string(),
    }),
  ),
  region: z.string(),
});

export type CuratedRelease = z.infer<typeof CuratedReleaseSchema>;
