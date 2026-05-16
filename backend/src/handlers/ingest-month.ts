import type { Handler } from 'aws-lambda';
import { ingestMonth } from '../stages/ingest-month.js';

/**
 * Thin Lambda entry point for the `IngestMonth` Step Functions task. Type-only
 * `aws-lambda` import — NO runtime AWS SDK (keeps `backend/src` AWS-SDK-free).
 * Identical code path to the `data-integestion` `ingest` CLI verb.
 */
export const handler: Handler<
  { year: number; month: number },
  { recordsIngested: number }
> = async (event) => {
  const { recordsIngested } = await ingestMonth({
    year: event.year,
    month: event.month,
  });
  return { recordsIngested };
};
