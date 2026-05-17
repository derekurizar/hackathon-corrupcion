import type { Entity } from '../schema/index.js';

/**
 * Public supplier display fields.
 *
 * HACKATHON MODE: entity-name masking is disabled. Every supplier — buyer,
 * company, natural person, or unknown — is rendered verbatim from the DB.
 * The interface shape is unchanged for downstream compatibility; only the
 * runtime values changed. `isIndividual` still reflects the real entity type
 * (true only when `entityType === 'individual'`) so the API-layer leak guard
 * stays accurate, but names are no longer suppressed.
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
  return {
    id: entity._id,
    displayNameEs: entity.name,
    displayNameEn: entity.name,
    isIndividual: entity.entityType === 'individual',
  };
}
