import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validInvestigationWithAudio } from '../schema/investigations.fixtures.js';

const getByCaseKeyMock = vi.fn();
vi.mock('../repositories/index.js', () => ({
  getByCaseKey: (...a: unknown[]) => getByCaseKeyMock(...a),
}));

import { handler } from './investigation.js';

const caseKey = validInvestigationWithAudio._id;

function evt(
  pathCaseKey: string | undefined,
  query: Record<string, string> = {},
): never {
  return {
    pathParameters: { caseKey: pathCaseKey },
    queryStringParameters: query,
  } as never;
}

describe('investigation handler', () => {
  beforeEach(() => getByCaseKeyMock.mockReset());

  it('200 with the full article DTO', async () => {
    getByCaseKeyMock.mockResolvedValue(validInvestigationWithAudio);
    const r = await handler(evt(caseKey));
    expect(r).toMatchObject({ statusCode: 200 });
    const body = JSON.parse((r as { body: string }).body);
    expect(body.caseKey).toBe(caseKey);
    expect(body.scenePlan).toBeDefined();
    expect(Array.isArray(body.evidence)).toBe(true);
    expect(body.audio).toEqual(validInvestigationWithAudio.audio);
    expect('signalIds' in body).toBe(false);
    expect('evidenceHash' in body).toBe(false);
  });

  it('lang=en selects the EN story', async () => {
    getByCaseKeyMock.mockResolvedValue(validInvestigationWithAudio);
    const r = await handler(evt(caseKey, { lang: 'en' }));
    const body = JSON.parse((r as { body: string }).body);
    expect(body.story.theCase).toBe(validInvestigationWithAudio.en.theCase);
    expect(body.audio).toEqual(validInvestigationWithAudio.audio);
  });

  it('404 with error envelope for an unknown caseKey', async () => {
    getByCaseKeyMock.mockResolvedValue(null);
    const r = await handler(evt('does-not-exist'));
    expect(r).toMatchObject({ statusCode: 404 });
    expect(JSON.parse((r as { body: string }).body).error.code).toBe(404);
  });

  it('400 for a missing path caseKey', async () => {
    const r = await handler(evt(undefined));
    expect(r).toMatchObject({ statusCode: 400 });
    expect(getByCaseKeyMock).not.toHaveBeenCalled();
  });
});
