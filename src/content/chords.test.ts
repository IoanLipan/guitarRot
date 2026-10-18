import { describe, expect, it } from 'vitest';
import {
  STANDARD_TUNING,
  chordToneNames,
  chordVoicing,
  midiToPitchClass,
  validateChordShape,
} from '@/music';
import { chordShapeToFretboard } from '@/render';
import { CHORDS, getChord } from './chords';

describe('CHORDS', () => {
  it('has 29 shapes with unique ids and unique names', () => {
    expect(CHORDS).toHaveLength(29);
    expect(new Set(CHORDS.map((c) => c.id)).size).toBe(29);
    // The chord quiz offers names as answers; two shapes sharing a name would
    // make a question with two right answers.
    expect(new Set(CHORDS.map((c) => c.name)).size).toBe(29);
  });

  it.each(CHORDS.map((c) => [c.id, c] as const))('%s is a valid shape', (_id, chord) => {
    expect(validateChordShape(chord, STANDARD_TUNING)).toEqual([]);
  });

  it('uses ids that survive a share link (?p=chord:<id>) without percent-encoding', () => {
    // Mirrors the pattern in src/share/shareId.ts; F#m once wanted a '#'.
    for (const chord of CHORDS) {
      expect(chord.id, chord.id).toMatch(/^[A-Za-z0-9][A-Za-z0-9-]*$/);
    }
  });

  it('finds a chord by id', () => {
    expect(getChord('Am-open')?.name).toBe('Am');
  });

  it('returns undefined for an unknown id', () => {
    expect(getChord('nope')).toBeUndefined();
  });
});

describe('how the shapes are drawn', () => {
  it('gives every fretted string a finger, so no diagram dot is left unlabelled', () => {
    for (const chord of CHORDS) {
      chord.frets.forEach((fret, stringIndex) => {
        if (fret === null || fret === 0) return;
        const finger = chord.fingers[stringIndex];
        expect(finger, `${chord.id} string ${stringIndex}`).toBeGreaterThanOrEqual(1);
      });
    }
  });

  it('never asks one finger to hold two different frets', () => {
    // Only a barre may reuse a finger, and a barre sits on one fret.
    for (const chord of CHORDS) {
      const fretsByFinger = new Map<number, Set<number>>();
      chord.fingers.forEach((finger, stringIndex) => {
        const fret = chord.frets[stringIndex];
        if (finger === null || finger === undefined || fret === null || fret === undefined) return;
        fretsByFinger.set(finger, (fretsByFinger.get(finger) ?? new Set()).add(fret));
      });
      for (const [finger, frets] of fretsByFinger) {
        expect(frets.size, `${chord.id}: finger ${finger} on frets ${[...frets]}`).toBe(1);
      }
    }
  });

  it('fits every fretted note, and any barre, inside the window the diagram draws', () => {
    for (const chord of CHORDS) {
      const diagram = chordShapeToFretboard(chord);
      const [first, last] = diagram.fretRange;
      for (const marker of diagram.markers) {
        expect(marker.fret, `${chord.id} string ${marker.stringIndex}`).toBeGreaterThanOrEqual(first);
        expect(marker.fret, `${chord.id} string ${marker.stringIndex}`).toBeLessThanOrEqual(last);
      }
      if (chord.barre !== undefined) {
        expect(chord.barre.fret, `${chord.id} barre`).toBeGreaterThanOrEqual(first);
        expect(chord.barre.fret, `${chord.id} barre`).toBeLessThanOrEqual(last);
      }
    }
  });

  it('puts the root in the bass, so every shape is a root-position chord', () => {
    for (const chord of CHORDS) {
      const lowest = chordVoicing(chord, STANDARD_TUNING)[0];
      expect(lowest, chord.id).toBeDefined();
      if (lowest === undefined) continue;
      expect(midiToPitchClass(lowest), chord.id).toBe(chord.root);
    }
  });
});

/**
 * The tones each new shape must spell, typed out by hand and independent of
 * the chord-quality table the validator derives from. If a fret is wrong,
 * this is the second net.
 */
const NEW_CHORD_TONES: readonly (readonly [string, readonly string[]])[] = [
  ['A7-open', ['A', 'C#', 'E', 'G']],
  ['B7-open', ['B', 'D#', 'F#', 'A']],
  ['D7-open', ['D', 'F#', 'A', 'C']],
  ['E7-open', ['E', 'G#', 'B', 'D']],
  ['G7-open', ['G', 'B', 'D', 'F']],
  ['Am7-open', ['A', 'C', 'E', 'G']],
  ['Em7-open', ['E', 'G', 'B', 'D']],
  ['Dm7-open', ['D', 'F', 'A', 'C']],
  ['Cmaj7-open', ['C', 'E', 'G', 'B']],
  ['Fmaj7-open', ['F', 'A', 'C', 'E']],
  ['Asus2-open', ['A', 'B', 'E']],
  ['Asus4-open', ['A', 'D', 'E']],
  ['Dsus2-open', ['D', 'E', 'A']],
  ['Dsus4-open', ['D', 'G', 'A']],
  ['Bm-barre', ['B', 'D', 'F#']],
  ['Fsharpm-barre', ['F#', 'A', 'C#']],
  ['E5-power', ['E', 'B']],
  ['A5-power', ['A', 'E']],
  ['D5-power', ['D', 'A']],
  ['G5-power', ['G', 'D']],
];

describe('the library beyond the first nine shapes', () => {
  it('adds twenty chords', () => {
    expect(NEW_CHORD_TONES).toHaveLength(20);
  });

  it.each(NEW_CHORD_TONES)('%s spells the right notes', (id, tones) => {
    const chord = getChord(id);
    expect(chord, id).toBeDefined();
    if (chord === undefined) return;
    expect(chordToneNames(chord, STANDARD_TUNING)).toEqual(tones);
  });

  it('writes each name so that the root letter matches its pitch class', () => {
    // 'F#m' must be rooted on pitch class 6, not on F.
    expect(getChord('Fsharpm-barre')?.root).toBe(6);
    expect(getChord('Fsharpm-barre')?.name).toBe('F#m');
  });

  it('draws the high barres in a window that starts at the barre', () => {
    expect(getChord('Bm-barre')?.baseFret).toBe(2);
    expect(getChord('Fsharpm-barre')?.baseFret).toBe(2);
    expect(getChord('G5-power')?.baseFret).toBe(3);
  });
});
