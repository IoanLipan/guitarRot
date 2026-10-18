import { describe, expect, it } from 'vitest';
import { STANDARD_TUNING, fretToMidi, midiToPitchClass, noteName } from '@/music';
import { getSong } from './songCatalog';
import { songToRiff, validateSong } from './songs';
import { beatsPerBar, validateRiff, type Riff } from './types';

/**
 * The six public-domain melodies, written out bar by bar from the tunes
 * themselves. This is deliberately a second, independent copy of the notes
 * in songCatalog.ts: the catalogue is turned into frets by `melodyEvents`,
 * and a typo in either copy (or a wrong fret choice) shows up as a mismatch
 * here instead of quietly teaching a wrong note.
 *
 * Each bar reads `NOTE:BEATS`.
 */
const TUNES: Record<string, { bars: readonly string[]; opening: number }> = {
  // Beethoven, Symphony No. 9, "Ode to Joy" theme (1824).
  'ode-to-joy': {
    opening: 8,
    bars: [
      'E4:1 E4:1 F4:1 G4:1',
      'G4:1 F4:1 E4:1 D4:1',
      'C4:1 C4:1 D4:1 E4:1',
      'E4:1.5 D4:0.5 D4:2',
      'E4:1 E4:1 F4:1 G4:1',
      'G4:1 F4:1 E4:1 D4:1',
      'C4:1 C4:1 D4:1 E4:1',
      'D4:1.5 C4:0.5 C4:2',
      'D4:1 D4:1 E4:1 C4:1',
      'D4:1 E4:0.5 F4:0.5 E4:1 C4:1',
      'D4:1 E4:0.5 F4:0.5 E4:1 D4:1',
      'C4:1 D4:1 G3:2',
      'E4:1 E4:1 F4:1 G4:1',
      'G4:1 F4:1 E4:1 D4:1',
      'C4:1 C4:1 D4:1 E4:1',
      'D4:1.5 C4:0.5 C4:2',
    ],
  },
  // "Ah! vous dirai-je, maman" (1761).
  'twinkle-twinkle': {
    opening: 7,
    bars: [
      'C4:1 C4:1 G4:1 G4:1',
      'A4:1 A4:1 G4:2',
      'F4:1 F4:1 E4:1 E4:1',
      'D4:1 D4:1 C4:2',
      'G4:1 G4:1 F4:1 F4:1',
      'E4:1 E4:1 D4:2',
      'G4:1 G4:1 F4:1 F4:1',
      'E4:1 E4:1 D4:2',
      'C4:1 C4:1 G4:1 G4:1',
      'A4:1 A4:1 G4:2',
      'F4:1 F4:1 E4:1 E4:1',
      'D4:1 D4:1 C4:2',
    ],
  },
  'frere-jacques': {
    opening: 4,
    bars: [
      'C4:1 D4:1 E4:1 C4:1',
      'C4:1 D4:1 E4:1 C4:1',
      'E4:1 F4:1 G4:2',
      'E4:1 F4:1 G4:2',
      'G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4:1 C4:1',
      'G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4:1 C4:1',
      'C4:1 G3:1 C4:2',
      'C4:1 G3:1 C4:2',
    ],
  },
  'mary-had-a-little-lamb': {
    opening: 7,
    bars: [
      'E4:1 D4:1 C4:1 D4:1',
      'E4:1 E4:1 E4:2',
      'D4:1 D4:1 D4:2',
      'E4:1 G4:1 G4:2',
      'E4:1 D4:1 C4:1 D4:1',
      'E4:1 E4:1 E4:1 E4:1',
      'D4:1 D4:1 E4:1 D4:1',
      'C4:4',
    ],
  },
  // James Lord Pierpont, "One Horse Open Sleigh" (1857), the chorus.
  'jingle-bells': {
    opening: 11,
    bars: [
      'E4:1 E4:1 E4:2',
      'E4:1 E4:1 E4:2',
      'E4:1 G4:1 C4:1.5 D4:0.5',
      'E4:4',
      'F4:1 F4:1 F4:1.5 F4:0.5',
      'F4:1 E4:1 E4:1 E4:0.5 E4:0.5',
      'E4:1 D4:1 D4:1 E4:1',
      'D4:2 G4:2',
      'E4:1 E4:1 E4:2',
      'E4:1 E4:1 E4:2',
      'E4:1 G4:1 C4:1.5 D4:0.5',
      'E4:4',
      'F4:1 F4:1 F4:1.5 F4:0.5',
      'F4:1 E4:1 E4:1 E4:0.5 E4:0.5',
      'G4:1 G4:1 F4:1 D4:1',
      'C4:4',
    ],
  },
  'au-clair-de-la-lune': {
    opening: 6,
    bars: [
      'C4:1 C4:1 C4:1 D4:1',
      'E4:2 D4:2',
      'C4:1 E4:1 D4:1 D4:1',
      'C4:4',
      'C4:1 C4:1 C4:1 D4:1',
      'E4:2 D4:2',
      'C4:1 E4:1 D4:1 D4:1',
      'C4:4',
      'D4:1 D4:1 D4:1 D4:1',
      'A3:2 A3:2',
      'D4:1 C4:1 B3:1 A3:1',
      'G3:4',
      'C4:1 C4:1 C4:1 D4:1',
      'E4:2 D4:2',
      'C4:1 E4:1 D4:1 D4:1',
      'C4:4',
    ],
  },
};

const TUNE_IDS = Object.keys(TUNES);

/** Fixed-do names, typed here independently of the app's own tables. */
const SOLFEGE: Record<string, string> = {
  C: 'Do',
  D: 'Re',
  E: 'Mi',
  F: 'Fa',
  G: 'Sol',
  A: 'La',
  B: 'Si',
};

function riffOf(id: string): Riff {
  const song = getSong(id);
  if (song?.riff === undefined) throw new Error(`${id} should be a riff song`);
  return song.riff;
}

/** `NOTE:BEATS` for one event, the way TUNES spells it. */
function spell(event: Riff['events'][number]): string {
  const midi = fretToMidi(STANDARD_TUNING, event.stringIndex, event.fret);
  return `${noteName(midi, { withOctave: true })}:${event.duration}`;
}

/** The riff's notes grouped by the bar they start in, spelled like TUNES. */
function barsOf(riff: Riff): string[] {
  const perBar = beatsPerBar(riff.timeSignature);
  const bars: string[][] = Array.from({ length: riff.bars }, () => []);
  for (const event of [...riff.events].sort((a, b) => a.beat - b.beat)) {
    bars[Math.floor(event.beat / perBar)]?.push(spell(event));
  }
  return bars.map((notes) => notes.join(' '));
}

describe('the public-domain melodies', () => {
  it('ships all six', () => {
    for (const id of TUNE_IDS) expect(getSong(id), id).toBeDefined();
    expect(TUNE_IDS).toHaveLength(6);
  });

  describe.each(TUNE_IDS)('%s', (id) => {
    const song = getSong(id);
    const tune = TUNES[id];
    if (song === undefined || tune === undefined) throw new Error(`missing ${id}`);
    const riff = riffOf(id);

    it('plays the tune: every bar matches, pitch for pitch and beat for beat', () => {
      expect(barsOf(riff)).toEqual(tune.bars);
    });

    it('fills every bar exactly, with no note crossing a bar line', () => {
      const perBar = beatsPerBar(riff.timeSignature);
      expect(riff.bars).toBe(tune.bars.length);
      const sorted = [...riff.events].sort((a, b) => a.beat - b.beat);
      let expectedBeat = 0;
      for (const event of sorted) {
        expect(event.beat).toBe(expectedBeat);
        const barEnd = (Math.floor(event.beat / perBar) + 1) * perBar;
        expect(event.beat + event.duration).toBeLessThanOrEqual(barEnd);
        expectedBeat += event.duration;
      }
      expect(expectedBeat).toBe(riff.bars * perBar);
    });

    it('is plain C major: no accidentals, and it comes home to C', () => {
      const cMajor = new Set([0, 2, 4, 5, 7, 9, 11]);
      const pitchClasses = riff.events.map((e) =>
        midiToPitchClass(fretToMidi(STANDARD_TUNING, e.stringIndex, e.fret)),
      );
      for (const pc of pitchClasses) expect(cMajor.has(pc)).toBe(true);
      expect(pitchClasses[pitchClasses.length - 1]).toBe(0);
    });

    it('stays in first position, on real frets', () => {
      for (const event of riff.events) {
        expect(event.fret).toBeGreaterThanOrEqual(0);
        expect(event.fret).toBeLessThanOrEqual(12);
      }
    });

    it('names the solfège of its opening, and gets it right', () => {
      const opening = [...riff.events]
        .sort((a, b) => a.beat - b.beat)
        .slice(0, tune.opening)
        .map((e) => {
          const letter = noteName(fretToMidi(STANDARD_TUNING, e.stringIndex, e.fret)).charAt(0);
          return SOLFEGE[letter];
        })
        .join(' ');
      // Commas and full stops are prose, not part of the note names.
      const prose = song.about.replace(/[,.:;]/g, '');
      expect(prose).toContain(opening);
    });

    it('is easy, in C, public domain, and says where it came from', () => {
      expect(song.difficulty).toBe('easy');
      expect(song.key).toBe('C');
      expect(song.source).toBe('public-domain');
      expect(song.attribution ?? '').not.toBe('');
      expect(riff.source).toBe('public-domain');
      expect(riff.attribution).toBe(song.attribution);
      expect(riff.bpm).toBe(song.bpm);
    });

    it('validates as a song and as a riff', () => {
      expect(validateSong(song)).toEqual([]);
      expect(validateRiff(riff)).toEqual([]);
      expect(validateRiff(songToRiff(song))).toEqual([]);
    });

    it('has an id that survives a share link', () => {
      expect(song.id).toMatch(/^[A-Za-z0-9][A-Za-z0-9-]*$/);
    });
  });

  it('repeats its phrases exactly where the tunes do', () => {
    const bars = (id: string) => TUNES[id]?.bars ?? [];
    // Ode to Joy: the opening four bars come back as bars 13-16, and bars
    // 5-7 repeat bars 1-3 (only the cadence differs).
    expect(bars('ode-to-joy').slice(12, 16)).toEqual([
      ...bars('ode-to-joy').slice(0, 3),
      bars('ode-to-joy')[7],
    ]);
    expect(bars('ode-to-joy').slice(4, 7)).toEqual(bars('ode-to-joy').slice(0, 3));
    // Twinkle: the first four bars return as the last four.
    expect(bars('twinkle-twinkle').slice(8)).toEqual(bars('twinkle-twinkle').slice(0, 4));
    // Au clair: the first phrase returns twice.
    expect(bars('au-clair-de-la-lune').slice(12)).toEqual(bars('au-clair-de-la-lune').slice(0, 4));
    expect(bars('au-clair-de-la-lune').slice(4, 8)).toEqual(bars('au-clair-de-la-lune').slice(0, 4));
    // Frère Jacques is a round of four doubled lines.
    for (const [a, b] of [[0, 1], [2, 3], [4, 5], [6, 7]] as const) {
      expect(bars('frere-jacques')[a]).toBe(bars('frere-jacques')[b]);
    }
  });
});
