import { describe, it, expect } from 'vitest';
// IMPORTANT (purity): Area 03 types are imported via the PACKAGE specifier
// 'backend', NEVER a relative schema path under the backend source tree. The
// purity grep intentionally does not match the package specifier below.
import type { Investigation, Signal } from 'backend';
import type { ScenePlan, SceneSignal, SceneEvidenceItem } from './types.js';

// Type-level assignability assertions — these only compile if the
// scene-contract view-types are structurally compatible with Area 03.
// `_X extends Y ? true : never` makes a mismatch a hard compile error
// (`true` not assignable to `never`).

// Area 06 ScenePlan ⊆ Area 03's permissive `Investigation['scenePlan']`.
type _ScenePlanCompat = ScenePlan extends Investigation['scenePlan']
  ? true
  : never;
const _scenePlanCompat: _ScenePlanCompat = true;

// Area 03 Signal ⊆ scene-contract SceneSignal (every field SceneSignal needs
// exists on Signal with a compatible type, incl. optional `comparison`).
type _SignalCompat = Signal extends SceneSignal ? true : never;
const _signalCompat: _SignalCompat = true;

// Area 03 evidence item ⊆ SceneEvidenceItem.
type _EvidenceCompat = Signal['evidence'][number] extends SceneEvidenceItem
  ? true
  : never;
const _evidenceCompat: _EvidenceCompat = true;

// NOTE: a whole-`Investigation` ⊆ `SceneInvestigation` assertion is
// deliberately NOT made: Area 03 left `Investigation.evidence` permissive as
// `unknown[]` (it owns persistence; Area 05/07 tighten it). `unknown[]` is not
// assignable to `SceneEvidenceItem[]`, which is expected and correct — the
// scene-contract validator receives already-typed evidence from Area 07, not
// the raw persisted `unknown[]`.

describe('scene-plan ↔ Area 03 type compatibility', () => {
  it('compiles the type-level assignability assertions', () => {
    expect(_scenePlanCompat).toBe(true);
    expect(_signalCompat).toBe(true);
    expect(_evidenceCompat).toBe(true);
  });
});
