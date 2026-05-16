import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import {
  getDistinctFilterValues,
  getInvestigationValueBounds,
} from '../repositories/index.js';
import type { FiltersDTO } from '../api/dto.js';
import { CACHE, fail, ok } from '../api/respond.js';
import { moduleLogger } from '../obs/logger.js';

const log = moduleLogger('handler/filters');

// Fixed taxonomy — families/priorities are a closed vocabulary, not derived
// from data (so an empty collection still yields a usable filter UI).
const FAMILIES = ['F1', 'F2', 'F3', 'F4'];
const PRIORITIES = ['high', 'medium', 'low'];

/**
 * GET /api/filters — filter vocabulary + value bounds for the list UI.
 */
export const handler = async (
  _event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const [distinct, valueBounds] = await Promise.all([
      getDistinctFilterValues(),
      getInvestigationValueBounds(),
    ]);
    const body: FiltersDTO = {
      families: FAMILIES,
      priorities: PRIORITIES,
      buyers: distinct.buyers,
      valueBounds,
    };
    log(
      `result=ok buyers=${distinct.buyers.length} min=${valueBounds.min} max=${valueBounds.max}`,
    );
    return ok(body, { cacheControl: CACHE.filters });
  } catch (err) {
    log(
      `result=error message=${err instanceof Error ? err.message : String(err)}`,
    );
    return fail(500, 'Filters unavailable');
  }
};
