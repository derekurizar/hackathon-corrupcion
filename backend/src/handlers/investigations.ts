import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { listInvestigationsPaged } from '../repositories/index.js';
import { parseQuery } from '../api/params.js';
import { projectListItems } from '../api/project.js';
import { CACHE, fail, ok } from '../api/respond.js';
import { moduleLogger } from '../obs/logger.js';

const log = moduleLogger('handler/investigations');

/**
 * GET /api/investigations — filtered, paged public list of contracts worth
 * reviewing. parse → repo → project → respond.
 */
export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  const parsed = parseQuery(event.queryStringParameters ?? {});
  if (!parsed.ok) {
    log(`result=bad-request issue=${JSON.stringify(parsed.issue)}`);
    return fail(400, parsed.issue);
  }
  const f = parsed.value;
  try {
    const { items, page, pageSize, total } = await listInvestigationsPaged({
      ...(f.family ? { family: f.family } : {}),
      ...(f.priority ? { priority: f.priority } : {}),
      ...(f.buyer ? { buyer: f.buyer } : {}),
      ...(f.minValue !== undefined ? { minValue: f.minValue } : {}),
      ...(f.maxValue !== undefined ? { maxValue: f.maxValue } : {}),
      ...(f.q ? { q: f.q } : {}),
      ...(f.page !== undefined ? { page: f.page } : {}),
      lang: f.lang,
    });
    log(
      `result=ok page=${page} returned=${items.length} total=${total} lang=${f.lang}`,
    );
    return ok(
      { items: projectListItems(items, f.lang), page, pageSize, total },
      { cacheControl: CACHE.investigationsList },
    );
  } catch (err) {
    log(
      `result=error message=${err instanceof Error ? err.message : String(err)}`,
    );
    return fail(500, 'Investigations unavailable');
  }
};
