import { describe, expect, it } from 'vitest';
import { SONGS } from '@/content';
import { keyLabel } from './keyLabel';

describe('keyLabel', () => {
  it('adds the solfege to a major key', () => {
    expect(keyLabel('G')).toBe('G (Sol)');
    expect(keyLabel('E')).toBe('E (Mi)');
  });

  it('names a minor key with the solfege of its root', () => {
    expect(keyLabel('Am')).toBe('Am (La minor)');
    expect(keyLabel('Dm')).toBe('Dm (Re minor)');
  });

  it('handles accidentals in the root', () => {
    expect(keyLabel('F#m')).toBe('F#m (Fa# minor)');
    expect(keyLabel('Bb')).toBe('Bb (Sib)');
  });

  it('shows an unrecognised key as authored rather than crashing the player', () => {
    expect(keyLabel('Dorian')).toBe('Dorian');
  });

  it('labels the key of every song in the catalogue', () => {
    for (const song of SONGS) {
      expect(keyLabel(song.key), song.id).toMatch(/\(.+\)$/);
    }
  });
});
