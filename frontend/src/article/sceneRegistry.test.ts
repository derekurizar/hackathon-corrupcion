import { describe, expect, it } from 'vitest';
import { CORE_SCENE_IDS, defaultScene } from '@/_scene-contract';
import type { Chapter } from '@/_scene-contract';
import { sceneRegistry } from './sceneRegistry';

const CHAPTERS: Chapter[] = [
  'cover',
  'elCaso',
  'sigueElDinero',
  'lasConexiones',
  'evidencia',
  'cronologia',
  'cierre',
];

describe('sceneRegistry', () => {
  it("registers every chapter's guaranteed default scene", () => {
    for (const ch of CHAPTERS) {
      const id = defaultScene(ch);
      expect(sceneRegistry[id], `default scene for "${ch}" (${id})`).toBeDefined();
    }
  });

  it('registers every CORE_SCENE_IDS entry', () => {
    for (const id of CORE_SCENE_IDS) {
      expect(sceneRegistry[id], `core scene ${id}`).toBeDefined();
    }
  });
});
