import { describe, expect, it } from 'vitest';
import {
  STANDARD_TUNING,
  chordPitchClasses,
  fretToMidi,
  midiToPitchClass,
  noteName,
} from '@/music';
import { chordByName } from './songs';
import { DRILLS, findRiff } from './drills';
import { legatoProblems } from './legato';
import { RIFFS } from './riffs';
import { beatsPerBar, riffTotalBeats, validateRiff, type Riff, type TabEvent } from './types';

function drill(id: string): Riff {
  const found = DRILLS.find((d) => d.id === id);
  if (found === undefined) throw new Error(`missing drill ${id}`);
  return found;
}

const inOrder = (riff: Riff): TabEvent[] => [...riff.events].sort((a, b) => a.beat - b.beat);
const midiOf = (e: TabEvent): number => fretToMidi(STANDARD_TUNING, e.stringIndex, e.fret);
/** `E4 F4 G4 ...` in playing order. */
const spelled = (riff: Riff): string[] =>
  inOrder(riff).map((e) => noteName(midiOf(e), { withOctave: true }));

describe('DRILLS', () => {
  it('has the fourteen drills the course is built on', () => {
    expect(DRILLS.map((d) => d.id)).toEqual([
      'open-strings-walk',
      'mi-fa-sol',
      'low-e-landmarks',
      'a-string-landmarks',
      'octave-hop',
      'c-major-scale',
      'rhythm-ladder',
      'legato-drill',
      'em-four-downs',
      'em-am-change',
      'd-a-change',
      'g-c-change',
      'g-c-d-quarters',
      'folk-pattern-g-c',
    ]);
  });

  it('passes validation for every drill', () => {
    expect(DRILLS.flatMap((d) => validateRiff(d))).toEqual([]);
  });

  it('gives every drill an id nothing else uses, and one a share link can carry', () => {
    const ids = [...RIFFS, ...DRILLS].map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of DRILLS) expect(d.id).toMatch(/^[A-Za-z0-9][A-Za-z0-9-]*$/);
  });

  it('is practice material for this app, kept out of the Feed', () => {
    for (const d of DRILLS) {
      expect(d.source, d.id).toBe('original');
      expect(d.style, d.id).toBe('Drill');
      expect(RIFFS.some((r) => r.id === d.id), d.id).toBe(false);
    }
  });

  it('starts every drill on beat 0 and fills its last bar', () => {
    for (const d of DRILLS) {
      expect(Math.min(...d.events.map((e) => e.beat)), d.id).toBe(0);
      const end = Math.max(...d.events.map((e) => e.beat + e.duration));
      // Strum durations are computed, so allow for float rounding.
      expect(end, d.id).toBeCloseTo(riffTotalBeats(d), 6);
    }
  });

  it('uses hammer-ons and pull-offs only where they can be played', () => {
    expect(DRILLS.flatMap((d) => legatoProblems(d))).toEqual([]);
  });
});

describe('findRiff', () => {
  it('finds a feed riff', () => {
    expect(findRiff('chromatic-warmup')?.title).toBe('Chromatic warm-up');
  });

  it('finds a drill', () => {
    expect(findRiff('open-strings-walk')).toBe(drill('open-strings-walk'));
  });

  it('returns undefined for an unknown id', () => {
    expect(findRiff('does-not-exist')).toBeUndefined();
  });
});

describe('open-strings-walk', () => {
  it('plays each open string in turn, low to high and back', () => {
    const riff = drill('open-strings-walk');
    expect(riff.bpm).toBe(70);
    expect(riff.events.every((e) => e.fret === 0 && e.duration === 1)).toBe(true);
    expect(inOrder(riff).map((e) => e.stringIndex)).toEqual([0, 1, 2, 3, 4, 5, 5, 4, 3, 2, 1, 0]);
    expect(spelled(riff)).toEqual([
      'E2', 'A2', 'D3', 'G3', 'B3', 'E4', 'E4', 'B3', 'G3', 'D3', 'A2', 'E2',
    ]);
  });
});

describe('mi-fa-sol', () => {
  it('plays E F G on the high E string and nothing else', () => {
    const riff = drill('mi-fa-sol');
    expect(riff.bpm).toBe(70);
    expect(riff.events.every((e) => e.stringIndex === 5)).toBe(true);
    expect(spelled(riff)).toEqual([
      'E4', 'F4', 'G4', 'F4', 'E4', 'F4', 'G4', 'G4', 'F4', 'E4', 'F4', 'E4',
    ]);
    expect(new Set(riff.events.map((e) => e.fret))).toEqual(new Set([0, 1, 3]));
    expect(riff.bars).toBe(4);
  });
});

describe('the string-landmark drills', () => {
  it('low-e-landmarks stays on the low E string, up the natural notes and back', () => {
    const riff = drill('low-e-landmarks');
    expect(riff.bpm).toBe(70);
    expect(riff.events.every((e) => e.stringIndex === 0)).toBe(true);
    expect(spelled(riff)).toEqual([
      'E2', 'G2', 'A2', 'B2', 'C3', 'D3', 'E3', 'E3', 'D3', 'C3', 'B2', 'A2', 'G2', 'E2',
    ]);
    // The landmarks themselves: the 3rd, 5th, 7th, 8th, 10th and 12th frets.
    expect(inOrder(riff).slice(0, 7).map((e) => e.fret)).toEqual([0, 3, 5, 7, 8, 10, 12]);
  });

  it('a-string-landmarks stays on the A string, a whole octave from A to A', () => {
    const riff = drill('a-string-landmarks');
    expect(riff.bpm).toBe(70);
    expect(riff.events.every((e) => e.stringIndex === 1)).toBe(true);
    expect(spelled(riff)).toEqual([
      'A2', 'B2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3',
      'A3', 'G3', 'F3', 'E3', 'D3', 'C3', 'B2', 'A2',
    ]);
    expect(inOrder(riff).slice(0, 8).map((e) => e.fret)).toEqual([0, 2, 3, 5, 7, 8, 10, 12]);
  });
});

describe('octave-hop', () => {
  it('pairs each note with the same note an octave up: two strings over, two frets up', () => {
    const riff = drill('octave-hop');
    expect(riff.bpm).toBe(70);
    expect(riff.events).toHaveLength(8);
    expect(riff.events.every((e) => e.duration === 2)).toBe(true);

    const events = inOrder(riff);
    const letters: string[] = [];
    for (let i = 0; i < events.length; i += 2) {
      const low = events[i];
      const high = events[i + 1];
      if (low === undefined || high === undefined) throw new Error('unpaired note');
      expect(midiOf(high) - midiOf(low)).toBe(12);
      expect(high.stringIndex - low.stringIndex).toBe(2);
      expect(high.fret - low.fret).toBe(2);
      letters.push(noteName(midiOf(low)));
    }
    expect(letters).toEqual(['G', 'C', 'A', 'D']);
  });
});

describe('c-major-scale', () => {
  it('climbs from C3 to C4 and comes back down', () => {
    const riff = drill('c-major-scale');
    expect(riff.bpm).toBe(80);
    expect(spelled(riff)).toEqual([
      'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4',
      'C4', 'B3', 'A3', 'G3', 'F3', 'E3', 'D3', 'C3',
    ]);
    // Naturals only, so the pitch classes are exactly C major.
    const cMajor = new Set([0, 2, 4, 5, 7, 9, 11]);
    for (const e of riff.events) expect(cMajor.has(midiToPitchClass(midiOf(e)))).toBe(true);
  });
});

describe('rhythm-ladder', () => {
  it('halves the note length each bar, all on the open G string', () => {
    const riff = drill('rhythm-ladder');
    expect(riff.bpm).toBe(70);
    expect(riff.bars).toBe(4);
    expect(riff.events.every((e) => e.stringIndex === 3 && e.fret === 0)).toBe(true);

    const notesPerBar = [0, 1, 2, 3].map(
      (bar) => riff.events.filter((e) => Math.floor(e.beat / 4) === bar).length,
    );
    expect(notesPerBar).toEqual([1, 2, 4, 8]);
    // Each bar is evenly divided: every note in it has the same length.
    for (const bar of [0, 1, 2, 3]) {
      const lengths = new Set(
        riff.events.filter((e) => Math.floor(e.beat / 4) === bar).map((e) => e.duration),
      );
      expect(lengths).toEqual(new Set([4 / notesPerBar[bar]!]));
    }
  });
});

describe('legato-drill', () => {
  const riff = drill('legato-drill');

  it('hammers up and pulls down, always on the string it started on', () => {
    expect(legatoProblems(riff)).toEqual([]);
  });

  it('picks the first note of every bar, and uses both techniques', () => {
    for (const bar of [0, 1, 2, 3]) {
      const first = inOrder(riff).find((e) => Math.floor(e.beat / 4) === bar);
      expect(first?.technique, `bar ${bar + 1}`).toBeUndefined();
    }
    const techniques = new Set(riff.events.map((e) => e.technique));
    expect(techniques).toContain('hammer');
    expect(techniques).toContain('pull');
  });

  it('stays on the G and B strings, with the trill on the B', () => {
    expect(new Set(riff.events.map((e) => e.stringIndex))).toEqual(new Set([3, 4]));
    const barThree = riff.events.filter((e) => Math.floor(e.beat / 4) === 2);
    expect(barThree.every((e) => e.stringIndex === 4)).toBe(true);
    expect(new Set(barThree.map((e) => e.fret))).toEqual(new Set([0, 1]));
  });

  it('keeps every note short enough to be a trill: eighths, with a held finish', () => {
    const events = inOrder(riff);
    for (const e of events.slice(0, -1)) expect(e.duration).toBe(0.5);
    expect(events[events.length - 1]).toMatchObject({ fret: 0, beat: 15, duration: 1 });
  });
});

describe('the chord-change drills', () => {
  /** The chord each bar of a drill is meant to sound, by name. */
  const CHARTS: readonly (readonly [string, number, readonly string[]])[] = [
    ['em-four-downs', 70, ['Em', 'Em', 'Em', 'Em']],
    ['em-am-change', 70, ['Em', 'Em', 'Am', 'Am', 'Em', 'Em', 'Am', 'Am']],
    ['d-a-change', 70, ['D', 'D', 'A', 'A', 'D', 'D', 'A', 'A']],
    ['g-c-change', 70, ['G', 'G', 'C', 'C', 'G', 'G', 'C', 'C']],
    ['g-c-d-quarters', 80, ['G', 'C', 'D', 'G']],
    ['folk-pattern-g-c', 80, ['G', 'G', 'C', 'C', 'D', 'D', 'G', 'G']],
  ];

  it.each(CHARTS)('%s runs at %i bpm and sounds the right chord in every bar', (id, bpm, chords) => {
    const riff = drill(id);
    expect(riff.bpm).toBe(bpm);
    expect(riff.bars).toBe(chords.length);
    expect(riff.timeSignature).toEqual([4, 4]);

    const perBar = beatsPerBar(riff.timeSignature);
    chords.forEach((name, bar) => {
      const shape = chordByName(name);
      expect(shape, `${id}: ${name}`).toBeDefined();
      if (shape === undefined) return;

      const inBar = riff.events.filter((e) => Math.floor(e.beat / perBar) === bar);
      expect(inBar.length, `${id} bar ${bar + 1} is silent`).toBeGreaterThan(0);

      const heard = [...new Set(inBar.map((e) => midiToPitchClass(midiOf(e))))].sort(
        (a, b) => a - b,
      );
      expect(heard, `${id} bar ${bar + 1} should be ${name}`).toEqual(
        chordPitchClasses(shape, STANDARD_TUNING),
      );
    });
  });

  it('plays every strum on exactly the frets of the chord shape', () => {
    // A bar of Em must use Em's frets on Em's strings and no others.
    const shape = chordByName('Em');
    const riff = drill('em-four-downs');
    for (const e of riff.events) expect(shape?.frets[e.stringIndex]).toBe(e.fret);
  });

  it('strikes each chord on every beat when the pattern is downstrokes', () => {
    const riff = drill('em-four-downs');
    const downbeats = riff.events.filter((e) => e.beat % 1 < 0.2).map((e) => Math.floor(e.beat));
    expect(new Set(downbeats)).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]));
  });

  it('keeps its own id, not the song-prefixed one the conversion made', () => {
    for (const [id] of CHARTS) expect(drill(id).id).toBe(id);
  });
});
