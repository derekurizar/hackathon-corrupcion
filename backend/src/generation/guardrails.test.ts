import { describe, it, expect, vi } from 'vitest';

// buildUserBlock now resolves the digest config lazily via loadConfig (which
// throws without env). Mock it for hermetic unit tests, like rank.test.ts.
vi.mock('../config/env.js', () => ({
  loadConfig: () => ({
    MAX_INVESTIGATIONS_PER_RUN: 20,
    EVIDENCE_SAMPLE_PER_RULE: 6,
    MAX_REPRESENTATIVE_EVIDENCE: 60,
  }),
}));

import { checkGuardrails, generateStoryGuarded } from './guardrails.js';
import { BANNED_PHRASES } from './prompt.js';
import type { ClaudeClient, ClaudeStoryRaw } from './claude.js';
import type { Signal } from '../schema/index.js';
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
    const r = checkGuardrails(story(), bundle(), 'CONSTRUCTORA S.A.', 'company', BANNED_PHRASES);
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
    const r = checkGuardrails(s, bundle(), 'PEREZ,LOPEZ,,JUAN,', 'individual', BANNED_PHRASES);
    expect(r.ok).toBe(false);
  });

  it('keyFinding maps to FULL bundle.evidence, not the prompt sample', () => {
    // 30 signals → 30 evidence items; a distinctive value sits deep in the
    // array, far outside any small representative sample the prompt would
    // show. Guardrails must still trace it because they read full evidence.
    const signals: Signal[] = Array.from({ length: 30 }, (_, i) => ({
      _id: `s${i}`,
      ocid: `ocds-${String(i).padStart(3, '0')}`,
      caseKey: 'CKbig',
      rule_id: 'single_bidder',
      family: 'F1' as const,
      severity: 'low' as const,
      confidence: 0.3,
      primaryEntityId: 'GT-NIT:1',
      secondaryEntityIds: ['GT-NIT:sup'],
      timeWindow: 'scope:2026-01..2026-01',
      title: 't',
      explanation: 'e',
      story_angle: 'a',
      evidence: [{ field: 'awards[].value.amount', value: i === 27 ? 777777 : 1000 }],
    }));
    const big: CaseBundle = {
      caseKey: 'CKbig',
      buyer: { id: 'GT-NIT:1', name: 'Ministerio X' },
      family: 'F1',
      scope: 'scope:2026-01..2026-01',
      signals,
      evidence: signals.flatMap((s) => s.evidence),
      entities: { supplierIds: ['GT-NIT:sup'] },
      firedRuleIds: ['single_bidder'],
      isLead: false,
    };
    const s = story();
    s.es.keyFindings = ['awards[].value.amount 777777'];
    s.en.keyFindings = ['awards[].value.amount 777777'];
    const r = checkGuardrails(s, big, 'X', 'company', BANNED_PHRASES);
    expect(r.ok).toBe(true);
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
