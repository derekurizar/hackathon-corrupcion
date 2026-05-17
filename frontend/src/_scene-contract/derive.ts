import type { Chapter, SceneSignal, SceneEvidenceItem, SceneInvestigation } from './types.js';
import { flattenCaseEvidence } from './refs.js';
import { formatBenchmark } from './benchmark.js';

/**
 * The mandatory non-empty caveat (idea/05 validator rule 5). Fixed,
 * privacy-safe wording — never says "corruption/fraud/illegal".
 */
export const FIXED_CAVEAT = 'Estas son señales de revisión, no conclusiones de ilegalidad.';

const PLACEHOLDER_ES = 'Datos públicos en revisión.';

function firstNumber(items: SceneEvidenceItem[]): number {
  for (const e of items) {
    if (typeof e.value === 'number' && Number.isFinite(e.value)) return e.value;
  }
  return 0;
}

/**
 * Builds the default scene's params for `chapter`, purely from
 * signals/evidence/investigation (no LLM). NEVER throws — missing data
 * degrades to `[]` / `0` / placeholder Spanish text. The output is always a
 * schema-valid params object for `defaultScene(chapter)`.
 *
 * Note: derived params intentionally carry NO `ref`s, so feeding a derived
 * entry back through `validateScenePlan` deliberately falls back (rule 3) —
 * this is the safety net: the article always renders from derived data.
 */
export function deriveFromEvidence(
  chapter: Chapter,
  signals: SceneSignal[],
  evidence: SceneEvidenceItem[],
  investigation: SceneInvestigation,
): Record<string, unknown> {
  const flat = flattenCaseEvidence(signals, evidence);

  switch (chapter) {
    case 'cover': {
      return {
        kicker: 'Compras públicas',
        headline: `${investigation.buyer.name} — señales de revisión`,
        dek: PLACEHOLDER_ES,
        bgVariant: 'duotone',
        heroStat: {
          label: 'Valor total',
          value: investigation.totalValue,
          unit: investigation.currency,
          ref: '',
        },
        buyer: investigation.buyer.name,
        supplierDisplay: investigation.supplier.displayNameEs,
        reviewPriority: investigation.reviewPriority,
        intro:
          'Este expediente contiene señales estadísticas que merecen revisión ' +
          'editorial. Los patrones identificados en los contratos analizados ' +
          'presentan características inusuales respecto al universo comparable.',
      };
    }

    case 'elCaso': {
      const facts = flat.slice(0, 3).map((e) => ({
        text: `${e.field}: ${String(e.value)}`,
      }));
      return {
        lead: `${investigation.buyer.name}: ${PLACEHOLDER_ES}`,
        pullStat: {
          value: investigation.totalValue,
          label: 'Valor total revisado',
          ref: '',
        },
        facts: facts.length > 0 ? facts : [{ text: PLACEHOLDER_ES }],
      };
    }

    case 'sigueElDinero': {
      const amount = investigation.totalValue > 0 ? investigation.totalValue : firstNumber(flat);
      return {
        buyer: investigation.buyer.name,
        totalValue: investigation.totalValue,
        totalRef: '',
        streams: [
          {
            supplierId: investigation.supplier.id,
            supplierDisplay: investigation.supplier.displayNameEs,
            amount,
            amountRef: '',
            share: 1,
            shareRef: '',
          },
        ],
        emphasisSupplierId: investigation.supplier.id,
        caption: PLACEHOLDER_ES,
        narration: 'Distribución del valor total de contratos por proveedor.',
      };
    }

    case 'lasConexiones': {
      return {
        buyer: investigation.buyer.name,
        topShare: 1,
        topShareRef: '',
        suppliers: [
          {
            supplierId: investigation.supplier.id,
            supplierDisplay: investigation.supplier.displayNameEs,
            value: investigation.totalValue > 0 ? investigation.totalValue : firstNumber(flat),
            valueRef: '',
            share: 1,
            shareRef: '',
            flagged: true,
          },
        ],
        caption: PLACEHOLDER_ES,
        narration: 'Concentración de adjudicaciones para el comprador.',
      };
    }

    case 'evidencia': {
      const items =
        flat.length > 0
          ? flat.map((e) => {
              const item: Record<string, unknown> = {
                field: e.field,
                value: e.value,
              };
              if (e.benchmark !== undefined)
                item['benchmark'] = formatBenchmark(e.benchmark);
              if (e.comparison !== undefined) item['comparison'] = e.comparison;
              return item;
            })
          : [{ field: 'sinDato', value: PLACEHOLDER_ES }];
      return {
        items,
        itemCaptions: items.map(() => PLACEHOLDER_ES),
        order: 'original',
        narration: 'Señales de revisión detectadas en este expediente.',
      };
    }

    case 'cronologia': {
      return {
        events: [{ date: '', kind: 'award', label: 'Adjudicación' }],
        missingStages: ['published', 'tenderClose', 'contractSigned'],
        highlightIdx: 0,
        caption: PLACEHOLDER_ES,
        narration: 'Cronología de hitos del proceso de contratación.',
      };
    }

    case 'cierre': {
      return {
        whatItMeans: PLACEHOLDER_ES,
        caveat: FIXED_CAVEAT,
        ctas: ['methodology', 'listen', 'share'],
        conclusions: [
          'Las señales detectadas sugieren patrones que ameritan revisión ' +
            'periodística adicional.',
        ],
      };
    }
  }
}
