import { describe, it, expect } from 'vitest';
import { audioKey } from './audio.js';

describe('audioKey (idea/04 versioned S3 key)', () => {
  it('formats audio/<caseKey>/<version>/<lang>.mp3', () => {
    expect(audioKey('abc123', 1, 'es')).toBe('audio/abc123/1/es.mp3');
    expect(audioKey('abc123', 2, 'en')).toBe('audio/abc123/2/en.mp3');
  });

  it('version bump produces a distinct key (old links never break)', () => {
    expect(audioKey('ck', 1, 'es')).not.toBe(audioKey('ck', 2, 'es'));
  });
});
