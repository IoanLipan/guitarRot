import { describe, expect, it } from 'vitest';
import {
  chordPitchClasses,
  chordVoicing,
  expectedPitchClasses,
  validateChordShape,
  type ChordShape,
} from './chords';
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

const brokenChord: ChordShape = {
  id: 'broken',
  name: 'C',
  root: 0,
  quality: 'maj',
  baseFret: 1,
  frets: [null, 3, 2, 0, 1, 1],
  fingers: [null, 3, 2, null, 1, 1],
  difficulty: 1,
};

describe('expectedPitchClasses', () => {
  it('spells E major', () => {
    expect(expectedPitchClasses(4, 'maj')).toEqual([4, 8, 11]);
  });

  it('spells A minor', () => {
    expect(expectedPitchClasses(9, 'min')).toEqual([0, 4, 9]);
  });

  it('spells a power chord with only root and fifth', () => {
    expect(expectedPitchClasses(4, 'power')).toEqual([4, 11]);
  });
});

describe('chordVoicing', () => {
  it('skips muted strings and returns pitches low to high', () => {
    const voicing = chordVoicing(aMinorOpen, STANDARD_TUNING);
    expect(voicing).toEqual([45, 52, 57, 60, 64]);
  });

  it('returns all six strings for a shape with none muted', () => {
    expect(chordVoicing(eMajorOpen, STANDARD_TUNING)).toHaveLength(6);
  });
});

describe('chordPitchClasses', () => {
  it('returns each pitch class once, sorted', () => {
    expect(chordPitchClasses(eMajorOpen, STANDARD_TUNING)).toEqual([4, 8, 11]);
  });
});

describe('validateChordShape', () => {
  it('accepts a correct open E', () => {
    expect(validateChordShape(eMajorOpen, STANDARD_TUNING)).toEqual([]);
  });

  it('accepts a correct open Am', () => {
    expect(validateChordShape(aMinorOpen, STANDARD_TUNING)).toEqual([]);
  });

  it('rejects a shape whose notes do not match its declared name', () => {
    const errors = validateChordShape(brokenChord, STANDARD_TUNING);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join(' ')).toContain('pitch classes');
  });

  it('rejects a fret array of the wrong length', () => {
    const short = { ...eMajorOpen, frets: [0, 2, 2] } as unknown as ChordShape;
    expect(validateChordShape(short, STANDARD_TUNING).join(' ')).toContain('6 entries');
  });

  it('rejects a finger number on a muted string', () => {
    const bad: ChordShape = {
      ...aMinorOpen,
      fingers: [1, null, 2, 3, 1, null],
    };
    expect(validateChordShape(bad, STANDARD_TUNING).join(' ')).toContain('muted');
  });

  it('rejects a shape with no sounding strings', () => {
    const silent: ChordShape = {
      ...eMajorOpen,
      frets: [null, null, null, null, null, null],
      fingers: [null, null, null, null, null, null],
    };
    expect(validateChordShape(silent, STANDARD_TUNING).join(' ')).toContain('no sounding');
  });
});
