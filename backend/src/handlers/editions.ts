import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getCurrentEdition } from '../repositories/index.js';
import { projectEdition } from '../api/project.js';
import { CACHE, fail, ok } from '../api/respond.js';
import { moduleLogger } from '../obs/logger.js';

const log = moduleLogger('handler/editions');

/**
 * GET /api/editions/current — the latest published edition. repo → project →
 * respond. 404 when no edition has been published yet.
 */
export const handler = async (
  _event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const edition = await getCurrentEdition();
    if (!edition) {
      log('result=not-found reason=no-current-edition');
      return fail(404, 'No current edition');
    }
    log('result=ok');
    return ok(projectEdition(edition), { cacheControl: CACHE.editions });
  } catch (err) {
    log(
      `result=error message=${err instanceof Error ? err.message : String(err)}`,
    );
    return fail(500, 'Edition unavailable');
  }
};
