import { describe, expect, it } from 'vitest';
import {
  GUITAR,
  INSTRUMENTS,
  UKULELE,
  getInstrument,
  highestPitchString,
  instrumentIdOf,
  instrumentOf,
  isInstrumentId,
  isReentrant,
  lowestOpenMidi,
  lowestPitchString,
  stringCountOf,
  stringIndexFromNumber,
  stringNumber,
} from './instruments';
import { findPositions, fretToMidi } from './fretboard';
import { noteName } from './notes';
import { STANDARD_TUNING, UKULELE_TUNING } from './tuning';

describe('the guitar', () => {
  it('is the standard six-string tuning, low E first, and keeps the old exports', () => {
    expect(GUITAR.tuning).toBe(STANDARD_TUNING);
    expect(GUITAR.tuning).toEqual([40, 45, 50, 55, 59, 64]);
    expect(GUITAR.stringNames).toEqual(['E', 'A', 'D', 'G', 'B', 'e']);
    expect(stringCountOf(GUITAR)).toBe(6);
  });

  it('numbers its strings from the top line of the tab: index 0 is string 6', () => {
    expect([0, 1, 2, 3, 4, 5].map((index) => stringNumber(index, GUITAR))).toEqual([6, 5, 4, 3, 2, 1]);
  });

  it('is not re-entrant: pitch rises with every string index', () => {
    expect(isReentrant(GUITAR.tuning)).toBe(false);
    expect(lowestPitchString(GUITAR.tuning)).toBe(0);
    expect(highestPitchString(GUITAR.tuning)).toBe(5);
  });
});

describe('the ukulele', () => {
  it('is G4 C4 E4 A4, the 4th string first', () => {
    expect(UKULELE.tuning).toBe(UKULELE_TUNING);
    expect(UKULELE.tuning).toEqual([67, 60, 64, 69]);
    expect(UKULELE.tuning.map((open) => noteName(open))).toEqual(['G', 'C', 'E', 'A']);
    expect(UKULELE.stringNames).toEqual(['G', 'C', 'E', 'A']);
    expect(stringCountOf(UKULELE)).toBe(4);
  });

  it('numbers its strings the same way: index 0 is string 4, the top line is string 1', () => {
    expect([0, 1, 2, 3].map((index) => stringNumber(index, UKULELE))).toEqual([4, 3, 2, 1]);
    expect([4, 3, 2, 1].map((n) => stringIndexFromNumber(n, UKULELE))).toEqual([0, 1, 2, 3]);
  });

  it('is re-entrant: the string at index 0 is a step above the C beside it, not the lowest', () => {
    expect(isReentrant(UKULELE.tuning)).toBe(true);
    expect(UKULELE.tuning[0]).toBeGreaterThan(UKULELE.tuning[1] ?? Infinity);
    expect(lowestPitchString(UKULELE.tuning)).toBe(1);
    expect(highestPitchString(UKULELE.tuning)).toBe(3);
    expect(lowestOpenMidi(UKULELE.tuning)).toBe(60);
  });

  it('puts the same pitch on different strings than the guitar would, found by pitch and not by index', () => {
    // Middle C is the open C string (index 1), not the first string; G4 is the open first string.
    expect(findPositions(UKULELE.tuning, 60, [0, 12])).toContainEqual({ stringIndex: 1, fret: 0 });
    expect(findPositions(UKULELE.tuning, 67, [0, 0])).toEqual([{ stringIndex: 0, fret: 0 }]);
    // E4 can be played on three strings within the first twelve frets.
    expect(findPositions(UKULELE.tuning, 64, [0, 12]).map((p) => p.stringIndex)).toEqual([1, 2]);
    expect(fretToMidi(UKULELE.tuning, 3, 3)).toBe(72);
  });

  it('has the limits a soprano or concert neck has', () => {
    expect(UKULELE.maxFret).toBe(15);
    expect(UKULELE.boardFrets).toBe(12);
    expect(UKULELE.defaultToneId).toBe('ukulele');
  });

  it('draws one stroke width for every string', () => {
    expect(UKULELE.stringWidths).toHaveLength(4);
    expect(GUITAR.stringWidths).toHaveLength(6);
  });
});

describe('looking an instrument up', () => {
  it('has one entry per id, each with a name per string and a width per string', () => {
    expect(INSTRUMENTS.map((instrument) => instrument.id)).toEqual(['guitar', 'ukulele']);
    for (const instrument of INSTRUMENTS) {
      expect(instrument.stringNames).toHaveLength(instrument.tuning.length);
      expect(instrument.stringWidths).toHaveLength(instrument.tuning.length);
      expect(getInstrument(instrument.id)).toBe(instrument);
    }
  });

  it('recognises ids and nothing else', () => {
    expect(isInstrumentId('guitar')).toBe(true);
    expect(isInstrumentId('ukulele')).toBe(true);
    expect(isInstrumentId('banjo')).toBe(false);
    expect(isInstrumentId(undefined)).toBe(false);
  });

  it('reads the instrument off authored content, the guitar when it names none', () => {
    expect(instrumentIdOf({})).toBe('guitar');
    expect(instrumentOf({})).toBe(GUITAR);
    expect(instrumentOf({ instrument: 'ukulele' })).toBe(UKULELE);
  });
});
