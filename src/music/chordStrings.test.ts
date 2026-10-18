import { describe, expect, it } from 'vitest';
import { chordStrings, chordVoicing, type ChordShape } from './chords';
import { fretToMidi } from './fretboard';
import { STANDARD_TUNING } from './tuning';

const eMajorOpen: ChordShape = {
  id: 'E-open',
  name: 'E',
  root: 4,
  quality: 'maj',
  baseFret: 1,
  frets: [0, 2, 2, 1, 0, 0],
  fingers: [null, 2, 3, 1, null, null],
  difficulty: 1,
};

const aMinorOpen: ChordShape = {
  id: 'Am-open',
  name: 'Am',
  root: 9,
  quality: 'min',
  baseFret: 1,
  frets: [null, 0, 2, 2, 1, 0],
  fingers: [null, null, 2, 3, 1, null],
  difficulty: 1,
};

const dMajorOpen: ChordShape = {
  id: 'D-open',
  name: 'D',
  root: 2,
  quality: 'maj',
  baseFret: 1,
  frets: [null, null, 0, 2, 3, 2],
  fingers: [null, null, null, 1, 3, 2],
  difficulty: 1,
};

describe('chordStrings', () => {
  it('lists every string of a chord that rings all six', () => {
    expect(chordStrings(eMajorOpen)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('skips the muted strings, low to high', () => {
    expect(chordStrings(aMinorOpen)).toEqual([1, 2, 3, 4, 5]);
    expect(chordStrings(dMajorOpen)).toEqual([2, 3, 4, 5]);
  });

  it('counts an open string as sounding', () => {
    expect(chordStrings(aMinorOpen)).toContain(1);
  });

  // chordVoicing and chordStrings are zipped when a chord is strummed, so a
  // drift between them would put a note on the wrong string.
  it('names the string of each pitch chordVoicing returns, in order', () => {
    for (const shape of [eMajorOpen, aMinorOpen, dMajorOpen]) {
      const strings = chordStrings(shape);
      const voicing = chordVoicing(shape, STANDARD_TUNING);
      expect(strings).toHaveLength(voicing.length);
      strings.forEach((stringIndex, i) => {
        const fret = shape.frets[stringIndex];
        expect(fret, `${shape.id} string ${stringIndex}`).not.toBeNull();
        expect(fretToMidi(STANDARD_TUNING, stringIndex, fret as number)).toBe(voicing[i]);
      });
    }
  });
});
