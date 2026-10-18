import { describe, expect, it } from 'vitest';
import { STANDARD_TUNING, fretToMidi, noteName } from '@/music';
import { melodyEvents, melodyRiff } from './melody';
import { validateRiff } from './types';

/** Where each event lands, as `[stringIndex, fret]` pairs. */
const spots = (notes: string, opts?: { onString?: number }) =>
  melodyEvents(notes, opts).map((e) => [e.stringIndex, e.fret]);

describe('melodyEvents: choosing the fret', () => {
  it('prefers an open string over the same pitch fretted higher up', () => {
    // E4 is the open high E, and also fret 5 of the B string.
    expect(spots('E4:1')).toEqual([[5, 0]]);
    expect(spots('G3:1')).toEqual([[3, 0]]);
    expect(spots('E2:1')).toEqual([[0, 0]]);
  });

  it('takes the lowest fret, which is first position', () => {
    // C4 could be B string fret 1, G string fret 5, or D string fret 10.
    expect(spots('C4:1')).toEqual([[4, 1]]);
    // A3 is G string fret 2, not D string fret 7.
    expect(spots('A3:1')).toEqual([[3, 2]]);
    // A2 is the open A string, not low E fret 5.
    expect(spots('A2:1')).toEqual([[1, 0]]);
  });

  it('handles sharps and flats', () => {
    expect(spots('F#3:1')).toEqual([[2, 4]]);
    expect(spots('Bb2:1')).toEqual([[1, 1]]);
  });

  it('finds the right place for every note from low E to the twelfth fret of the high E', () => {
    // 40 is the open low E; 76 is the high E at fret 12. The round trip
    // (pitch -> fret -> pitch) is the whole contract of this helper.
    for (let midi = 40; midi <= 76; midi += 1) {
      const name = noteName(midi, { withOctave: true });
      const [event] = melodyEvents(`${name}:1`);
      expect(event, name).toBeDefined();
      if (event === undefined) continue;
      expect(fretToMidi(STANDARD_TUNING, event.stringIndex, event.fret), name).toBe(midi);
      expect(event.fret, name).toBeLessThanOrEqual(12);
    }
  });
});

describe('melodyEvents: timing', () => {
  it('lays notes end to end, in quarter-note units', () => {
    const events = melodyEvents('E4:1 F4:0.5 G4:0.5 A4:2');
    expect(events.map((e) => e.beat)).toEqual([0, 1, 1.5, 2]);
    expect(events.map((e) => e.duration)).toEqual([1, 0.5, 0.5, 2]);
  });

  it('treats bar lines as decoration', () => {
    expect(melodyEvents('E4:1 F4:1 | G4:1 A4:1')).toEqual(melodyEvents('E4:1 F4:1 G4:1 A4:1'));
    expect(melodyEvents('|E4:1|F4:1|')).toEqual(melodyEvents('E4:1 F4:1'));
  });

  it('lets a rest take up time without sounding', () => {
    const events = melodyEvents('E4:1 r:1 G4:1 r:0.5 A4:0.5');
    expect(events.map((e) => e.beat)).toEqual([0, 2, 3.5]);
    expect(events).toHaveLength(3);
  });

  it('puts no technique on a plain melody note', () => {
    for (const event of melodyEvents('E4:1 F4:1')) expect(event.technique).toBeUndefined();
  });
});

describe('melodyEvents: onString', () => {
  it('keeps every note on the string it was told to use', () => {
    // A2 is the open A string, but with low E pinned it becomes fret 5.
    expect(spots('A2:1 B2:1', { onString: 1 })).toEqual([[1, 0], [1, 2]]);
    expect(spots('A2:1 B2:1', { onString: 0 })).toEqual([[0, 5], [0, 7]]);
  });

  it('still picks the right pitch when pinned', () => {
    const events = melodyEvents('E2:1 A2:1 D3:1 E3:1', { onString: 0 });
    const pitches = events.map((e) => fretToMidi(STANDARD_TUNING, e.stringIndex, e.fret));
    expect(pitches).toEqual([40, 45, 50, 52]);
  });

  it('refuses a note the pinned string cannot reach in first position', () => {
    // Below the open string.
    expect(() => melodyEvents('D2:1', { onString: 0 })).toThrow(/D2.*string index 0/);
    // Above the twelfth fret of that string.
    expect(() => melodyEvents('E4:1', { onString: 0 })).toThrow(/E4.*string index 0/);
  });

  it('refuses a string that does not exist', () => {
    expect(() => melodyEvents('E4:1', { onString: 6 })).toThrow(/onString/);
    expect(() => melodyEvents('E4:1', { onString: -1 })).toThrow(/onString/);
    expect(() => melodyEvents('E4:1', { onString: 1.5 })).toThrow(/onString/);
  });
});

describe('melodyEvents: bad input', () => {
  it.each([
    ['a note with no duration', 'E4'],
    ['an empty duration', 'E4:'],
    ['a non-numeric duration', 'E4:long'],
    ['a zero duration', 'E4:0'],
    ['a negative duration', 'E4:-1'],
    ['an unknown letter', 'H4:1'],
    ['a note with no octave', 'E:1'],
    ['a lowercase note name', 'e4:1'],
    ['a malformed number', 'E4:1.2.3'],
    ['a rest with no duration', 'r'],
    ['a stray word', 'hello:1'],
  ])('rejects %s', (_label, token) => {
    expect(() => melodyEvents(`G4:1 ${token} G4:1`)).toThrow(/Bad melody token/);
  });

  it('names the offending token', () => {
    expect(() => melodyEvents('E4:1 Q9:1')).toThrow('"Q9:1"');
  });

  it('rejects a note below the guitar', () => {
    expect(() => melodyEvents('D2:1')).toThrow(/D2 cannot be played/);
  });

  it('rejects a note above the twelfth fret instead of reaching for it', () => {
    // E5 is the twelfth fret of the high E; F5 would be the thirteenth.
    expect(spots('E5:1')).toEqual([[5, 12]]);
    expect(() => melodyEvents('F5:1')).toThrow(/F5 cannot be played/);
  });

  it('rejects an empty melody, and one made only of rests', () => {
    expect(() => melodyEvents('')).toThrow(/at least one note/);
    expect(() => melodyEvents(' | ')).toThrow(/at least one note/);
    expect(() => melodyEvents('r:4')).toThrow(/at least one note/);
  });
});

describe('melodyRiff', () => {
  const base = {
    id: 'test-melody',
    title: 'Test melody',
    style: 'Melody',
    level: 1 as const,
    bpm: 90,
    tags: ['test'],
    source: 'original' as const,
  };

  it('fills as many 4/4 bars as the notes cover', () => {
    const riff = melodyRiff({ ...base, notes: 'E4:1 E4:1 E4:2 | G4:4' });
    expect(riff.bars).toBe(2);
    expect(riff.timeSignature).toEqual([4, 4]);
    expect(validateRiff(riff)).toEqual([]);
  });

  it('counts a trailing rest as part of the last bar', () => {
    const riff = melodyRiff({ ...base, notes: 'E4:2 r:2 | G4:2 r:2' });
    expect(riff.bars).toBe(2);
    expect(validateRiff(riff)).toEqual([]);
  });

  it('rounds a partial bar up so no note rings past the end', () => {
    const riff = melodyRiff({ ...base, notes: 'E4:4 G4:1' });
    expect(riff.bars).toBe(2);
    expect(validateRiff(riff)).toEqual([]);
  });

  it('can be written in another time signature', () => {
    const riff = melodyRiff({ ...base, timeSignature: [3, 4], notes: 'E4:1 F4:1 G4:1 | A4:3' });
    expect(riff.bars).toBe(2);
    expect(riff.timeSignature).toEqual([3, 4]);
  });

  it('carries the metadata through untouched', () => {
    const riff = melodyRiff({
      ...base,
      source: 'public-domain',
      attribution: 'Traditional',
      notes: 'E4:4',
    });
    expect(riff).toMatchObject({
      id: 'test-melody',
      title: 'Test melody',
      style: 'Melody',
      level: 1,
      bpm: 90,
      tags: ['test'],
      source: 'public-domain',
      attribution: 'Traditional',
    });
  });

  it('passes onString through to the fret choice', () => {
    const riff = melodyRiff({ ...base, notes: 'A2:4', onString: 0 });
    expect(riff.events[0]).toMatchObject({ stringIndex: 0, fret: 5 });
  });
});
