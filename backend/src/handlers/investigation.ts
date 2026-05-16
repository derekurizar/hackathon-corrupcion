import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getByCaseKey } from '../repositories/index.js';
import { parseCaseKey, parseQuery } from '../api/params.js';
import { projectFull } from '../api/project.js';
import { CACHE, fail, ok } from '../api/respond.js';
import { moduleLogger } from '../obs/logger.js';

const log = moduleLogger('handler/investigation');

/**
 * GET /api/investigations/{caseKey} — the full localized article DTO.
 * parse path + lang → repo → 404-or-project → respond.
 */
export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  const keyParsed = parseCaseKey({
    caseKey: event.pathParameters?.['caseKey'],
  });
  if (!keyParsed.ok) {
    log(`result=bad-request issue=${JSON.stringify(keyParsed.issue)}`);
    return fail(400, keyParsed.issue);
  }
  const qParsed = parseQuery(event.queryStringParameters ?? {});
  if (!qParsed.ok) {
    log(`result=bad-request issue=${JSON.stringify(qParsed.issue)}`);
    return fail(400, qParsed.issue);
  }
  const { caseKey } = keyParsed.value;
  const { lang } = qParsed.value;
  try {
    const doc = await getByCaseKey(caseKey);
    if (!doc) {
      log(`result=not-found caseKey=${JSON.stringify(caseKey)}`);
      return fail(404, 'Investigation not found');
    }
    log(`result=ok caseKey=${JSON.stringify(caseKey)} lang=${lang}`);
    return ok(projectFull(doc, lang), { cacheControl: CACHE.article });
  } catch (err) {
    log(
      `result=error caseKey=${JSON.stringify(caseKey)} message=${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return fail(500, 'Investigation unavailable');
  }
};
