import { describe, expect, it } from 'vitest';
import {
  chordPitchClasses,
  chordToneNames,
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

// IMPORTANT-1: validateChordShape must report out-of-range or non-integer
// frets rather than crash. fretToMidi throws for exactly these inputs, so
// the validator has to catch and report them before calling chordVoicing.
describe('validateChordShape fret-range safety', () => {
  it('reports a too-high fret without throwing', () => {
    const bad: ChordShape = { ...eMajorOpen, id: 'fret-25', frets: [25, 2, 2, 1, 0, 0] };
    let errors: string[] = [];
    expect(() => {
      errors = validateChordShape(bad, STANDARD_TUNING);
    }).not.toThrow();
    expect(errors.length).toBeGreaterThan(0);
  });

  it('reports a fret of -1 (a common "muted" convention in other datasets) without throwing', () => {
    const bad: ChordShape = { ...eMajorOpen, id: 'fret-neg1', frets: [-1, 2, 2, 1, 0, 0] };
    let errors: string[] = [];
    expect(() => {
      errors = validateChordShape(bad, STANDARD_TUNING);
    }).not.toThrow();
    expect(errors.length).toBeGreaterThan(0);
  });

  it('reports a non-integer fret without throwing', () => {
    const bad: ChordShape = { ...eMajorOpen, id: 'fret-2.5', frets: [2.5, 2, 2, 1, 0, 0] };
    let errors: string[] = [];
    expect(() => {
      errors = validateChordShape(bad, STANDARD_TUNING);
    }).not.toThrow();
    expect(errors.length).toBeGreaterThan(0);
  });
});

// IMPORTANT-2: a shape's declared `name` must actually spell its `root`.
// The reverse slip (name updated, root forgotten) is already caught by the
// pitch-class check; this covers the slip in the other direction.
describe('validateChordShape name-matches-root check', () => {
  it('accepts a name that correctly spells its root', () => {
    expect(validateChordShape(eMajorOpen, STANDARD_TUNING)).toEqual([]);
  });

  it('rejects a name that does not spell its declared root', () => {
    const wrongName: ChordShape = { ...eMajorOpen, id: 'wrong-name', name: 'A' };
    expect(validateChordShape(wrongName, STANDARD_TUNING).join(' ')).toContain('valid spelling');
  });

  it('accepts an enharmonic spelling of the root (Db for C#)', () => {
    const dbMinor: ChordShape = {
      id: 'dbm-test',
      name: 'Dbm',
      root: 1,
      quality: 'min',
      baseFret: 4,
      frets: [0, 4, 6, null, null, null],
      fingers: [null, 1, 2, null, null, null],
      difficulty: 1,
    };
    expect(validateChordShape(dbMinor, STANDARD_TUNING)).toEqual([]);
  });
});

// MINOR-5: frets are absolute, so a baseFret inconsistent with the fretted
// notes renders a diagram box the learner cannot actually play from.
describe('validateChordShape baseFret box check', () => {
  it('rejects a baseFret that does not contain the shape\'s fretted notes', () => {
    const badBaseFret: ChordShape = { ...eMajorOpen, id: 'bad-basefret', baseFret: 9 };
    expect(validateChordShape(badBaseFret, STANDARD_TUNING).join(' ')).toContain('baseFret');
  });
});

// MINOR-6: barre string indices must be real 0-based indices, not 1-based
// guitar string numbers, or an out-of-range index is silently skipped.
describe('validateChordShape barre range check', () => {
  it('rejects a barre with an out-of-range string index', () => {
    const badBarre: ChordShape = {
      ...eMajorOpen,
      id: 'bad-barre',
      barre: { fret: 1, fromStringIndex: 0, toStringIndex: 6 },
    };
    expect(validateChordShape(badBarre, STANDARD_TUNING).join(' ')).toContain('[0, 5]');
  });
});

describe('chordToneNames', () => {
  it('spells a minor chord from its root, not from C', () => {
    const aMinor: ChordShape = {
      id: 'Am', name: 'Am', root: 9, quality: 'min', baseFret: 1,
      frets: [null, 0, 2, 2, 1, 0], fingers: [null, null, 2, 3, 1, null], difficulty: 1,
    };
    expect(chordToneNames(aMinor, STANDARD_TUNING)).toEqual(['A', 'C', 'E']);
  });

  it('spells a major chord from its root', () => {
    const cMajor: ChordShape = {
      id: 'C', name: 'C', root: 0, quality: 'maj', baseFret: 1,
      frets: [null, 3, 2, 0, 1, 0], fingers: [null, 3, 2, null, 1, null], difficulty: 2,
    };
    expect(chordToneNames(cMajor, STANDARD_TUNING)).toEqual(['C', 'E', 'G']);
  });

  it('honours the flat spelling preference', () => {
    const fMajor: ChordShape = {
      id: 'F', name: 'F', root: 5, quality: 'maj', baseFret: 1,
      frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1],
      barre: { fret: 1, fromStringIndex: 0, toStringIndex: 5 }, difficulty: 3,
    };
    expect(chordToneNames(fMajor, STANDARD_TUNING, { preferFlat: true })).toEqual(['F', 'A', 'C']);
  });
});
