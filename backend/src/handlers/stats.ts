import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getCurrentDashboardStats } from '../repositories/index.js';
import { projectStats } from '../api/project.js';
import { CACHE, fail, ok } from '../api/respond.js';
import { moduleLogger } from '../obs/logger.js';

const log = moduleLogger('handler/stats');

/**
 * GET /api/stats — current dashboard counters. Thin: repo → project → respond.
 * Type-only `aws-lambda` import (no runtime AWS SDK in `backend/src`).
 */
export const handler = async (
  _event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const stats = await getCurrentDashboardStats();
    if (!stats) {
      log('result=miss reason=no-stats-doc');
      return fail(500, 'Stats unavailable');
    }
    log('result=ok');
    return ok(projectStats(stats), { cacheControl: CACHE.stats });
  } catch (err) {
    log(
      `result=error message=${err instanceof Error ? err.message : String(err)}`,
    );
    return fail(500, 'Stats unavailable');
  }
};
