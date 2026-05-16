import type { Entity } from '../schema/index.js';

/**
 * Public, anonymization-safe supplier display fields (idea/00 §"Individual
 * supplier anonymization", idea/04 §"Anonymization boundary").
 *
 * Buyers and company suppliers are named verbatim. Natural-person suppliers
 * (`entityType` = individual) and `unknown` (treated as individual for
 * privacy) are rendered ONLY as "an individual supplier" / "un proveedor
 * individual". The raw name and canonical id never reach `investigations`.
 */
export interface AnonymizedSupplier {
  id: string;
  displayNameEs: string;
  displayNameEn: string;
  isIndividual: boolean;
}

export function anonymizeSupplier(
  entity: Pick<Entity, '_id' | 'name' | 'entityType'>,
): AnonymizedSupplier {
  if (entity.entityType === 'individual' || entity.entityType === 'unknown') {
    return {
      id: entity._id,
      displayNameEs: 'un proveedor individual',
      displayNameEn: 'an individual supplier',
      isIndividual: true,
    };
  }
  return {
    id: entity._id,
    displayNameEs: entity.name,
    displayNameEn: entity.name,
    isIndividual: false,
  };
}
