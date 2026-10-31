import { describe, expect, it } from 'vitest';
import { UKULELE, fretToMidi, parseNoteName } from '@/music';
import { melodyEvents, melodyRiff } from './melody';
import { validateRiff } from './types';

describe('single-note melodies on the ukulele', () => {
  const play = (notes: string, opts: { onString?: number } = {}) =>
    melodyEvents(notes, { ...opts, instrument: 'ukulele' });

  it('are found on the ukulele\'s strings: the open strings take their own pitches, G4 C4 E4 A4', () => {
    expect(play('G4:1 C4:1 E4:1 A4:1').map((e) => [e.stringIndex, e.fret])).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ]);
  });

  it('take the lowest fret, so an open string beats a fretted one: E4 is the open E string, not the C string at fret 4', () => {
    expect(play('E4:1')[0]).toMatchObject({ stringIndex: 2, fret: 0 });
  });

  it('put every note at the pitch it was written at, not an octave off: re-entrant tuning must not fool the search', () => {
    const notes = 'C4:1 D4:1 E4:1 F4:1 G4:1 A4:1 B4:1 C5:1 D5:1 E5:1';
    for (const event of play(notes)) {
      expect(fretToMidi(UKULELE.tuning, event.stringIndex, event.fret)).toBeGreaterThanOrEqual(60);
    }
    const written = notes.split(' ').map((token) => parseNoteName(token.split(':')[0] ?? ''));
    const played = play(notes).map((e) => fretToMidi(UKULELE.tuning, e.stringIndex, e.fret));
    expect(played).toEqual(written);
  });

  it('cannot reach a note below the C string: the guitar\'s low E is not on a ukulele', () => {
    expect(() => play('E2:1')).toThrow('cannot be played');
    expect(() => play('B3:1')).toThrow('cannot be played');
  });

  it('can be pinned to one of its four strings, and not to a fifth', () => {
    expect(play('C4:1 D4:1 E4:1', { onString: 1 }).map((e) => [e.stringIndex, e.fret])).toEqual([
      [1, 0],
      [1, 2],
      [1, 4],
    ]);
    expect(() => play('C4:1', { onString: 4 })).toThrow('0 to 3');
    // Pinned to the string a note is too low for.
    expect(() => play('C4:1', { onString: 0 })).toThrow('string index 0');
  });

  it('keep the guitar\'s search for the guitar: the same text, a different string', () => {
    expect(melodyEvents('E4:1')[0]).toMatchObject({ stringIndex: 5, fret: 0 });
  });

  it('make a riff of the ukulele that holds up as one: four strings, its own frets, instrument named', () => {
    const riff = melodyRiff({
      id: 'uke-test-melody',
      instrument: 'ukulele',
      title: 'Test',
      style: 'Drill',
      level: 1,
      bpm: 80,
      tags: [],
      source: 'original',
      notes: 'C4:1 E4:1 G4:1 C5:1 | C5:2 G4:2',
    });

    expect(riff.instrument).toBe('ukulele');
    expect(riff.bars).toBe(2);
    expect(validateRiff(riff)).toEqual([]);
  });
});
