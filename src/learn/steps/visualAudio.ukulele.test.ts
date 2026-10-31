import { describe, expect, it } from 'vitest';
import { GUITAR, UKULELE, lowestOpenMidi } from '@/music';
import { neckDotText, notesToMidi } from './visualAudio';

describe('a row of named notes, on each instrument', () => {
  it('is the guitar\'s, unchanged, when no instrument is given: A B C D E F G rises from A3', () => {
    expect(notesToMidi(['A', 'B', 'C', 'D', 'E', 'F', 'G'])).toEqual([57, 59, 60, 62, 64, 65, 67]);
    // E A D G B E would climb into shrill territory from A3, so it lands on the six open strings.
    expect(notesToMidi(['E', 'A', 'D', 'G', 'B', 'E'], GUITAR)).toEqual([40, 45, 50, 55, 59, 64]);
  });

  it('starts a ukulele row an octave higher, above its lowest string: A B C D E F G rises from A4', () => {
    expect(notesToMidi(['A', 'B', 'C', 'D', 'E', 'F', 'G'], UKULELE)).toEqual([69, 71, 72, 74, 76, 77, 79]);
    for (const midi of notesToMidi(['C', 'D', 'E'], UKULELE)) {
      expect(midi).toBeGreaterThanOrEqual(lowestOpenMidi(UKULELE.tuning));
    }
  });

  it('is not the open strings: a ukulele\'s do not climb, so G C E A rises G4 C5 E5 A5', () => {
    expect(notesToMidi(['G', 'C', 'E', 'A'], UKULELE)).toEqual([67, 72, 76, 81]);
  });

  it('keeps a written octave', () => {
    expect(notesToMidi(['C4', 'E4', 'G4'], UKULELE)).toEqual([60, 64, 67]);
  });

  it('drops to the lowest open string, not the first string, when a row would climb too high', () => {
    // Twelve letters climb past the ukulele's comfortable top from A4; they start on its lowest string, the C.
    const chromatic = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'];
    const midis = notesToMidi(chromatic, UKULELE);
    expect(midis[0]).toBeGreaterThanOrEqual(60);
    expect(midis).toEqual([...midis].sort((a, b) => a - b));
  });
});

describe('what a neck dot says on the ukulele', () => {
  it('names the dot from the ukulele\'s tuning: the first string\'s second fret is A, not the guitar\'s F#', () => {
    expect(neckDotText({ stringIndex: 0, fret: 2 }, UKULELE)).toBe('A');
    expect(neckDotText({ stringIndex: 0, fret: 2 })).toBe('F#');
    expect(neckDotText({ stringIndex: 0, fret: 2, label: 'solfege' }, UKULELE)).toBe('La');
    expect(neckDotText({ stringIndex: 0, fret: 2, label: 'none' }, UKULELE)).toBe('');
  });
});
