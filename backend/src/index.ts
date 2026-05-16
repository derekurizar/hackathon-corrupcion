export * from './ocds/index.js';
export * from './schema/index.js';
export * from './config/env.js';
export * from './db/client.js';
export * from './db/collections.js';
export * from './db/ensure-indexes.js';
export * from './stages/index.js';
export * from './repositories/index.js';
export * from './detection/index.js';
export * from './identity/index.js';
export * from './scene-contract/index.js';
export { moduleLogger, resolveLogDir, resolveLogLevel } from './obs/logger.js';
// Area 09 public API DTO contract types (curated, not `*` — schemas stay internal).
export type {
  InvestigationListItem,
  InvestigationFull,
  StatsDTO,
  EditionDTO,
  FiltersDTO,
  SupplierPublic,
} from './api/dto.js';
// `ScenePlanEntry` is exported by both './schema' (Area 03 persistence shape)
// and './scene-contract' (Area 06 contract shape). They are structurally
// identical (`{ sceneId; params; source }`). Disambiguate the wildcard
// collision by pinning the package surface to Area 03's established type
// (Area 03's persistence schema must NOT be tightened — see Area 06 plan).
export type { ScenePlanEntry } from './schema/index.js';
