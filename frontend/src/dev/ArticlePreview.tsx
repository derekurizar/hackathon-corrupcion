import type { InvestigationFull } from '@/api/schemas';
import { ChapterSlot } from '@/article/ChapterSlot';
import type { Chapter } from '@/_scene-contract';
import { coverHeadlineParams } from '@/article/scenes/__fixtures__/coverHeadline';
import { caseStatementParams } from '@/article/scenes/__fixtures__/caseStatement';
import { moneyFlowStreamsParams } from '@/article/scenes/__fixtures__/moneyFlowStreams';
import { concentrationFanParams } from '@/article/scenes/__fixtures__/concentrationFan';
import { evidenceLedgerParams } from '@/article/scenes/__fixtures__/evidenceLedger';
import { awardTimelineParams } from '@/article/scenes/__fixtures__/awardTimeline';
import { closingStatementParams } from '@/article/scenes/__fixtures__/closingStatement';

/**
 * DEV-ONLY visual harness for the cinematic article. Renders the full
 * 7-chapter spine with schema-valid fixture data so the scenes can be
 * verified in a real browser without a live API. Code-split + gated by
 * `import.meta.env.DEV` in App.tsx — never ships to prod.
 */
const PREVIEW_INVESTIGATION = {
  caseKey: 'GT-2024-001',
  buyer: { id: 'GT-NIT:4132726', name: 'Ministerio de Salud Pública' },
  supplier: {
    displayNameEs: 'Proveedor anónimo A',
    displayNameEn: 'Anonymous supplier A',
    isIndividual: false,
    id: 'sup-1',
  },
  signalFamily: 'F2',
  reviewPriority: 'high',
  totalValue: 3_200_000,
  currency: 'GTQ',
  timeWindow: '2023-2024',
  headline: { kicker: 'EL CASO', headline: 'Titular', dek: 'Bajada' },
  ruleIds: ['supplier_concentration_per_buyer'],
  story: {},
  scenePlan: {},
  evidence: [
    { field: 'totalValue', value: 3_200_000 },
    { field: 'topShare', value: 0.82 },
  ],
  audio: undefined,
  podcastCuePoints: undefined,
  updatedAt: '2026-05-16T00:00:00Z',
} satisfies InvestigationFull;

const PLAN: Record<Chapter, { sceneId: string; params: unknown }> = {
  cover: { sceneId: 'CoverHeadline', params: coverHeadlineParams },
  elCaso: { sceneId: 'CaseStatement', params: caseStatementParams },
  sigueElDinero: {
    sceneId: 'MoneyFlowStreams',
    params: moneyFlowStreamsParams,
  },
  lasConexiones: {
    sceneId: 'ConcentrationFan',
    params: concentrationFanParams,
  },
  evidencia: { sceneId: 'EvidenceLedger', params: evidenceLedgerParams },
  cronologia: { sceneId: 'AwardTimeline', params: awardTimelineParams },
  cierre: { sceneId: 'ClosingStatement', params: closingStatementParams },
};

const CHAPTERS: Chapter[] = [
  'cover',
  'elCaso',
  'sigueElDinero',
  'lasConexiones',
  'evidencia',
  'cronologia',
  'cierre',
];

export default function ArticlePreview() {
  return (
    <div className="h-full overflow-y-auto">
      <article>
        {CHAPTERS.map((ch, i) => (
          <ChapterSlot
            key={ch}
            chapter={ch}
            index={i}
            planEntry={PLAN[ch]}
            investigation={PREVIEW_INVESTIGATION}
          />
        ))}
      </article>
    </div>
  );
}
