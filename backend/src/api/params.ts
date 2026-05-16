import { z } from 'zod';
import { moduleLogger } from '../obs/logger.js';

const log = moduleLogger('api/params');

/**
 * Query string parsing/validation for the public read API. Raw API Gateway
 * query values are always strings (or undefined) — numerics are `.transform`ed
 * explicitly rather than `z.coerce`d so a non-numeric string is a hard 400
 * instead of silently becoming `NaN`. Money stays float64 (`Number`).
 */
export const QueryParamsSchema = z
  .object({
    family: z.enum(['F1', 'F2', 'F3', 'F4']).optional(),
    priority: z.enum(['high', 'medium', 'low']).optional(),
    buyer: z.string().min(1).optional(),
    minValue: z
      .string()
      .regex(/^\d+(\.\d+)?$/)
      .transform(Number)
      .optional(),
    maxValue: z
      .string()
      .regex(/^\d+(\.\d+)?$/)
      .transform(Number)
      .optional(),
    q: z.string().min(1).optional(),
    page: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .pipe(z.number().int().min(1))
      .optional(),
    lang: z.enum(['es', 'en']).default('es'),
  })
  .superRefine((val, ctx) => {
    if (
      val.minValue !== undefined &&
      val.maxValue !== undefined &&
      val.minValue > val.maxValue
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'minValue must not exceed maxValue',
        path: ['minValue'],
      });
    }
  });

export const CaseKeyParamSchema = z.object({ caseKey: z.string().min(1) });

export type QueryParams = z.infer<typeof QueryParamsSchema>;
export type CaseKeyParam = z.infer<typeof CaseKeyParamSchema>;

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; issue: string };

function firstIssue(err: z.ZodError): string {
  const i = err.issues[0];
  if (!i) return 'invalid request';
  const path = i.path.length > 0 ? `${i.path.join('.')}: ` : '';
  return `${path}${i.message}`;
}

/**
 * Parse + validate raw query params. Never throws across the I/O boundary —
 * `respond.ts` turns `{ ok: false }` into a typed 400.
 */
export function parseQuery(
  raw: Record<string, string | undefined>,
): ParseResult<QueryParams> {
  const parsed = QueryParamsSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = firstIssue(parsed.error);
    log(`parse=query result=invalid issue=${JSON.stringify(issue)}`);
    return { ok: false, issue };
  }
  return { ok: true, value: parsed.data };
}

export function parseCaseKey(
  raw: Record<string, string | undefined>,
): ParseResult<CaseKeyParam> {
  const parsed = CaseKeyParamSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = firstIssue(parsed.error);
    log(`parse=caseKey result=invalid issue=${JSON.stringify(issue)}`);
    return { ok: false, issue };
  }
  return { ok: true, value: parsed.data };
}
