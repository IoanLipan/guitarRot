import { describe, expect, it } from 'vitest';
import {
  enharmonics,
  midiToOctave,
  midiToPitchClass,
  noteName,
  parseNoteName,
  pitchClassName,
  transpose,
} from './notes';

describe('midiToPitchClass', () => {
  it('maps C4 to pitch class 0', () => {
    expect(midiToPitchClass(60)).toBe(0);
  });

  it('maps every open standard-tuning string', () => {
    expect([40, 45, 50, 55, 59, 64].map(midiToPitchClass)).toEqual([4, 9, 2, 7, 11, 4]);
  });

  it('stays in range for negative input', () => {
    expect(midiToPitchClass(-1)).toBe(11);
  });
});

describe('midiToOctave', () => {
  it('places C4 in octave 4', () => {
    expect(midiToOctave(60)).toBe(4);
  });

  it('places the low E string in octave 2', () => {
    expect(midiToOctave(40)).toBe(2);
  });

  it('places the high E string in octave 4', () => {
    expect(midiToOctave(64)).toBe(4);
  });
});

describe('noteName', () => {
  it('uses sharps by default', () => {
    expect(noteName(61)).toBe('C#');
  });

  it('uses flats on request', () => {
    expect(noteName(61, { preferFlat: true })).toBe('Db');
  });

  it('appends the octave on request', () => {
    expect(noteName(40, { withOctave: true })).toBe('E2');
  });

  it('names all six open strings', () => {
    const names = [40, 45, 50, 55, 59, 64].map((m) => noteName(m, { withOctave: true }));
    expect(names).toEqual(['E2', 'A2', 'D3', 'G3', 'B3', 'E4']);
  });
});

describe('pitchClassName', () => {
  it('names a pitch class without an octave', () => {
    expect(pitchClassName(9)).toBe('A');
  });
});

describe('parseNoteName', () => {
  it('round-trips every open string', () => {
    for (const m of [40, 45, 50, 55, 59, 64]) {
      expect(parseNoteName(noteName(m, { withOctave: true }))).toBe(m);
    }
  });

  it('accepts flats', () => {
    expect(parseNoteName('Bb3')).toBe(58);
  });

  it('accepts unicode accidentals', () => {
    expect(parseNoteName('C♯4')).toBe(61);
  });

  it('defaults to octave 4 when none is given', () => {
    expect(parseNoteName('C')).toBe(60);
  });

  it('throws on nonsense', () => {
    expect(() => parseNoteName('H4')).toThrow();
  });
});

describe('transpose', () => {
  it('moves up an octave', () => {
    expect(transpose(40, 12)).toBe(52);
  });

  it('moves down a fifth', () => {
    expect(transpose(64, -7)).toBe(57);
  });
});

describe('enharmonics', () => {
  it('gives both spellings for a black key', () => {
    expect(enharmonics(1)).toEqual(['C#', 'Db']);
  });

  it('gives one spelling for a white key', () => {
    expect(enharmonics(0)).toEqual(['C']);
  });
});
