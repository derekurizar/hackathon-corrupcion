import type { Chapter, SceneSignal, SceneEvidenceItem, SceneInvestigation } from './types.js';
import { flattenCaseEvidence } from './refs.js';
import { formatBenchmark } from './benchmark.js';
import { humanField } from './fieldLabels.js';

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

/** True for evidence fields whose value is a monetary amount. */
function isMonetaryField(field: string): boolean {
  return /amount/i.test(field) || /value\.amount/i.test(field);
}

/**
 * Formats a monetary amount as es-GT currency for narration prose. Never
 * throws: a failed currency format degrades to the raw stringified number.
 */
function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: currency || 'GTQ',
      maximumFractionDigits: 0,
    }).format(Number(amount));
  } catch {
    return String(amount);
  }
}

/**
 * Renders one evidence item as a human-readable `"<label>: <value>"` fact for
 * the elCaso fallback. Never throws: undefined values degrade to "—", and a
 * failed currency format degrades to the raw stringified number.
 */
export function formatFact(e: SceneEvidenceItem, currency: string): string {
  const label = humanField(e.field);
  let valueText: string;
  if (e.value == null) {
    valueText = '—';
  } else if (typeof e.value === 'number' && isMonetaryField(e.field)) {
    try {
      valueText = new Intl.NumberFormat('es-GT', {
        style: 'currency',
        currency: currency || 'GTQ',
        maximumFractionDigits: 0,
      }).format(Number(e.value));
    } catch {
      valueText = String(e.value);
    }
  } else {
    valueText = String(e.value);
  }
  return `${label}: ${valueText}`;
}

/**
 * Builds a sober one-line Spanish caption for an evidence row: the humanized
 * `"<label>: <value>"` fact, plus what made it a review signal (the
 * `comparison`) and the comparable reference (the collapsed `benchmark`).
 * Never throws — degrades to the bare fact. Used by the `evidencia` fallback
 * so the ledger narrates even when the LLM path is not taken.
 */
export function formatEvidenceCaption(e: SceneEvidenceItem, currency: string): string {
  const parts = [`${formatFact(e, currency)}.`];
  if (typeof e.comparison === 'string' && e.comparison.trim().length > 0) {
    parts.push(`Señal de revisión: ${e.comparison.trim()}.`);
  }
  if (e.benchmark !== undefined) {
    const bench = formatBenchmark(e.benchmark);
    if (bench !== undefined && bench !== null && String(bench).trim().length > 0) {
      parts.push(`Referencia comparable: ${String(bench).trim()}.`);
    }
  }
  return parts.join(' ');
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
        text: formatFact(e, investigation.currency),
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
      const formattedTotal = formatMoney(amount, investigation.currency);
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
        narration:
          `${investigation.buyer.name} adjudicó ${formattedTotal} en el período ` +
          `analizado. La distribución muestra la concentración del gasto entre ` +
          `los proveedores identificados con señales de revisión.`,
      };
    }

    case 'lasConexiones': {
      const concAmount =
        investigation.totalValue > 0 ? investigation.totalValue : firstNumber(flat);
      const formattedTotal = formatMoney(concAmount, investigation.currency);
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
        narration:
          `Las adjudicaciones de ${investigation.buyer.name} se concentran en ` +
          `${investigation.supplier.displayNameEs}. Este proveedor representa una ` +
          `proporción significativa del gasto total revisado (${formattedTotal}).`,
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
        itemCaptions:
          flat.length > 0
            ? flat.map((e) => formatEvidenceCaption(e, investigation.currency))
            : [PLACEHOLDER_ES],
        order: 'original',
        narration:
          `Se detectaron ${flat.length > 0 ? flat.length : 'varias'} señales de ` +
          `revisión en los contratos entre ${investigation.buyer.name} y ` +
          `${investigation.supplier.displayNameEs}. Los valores y patrones ` +
          `identificados se presentan a continuación para su revisión editorial.`,
      };
    }

    case 'cronologia': {
      return {
        events: [{ date: '', kind: 'award', label: 'Adjudicación' }],
        missingStages: ['published', 'tenderClose', 'contractSigned'],
        highlightIdx: 0,
        caption: PLACEHOLDER_ES,
        narration:
          `Cronología de los procesos de contratación entre ` +
          `${investigation.buyer.name} y ${investigation.supplier.displayNameEs}. ` +
          `Se destacan las etapas con datos disponibles y las ausentes.`,
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
