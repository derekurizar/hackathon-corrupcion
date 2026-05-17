/**
 * Maps known OCDS/detection evidence field names to human-readable Spanish
 * labels. Used by deriveFromEvidence (elCaso fallback) and optionally by the
 * EvidenceLedger display.
 *
 * IMPORTANT: This module MUST stay import-free. It is verbatim-copied into the
 * isolated frontend project by `pnpm --dir backend run sync:scene-contract`,
 * so it must be pure, copy-portable TypeScript with zero imports.
 *
 * The keys below are the exhaustive set of `field` strings emitted in evidence
 * items across all 23 detection rules in backend/src/detection/rules/.
 */
export const FIELD_LABELS: Record<string, string> = {
  'awards[].value.amount': 'Valor adjudicado',
  'awards[].date': 'Fecha de adjudicación',
  'awards[].status': 'Estado de la adjudicación',
  'awards[].supplierIds': 'Proveedor adjudicado',
  'bids[].amount': 'Monto de la oferta',
  'bids[].status': 'Estado de la oferta',
  'bids[].tendererId': 'Oferente',
  'buyer.id': 'Entidad compradora',
  'entities.entityType': 'Tipo de proveedor',
  'tender.datePublished': 'Fecha de publicación',
  'tender.documentsSummary.count': 'Documentos publicados',
  'tender.numberOfTenderers': 'Número de oferentes',
  'tender.procurementMethodDetails': 'Método de contratación',
  'tender.statusDetails': 'Estado del proceso',
  'tender.tenderPeriod.endDate': 'Cierre de recepción de ofertas',
};

/**
 * Returns a human-readable Spanish label for an evidence field name. When the
 * field is unknown, falls back to sanitizing the raw name: strips the leading
 * object prefix (e.g. `tender.`, `awards[].`) and splits camelCase into
 * Title Case words. Never throws.
 */
export function humanField(field: string): string {
  if (typeof field !== 'string' || field.length === 0) return '—';
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  // Sanitize fallback: strip a leading "prefix." or "prefix[]." segment
  // (e.g. "tender.", "award.", "awards[].", "buyer.", "bids[].").
  let s = field.replace(/^[a-z]+(?:\[\])?\./, '');
  // camelCase → words
  s = s.replace(/([a-z])([A-Z])/g, '$1 $2');
  if (s.length === 0) return field;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
