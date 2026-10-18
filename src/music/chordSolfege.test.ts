import { describe, expect, it } from 'vitest';
import { chordSolfegeName, type ChordQuality, type ChordShape } from './chords';

/** Only name/root/quality matter to chordSolfegeName; the rest is filler. */
function shape(name: string, root: number, quality: ChordQuality): ChordShape {
  return {
    id: name,
    name,
    root,
    quality,
    baseFret: 1,
    frets: [null, null, null, null, null, null],
    fingers: [null, null, null, null, null, null],
    difficulty: 1,
  };
}

describe('chordSolfegeName', () => {
  it('names a minor chord', () => {
    expect(chordSolfegeName(shape('Am', 9, 'min'))).toBe('La minor');
  });

  it('names a major chord', () => {
    expect(chordSolfegeName(shape('G', 7, 'maj'))).toBe('Sol major');
  });

  it('uses the long quality label', () => {
    expect(chordSolfegeName(shape('E7', 4, 'dom7'))).toBe('Mi dominant seventh');
    expect(chordSolfegeName(shape('Fmaj7', 5, 'maj7'))).toBe('Fa major seventh');
    expect(chordSolfegeName(shape('E5', 4, 'power'))).toBe('Mi power chord');
  });

  it('gives a flat-named chord the flat solfege', () => {
    expect(chordSolfegeName(shape('Bb', 10, 'maj'))).toBe('Sib major');
    expect(chordSolfegeName(shape('Ebm', 3, 'min'))).toBe('Mib minor');
  });

  it('gives a sharp-named chord the sharp solfege', () => {
    expect(chordSolfegeName(shape('F#m', 6, 'min'))).toBe('Fa# minor');
  });

  it('is not fooled by a lowercase b elsewhere in the name', () => {
    // "B" is the root; nothing here is flat.
    expect(chordSolfegeName(shape('Bdim', 11, 'dim'))).toBe('Si diminished');
    expect(chordSolfegeName(shape('Bm', 11, 'min'))).toBe('Si minor');
  });
});
