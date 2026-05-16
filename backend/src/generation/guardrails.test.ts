import { describe, it, expect, vi } from 'vitest';
import { checkGuardrails, generateStoryGuarded } from './guardrails.js';
import { BANNED_PHRASES } from './prompt.js';
import type { ClaudeClient, ClaudeStoryRaw } from './claude.js';
import type { CaseBundle } from './rank.js';

function bundle(): CaseBundle {
  return {
    caseKey: 'CK1',
    buyer: { id: 'GT-NIT:1', name: 'Ministerio X' },
    family: 'F2',
    scope: 'scope:2026-01..2026-01',
    signals: [],
    evidence: [{ field: 'awardValue', value: 650000 }],
    entities: { supplierIds: ['GT-NIT:sup'] },
    firedRuleIds: ['supplier_concentration_per_buyer'],
    isLead: false,
  };
}

function story(over?: Partial<ClaudeStoryRaw>): ClaudeStoryRaw {
  const base: ClaudeStoryRaw = {
    es: {
      cover: { kicker: 'k', headline: 'h', dek: 'd' },
      elCaso: 'El caso describe 650000 en adjudicaciones.',
      sigueElDinero: 's',
      lasConexiones: 'c',
      cronologia: 't',
      cierre: { queSignificaYQueNo: 'q', caveat: 'caveat' },
      keyFindings: ['awardValue 650000'],
    },
    en: {
      cover: { kicker: 'k', headline: 'h', dek: 'd' },
      theCase: 'The case shows 650000 in awards.',
      followTheMoney: 's',
      theConnections: 'c',
      timeline: 't',
      closing: { whatItMeans: 'w', caveat: 'caveat' },
      keyFindings: ['awardValue 650000'],
    },
    podcast: {
      es: { script: 'guion es', cuePoints: [] },
      en: { script: 'script en', cuePoints: [] },
    },
    scenePlan: {},
  };
  return { ...base, ...over };
}

describe('checkGuardrails', () => {
  it('clean story → ok', () => {
    const r = checkGuardrails(
      story(),
      bundle(),
      'CONSTRUCTORA S.A.',
      'company',
      BANNED_PHRASES,
    );
    expect(r.ok).toBe(true);
  });

  it('banned phrase → fail', () => {
    const s = story();
    s.en.theCase = 'This is corruption in the ministry.';
    const r = checkGuardrails(s, bundle(), 'X', 'company', BANNED_PHRASES);
    expect(r.ok).toBe(false);
  });

  it('unbacked keyFinding → fail', () => {
    const s = story();
    s.es.keyFindings = ['totalmente inventado sin evidencia'];
    const r = checkGuardrails(s, bundle(), 'X', 'company', BANNED_PHRASES);
    expect(r.ok).toBe(false);
  });

  it('raw individual name leak → fail', () => {
    const s = story();
    s.es.elCaso = 'PEREZ,LOPEZ,,JUAN, recibió 650000.';
    const r = checkGuardrails(
      s,
      bundle(),
      'PEREZ,LOPEZ,,JUAN,',
      'individual',
      BANNED_PHRASES,
    );
    expect(r.ok).toBe(false);
  });
});

describe('generateStoryGuarded — never throws, retry-then-fallback', () => {
  it('clean stub → usedFallback:false, no retry', async () => {
    const gen = vi.fn(async () => story());
    const client: ClaudeClient = { generateStory: gen };
    const out = await generateStoryGuarded(
      client,
      bundle(),
      'un proveedor individual',
      'an individual supplier',
      'CONSTRUCTORA S.A.',
      'company',
    );
    expect(out.usedFallback).toBe(false);
    expect(out.story).not.toBeNull();
    expect(gen).toHaveBeenCalledTimes(1);
  });

  it('banned phrase every time → one retry then fallback (never throws)', async () => {
    const bad = story();
    bad.en.theCase = 'committed fraud';
    const gen = vi.fn(async () => bad);
    const client: ClaudeClient = { generateStory: gen };
    const out = await generateStoryGuarded(
      client,
      bundle(),
      'un proveedor individual',
      'an individual supplier',
      'X',
      'company',
    );
    expect(out.usedFallback).toBe(true);
    expect(out.story).toBeNull();
    expect(gen).toHaveBeenCalledTimes(2); // initial + one stricter retry
  });

  it('individual name leak every time → retry then fallback', async () => {
    const leak = story();
    leak.es.elCaso = 'PEREZ,LOPEZ,,JUAN, ganó el contrato';
    const gen = vi.fn(async () => leak);
    const client: ClaudeClient = { generateStory: gen };
    const out = await generateStoryGuarded(
      client,
      bundle(),
      'un proveedor individual',
      'an individual supplier',
      'PEREZ,LOPEZ,,JUAN,',
      'individual',
    );
    expect(out.usedFallback).toBe(true);
    expect(gen).toHaveBeenCalledTimes(2);
  });

  it('client throws every time → fallback, never throws', async () => {
    const gen = vi.fn(async () => {
      throw new Error('rate_limit');
    });
    const client: ClaudeClient = { generateStory: gen };
    const out = await generateStoryGuarded(
      client,
      bundle(),
      'un proveedor individual',
      'an individual supplier',
      'X',
      'company',
    );
    expect(out.usedFallback).toBe(true);
    expect(out.story).toBeNull();
  });
});
