/**
 * Procurement-method classification helpers. `procurementMethodDetails` is a
 * free-ish Spanish label (13 observed variants, schema report §"Low-cardinality
 * value sets"); benchmarks key on it verbatim. These predicates classify a
 * label into the buckets the rules reason about — no thresholds here, only
 * the legal-method taxonomy.
 */

/** "Compra Directa" / Art. 43 family (94.5% of the corpus). */
export function isDirectMethod(method: string): boolean {
  const m = method.toLowerCase();
  return m.includes('compra directa') || m.includes('art. 43') || m.includes('art.43');
}

/**
 * Non-competitive exception methods (Art. 43/44/54 set, idea/03 Rule 4):
 * direct purchase, casos de excepción (Art. 44), Art. 54, single-provider,
 * absence-of-offer direct acquisition.
 */
export function isNoncompetitiveMethod(method: string): boolean {
  const m = method.toLowerCase();
  return (
    isDirectMethod(method) ||
    m.includes('art. 44') ||
    m.includes('art.44') ||
    m.includes('art. 54') ||
    m.includes('art.54') ||
    m.includes('proveedor único') ||
    m.includes('ausencia de oferta')
  );
}
