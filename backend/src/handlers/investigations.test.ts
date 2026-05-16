import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validInvestigation } from '../schema/investigations.fixtures.js';

const listInvestigationsPagedMock = vi.fn();
vi.mock('../repositories/index.js', () => ({
  listInvestigationsPaged: (...a: unknown[]) =>
    listInvestigationsPagedMock(...a),
}));

import { handler } from './investigations.js';

function evt(
  queryStringParameters: Record<string, string> | undefined,
): never {
  return { queryStringParameters } as never;
}

describe('investigations handler', () => {
  beforeEach(() => {
    listInvestigationsPagedMock.mockReset();
    listInvestigationsPagedMock.mockResolvedValue({
      items: [validInvestigation],
      page: 1,
      pageSize: 24,
      total: 1,
    });
  });

  it('200 with {items,page,pageSize,total} shape', async () => {
    const r = await handler(evt({}));
    expect(r).toMatchObject({ statusCode: 200 });
    const body = JSON.parse((r as { body: string }).body);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(24);
    expect(body.total).toBe(1);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].caseKey).toBe(validInvestigation._id);
    expect('signalIds' in body.items[0]).toBe(false);
  });

  it('passes family=F2 through to the repo', async () => {
    await handler(evt({ family: 'F2' }));
    expect(listInvestigationsPagedMock).toHaveBeenCalledWith(
      expect.objectContaining({ family: 'F2' }),
    );
  });

  it('passes priority=high through', async () => {
    await handler(evt({ priority: 'high' }));
    expect(listInvestigationsPagedMock).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'high' }),
    );
  });

  it('passes buyer=MINFIN through', async () => {
    await handler(evt({ buyer: 'MINFIN' }));
    expect(listInvestigationsPagedMock).toHaveBeenCalledWith(
      expect.objectContaining({ buyer: 'MINFIN' }),
    );
  });

  it('parses minValue/maxValue as numbers', async () => {
    await handler(evt({ minValue: '1000', maxValue: '5000' }));
    expect(listInvestigationsPagedMock).toHaveBeenCalledWith(
      expect.objectContaining({ minValue: 1000, maxValue: 5000 }),
    );
  });

  it('passes q through', async () => {
    await handler(evt({ q: 'test' }));
    expect(listInvestigationsPagedMock).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'test' }),
    );
  });

  it('passes page=2 through', async () => {
    await handler(evt({ page: '2' }));
    expect(listInvestigationsPagedMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 }),
    );
  });

  it('400 for a bad family param', async () => {
    const r = await handler(evt({ family: 'F9' }));
    expect(r).toMatchObject({ statusCode: 400 });
    expect(listInvestigationsPagedMock).not.toHaveBeenCalled();
  });
});
