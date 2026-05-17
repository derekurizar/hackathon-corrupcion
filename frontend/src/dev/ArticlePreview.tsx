import { useSearchParams } from 'react-router-dom';
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
import { caseSplitParams } from '@/article/scenes/__fixtures__/caseSplit';
import { priceBarsParams } from '@/article/scenes/__fixtures__/priceBars';
import { thresholdLadderParams } from '@/article/scenes/__fixtures__/thresholdLadder';
import { splittingClusterParams } from '@/article/scenes/__fixtures__/splittingCluster';
import { repeatBiddersParams } from '@/article/scenes/__fixtures__/repeatBidders';
import { evidenceCompareParams } from '@/article/scenes/__fixtures__/evidenceCompare';
import { gapSpotlightParams } from '@/article/scenes/__fixtures__/gapSpotlight';
import { regionMapParams } from '@/article/scenes/__fixtures__/regionMap';

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

/**
 * The 8 variant scenes, each at its synced chapter. Reachable via
 * `/dev/article?variants=1` so the variant catalog can be verified in a real
 * browser alongside (not replacing) the core 7-chapter preview.
 */
const VARIANT_PLAN: { chapter: Chapter; sceneId: string; params: unknown }[] = [
  { chapter: 'elCaso', sceneId: 'CaseSplit', params: caseSplitParams },
  { chapter: 'sigueElDinero', sceneId: 'PriceBars', params: priceBarsParams },
  {
    chapter: 'sigueElDinero',
    sceneId: 'ThresholdLadder',
    params: thresholdLadderParams,
  },
  { chapter: 'sigueElDinero', sceneId: 'RegionMap', params: regionMapParams },
  {
    chapter: 'lasConexiones',
    sceneId: 'SplittingCluster',
    params: splittingClusterParams,
  },
  {
    chapter: 'lasConexiones',
    sceneId: 'RepeatBidders',
    params: repeatBiddersParams,
  },
  {
    chapter: 'evidencia',
    sceneId: 'EvidenceCompare',
    params: evidenceCompareParams,
  },
  {
    chapter: 'cronologia',
    sceneId: 'GapSpotlight',
    params: gapSpotlightParams,
  },
];

export default function ArticlePreview() {
  const [search] = useSearchParams();
  const showVariants = search.get('variants') === '1';

  if (showVariants) {
    return (
      <div className="h-full overflow-y-auto">
        <article>
          {VARIANT_PLAN.map((v, i) => (
            <ChapterSlot
              key={v.sceneId}
              chapter={v.chapter}
              index={i + 1}
              planEntry={{ sceneId: v.sceneId, params: v.params }}
              investigation={PREVIEW_INVESTIGATION}
            />
          ))}
        </article>
      </div>
    );
  }

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
