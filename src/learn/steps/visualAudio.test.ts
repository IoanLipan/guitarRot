import { describe, expect, it } from 'vitest';
import { notesToMidi, neckDotText, noteLetter } from './visualAudio';

describe('notesToMidi', () => {
  it('lets an alphabet climb from its first note', () => {
    // A3 B3 C4 D4 E4 F4 G4
    expect(notesToMidi(['A', 'B', 'C', 'D', 'E', 'F', 'G'])).toEqual([57, 59, 60, 62, 64, 65, 67]);
  });

  it('plays chord tones as an arpeggio upward', () => {
    expect(notesToMidi(['E', 'G', 'B'])).toEqual([52, 55, 59]);
  });

  it('starts a row that would climb too high an octave lower: the open strings stay the open strings', () => {
    expect(notesToMidi(['E', 'A', 'D', 'G', 'B', 'E'])).toEqual([40, 45, 50, 55, 59, 64]);
  });

  it('keeps an octave the lesson wrote down', () => {
    expect(notesToMidi(['E2', 'E4'])).toEqual([40, 64]);
  });

  it('understands sharps and flats', () => {
    expect(notesToMidi(['F#', 'Bb'])).toEqual([54, 58]);
  });

  it('never goes below the lowest guitar note', () => {
    for (const start of ['C', 'D', 'E', 'F', 'G', 'A', 'B']) {
      for (const midi of notesToMidi([start, 'G', start])) expect(midi).toBeGreaterThanOrEqual(40);
    }
  });
});

describe('noteLetter', () => {
  it('drops the octave and keeps the accidental', () => {
    expect(noteLetter('E2')).toBe('E');
    expect(noteLetter('F#')).toBe('F#');
    expect(noteLetter(' Bb3 ')).toBe('Bb');
  });
});

describe('neckDotText', () => {
  it('says the note by default', () => {
    expect(neckDotText({ stringIndex: 0, fret: 3 })).toBe('G');
    expect(neckDotText({ stringIndex: 1, fret: 4 })).toBe('C#');
  });

  it('says the solfège when asked', () => {
    expect(neckDotText({ stringIndex: 0, fret: 3, label: 'solfege' })).toBe('Sol');
    expect(neckDotText({ stringIndex: 1, fret: 4, label: 'solfege' })).toBe('Do#');
  });

  it('can say nothing, or any text such as a finger number', () => {
    expect(neckDotText({ stringIndex: 0, fret: 3, label: 'none' })).toBe('');
    expect(neckDotText({ stringIndex: 0, fret: 3, label: '2' })).toBe('2');
  });
});
