import type { PipelineRun } from './pipeline-runs.js';

export const validPipelineRun: PipelineRun = {
  _id: 'run-2026-02-15T00:00:00.000Z',
  startedAt: '2026-02-15T00:00:00.000Z',
  finishedAt: '2026-02-15T00:30:00.000Z',
  monthsRequested: [
    { year: 2026, month: 1 },
    { year: 2026, month: 2 },
  ],
  toggles: { ingest: true, benchmarks: true, detection: true, story: false },
  stages: {
    ingest: 'done',
    benchmarks: 'done',
    detection: 'done',
    story: 'pending',
    audio: 'pending',
    publish: 'pending',
  },
  counts: { recordsIngested: 12000, signals: 340, investigations: 87 },
  errors: [],
};
