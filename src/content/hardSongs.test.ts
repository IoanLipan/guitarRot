import { describe, expect, it } from 'vitest';
import {
  STANDARD_TUNING,
  fretToMidi,
  midiToOctave,
  midiToPitchClass,
  noteName,
  type PitchClass,
} from '@/music';
import { HARD_SONGS, alternatePickingLadderSong, sweepCascadeSong, travisBluesInESong } from './hardSongs';
import { legatoProblems } from './legato';
import { SONGS } from './songCatalog';
import { songToRiff, validateSong, type Song } from './songs';
import { beatsPerBar, riffTotalBeats, validateRiff, type Riff, type TabEvent } from './types';

const EPSILON = 1e-6;

function midiOf(event: TabEvent): number {
  return fretToMidi(STANDARD_TUNING, event.stringIndex, event.fret);
}

function riffOf(song: Song): Riff {
  const riff = song.riff;
  if (riff === undefined) throw new Error(`${song.id} has no riff`);
  return riff;
}

function byId(id: string): Song {
  const song = HARD_SONGS.find((candidate) => candidate.id === id);
  if (song === undefined) throw new Error(`no hard song ${id}`);
  return song;
}

const PUBLIC_DOMAIN = HARD_SONGS.filter((song) => song.source === 'public-domain');
const ORIGINAL = HARD_SONGS.filter((song) => song.source === 'original');

describe('the hard songs', () => {
  it('are eight songs: five classical pieces and three original studies', () => {
    expect(HARD_SONGS).toHaveLength(8);
    expect(PUBLIC_DOMAIN).toHaveLength(5);
    expect(ORIGINAL).toHaveLength(3);
    expect(HARD_SONGS.every((song) => song.difficulty === 'hard')).toBe(true);
  });

  it('are appended to the catalogue after every existing song', () => {
    const ids = SONGS.map((song) => song.id);
    expect(ids.slice(-HARD_SONGS.length)).toEqual(HARD_SONGS.map((song) => song.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('are all riff songs that validate as songs, riffs and legato phrasing', () => {
    for (const song of HARD_SONGS) {
      expect(validateSong(song), `${song.id} song`).toEqual([]);
      const riff = riffOf(song);
      expect(validateRiff(riff), `${song.id} riff`).toEqual([]);
      expect(legatoProblems(riff), `${song.id} legato`).toEqual([]);
      expect(validateRiff(songToRiff(song)), `${song.id} playable`).toEqual([]);
    }
  });

  it('keep the song and its riff in step', () => {
    for (const song of HARD_SONGS) {
      const riff = riffOf(song);
      expect(riff.bpm).toBe(song.bpm);
      expect(riff.title).toBe(song.title);
      expect(riff.source).toBe(song.source);
      expect(riff.attribution).toBe(song.attribution);
    }
  });

  it('are sensible excerpts: 8 to 24 bars, ending inside their own length', () => {
    for (const song of HARD_SONGS) {
      const riff = riffOf(song);
      expect(riff.bars, song.id).toBeGreaterThanOrEqual(8);
      expect(riff.bars, song.id).toBeLessThanOrEqual(24);
      const last = Math.max(...riff.events.map((event) => event.beat + event.duration));
      expect(last, song.id).toBeLessThanOrEqual(riffTotalBeats(riff) + EPSILON);
      expect(Math.min(...riff.events.map((event) => event.beat)), song.id).toBe(0);
    }
  });
});

describe('physical playability', () => {
  it('keeps every note on the neck: E2 up to the top of the 15th fret on the high string', () => {
    for (const song of HARD_SONGS) {
      for (const event of riffOf(song).events) {
        expect(event.fret, `${song.id}`).toBeGreaterThanOrEqual(0);
        expect(event.fret, `${song.id}`).toBeLessThanOrEqual(15);
        expect(midiOf(event), `${song.id}`).toBeGreaterThanOrEqual(40);
        expect(midiOf(event), `${song.id}`).toBeLessThanOrEqual(79);
      }
    }
  });

  it('never asks one string to sound two notes at once', () => {
    for (const song of HARD_SONGS) {
      for (let string = 0; string < 6; string += 1) {
        const onString = riffOf(song)
          .events.filter((event) => event.stringIndex === string)
          .sort((a, b) => a.beat - b.beat);
        onString.forEach((event, index) => {
          const previous = onString[index - 1];
          if (previous === undefined) return;
          expect(
            event.beat,
            `${song.id}: string ${string} at beat ${event.beat} while the note from ${previous.beat} still rings`,
          ).toBeGreaterThanOrEqual(previous.beat + previous.duration - EPSILON);
        });
      }
    }
  });

  it('keeps notes that ring together within a five-fret reach', () => {
    for (const song of HARD_SONGS) {
      const events = riffOf(song).events;
      for (const onset of new Set(events.map((event) => event.beat))) {
        const sounding = events.filter(
          (event) => event.beat <= onset + EPSILON && event.beat + event.duration > onset + EPSILON,
        );
        const fretted = sounding.map((event) => event.fret).filter((fret) => fret > 0);
        if (fretted.length === 0) continue;
        expect(
          Math.max(...fretted) - Math.min(...fretted),
          `${song.id}: frets ${fretted.join(',')} ring together at beat ${onset}`,
        ).toBeLessThanOrEqual(4);
      }
    }
  });

  it('never stretches more than five frets inside one beat', () => {
    for (const song of HARD_SONGS) {
      const events = riffOf(song).events;
      const beats = new Set(events.map((event) => Math.floor(event.beat + EPSILON)));
      for (const beat of beats) {
        const fretted = events
          .filter((event) => Math.floor(event.beat + EPSILON) === beat)
          .map((event) => event.fret)
          .filter((fret) => fret > 0);
        if (fretted.length === 0) continue;
        expect(
          Math.max(...fretted) - Math.min(...fretted),
          `${song.id}: beat ${beat} uses frets ${fretted.join(',')}`,
        ).toBeLessThanOrEqual(5);
      }
    }
  });
});

describe('the classical pieces', () => {
  it('each name their composer, the Mutopia Project and a permitted licence', () => {
    const composers: Record<string, string> = {
      'bach-prelude-bwv999': 'Bach',
      'carcassi-etude-op60-7': 'Carcassi',
      'carcassi-etude-op60-3': 'Carcassi',
      'mertz-etude-a-minor': 'Mertz',
      'sor-etude-op35-14': 'Sor',
    };
    for (const song of PUBLIC_DOMAIN) {
      const attribution = song.attribution ?? '';
      expect(attribution, song.id).toContain(composers[song.id] ?? '<unlisted piece>');
      expect(attribution, song.id).toContain('Mutopia Project edition by ');
      expect(attribution, song.id).toContain('https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=');
      // Only licences that let an app ship the notes: Public Domain, or CC
      // Attribution. Never ShareAlike or NonCommercial.
      expect(attribution, song.id).toMatch(/Public Domain|Creative Commons Attribution \d/);
      expect(attribution, song.id).not.toMatch(/ShareAlike|NonCommercial|Non-Commercial/i);
      expect(attribution, song.id).toMatch(/\(\d{4}[–-]\d{4}\)/);
    }
  });

  it('carry a composer who died long enough ago to be out of copyright', () => {
    // Composers' death years, taken from the dates in each attribution.
    for (const song of PUBLIC_DOMAIN) {
      const died = /\(\d{4}[–-](\d{4})\)/.exec(song.attribution ?? '')?.[1];
      expect(Number(died), song.id).toBeLessThan(1930);
    }
  });

  /**
   * The first three bars, as the pitches of the Mutopia edition (read from its
   * MIDI file, not from our fingering): `|` between bars, notes in the order
   * they start. If the string-and-fret search ever moved a note, this fails.
   * Bb is written A#, and so on: sharps only.
   */
  const OPENING: Record<string, readonly [string, string, string]> = {
    'bach-prelude-bwv999': [
      'D3 D4 F4 A4 F4 D4 F4 D4 A3 D4 F3 D4',
      'D3 D4 F4 A4 F4 D4 F4 D4 A3 D4 F3 D4',
      'D3 D4 G4 A#4 G4 D4 G4 D4 A#3 D4 G3 D4',
    ],
    'carcassi-etude-op60-7': [
      'A2 A3 A3 A3 C3 A3 A3 A3 F3 A3 A3 A3 E3 A3 A3 A3',
      'D3 A3 F4 A3 C3 A3 E4 A3 B2 G#3 D4 G#3 A2 A3 C4 A3',
      'D3 A3 B3 A3 D#3 A3 B3 A3 E3 A3 B3 A3 F3 A3 B3 A3',
    ],
    'carcassi-etude-op60-3': [
      'A2 A3 C#4 F#4 A3 C#4 E4 A3 C#4 A2 A3 C#4',
      'G#2 B3 D4 F#4 B3 D4 E4 B3 D4 G#2 B3 D4',
      'E2 B3 D4 A4 B3 D4 G#4 B3 D4 E2 B3 D4',
    ],
    'mertz-etude-a-minor': [
      'A2 A3 C4 E4 E4 E4 E4 E4 E4 A2 E2 G#3 B3 E4',
      'A2 A3 C4 E4 F4 E4 E4 E4 E4 A2 E2 G#3 B3 E4',
      'A2 A3 C4 E4 A4 A2 D3 A3 B3 F4 F4 D3',
    ],
    'sor-etude-op35-14': [
      'A2 A3 B3 C4 D4 E4 D3 A3 F4',
      'E3 G#3 B3 E4 E2 G#3 D4',
      'A3 C4 G3 B3 F3 A3 C4 D3 C4 B3 A3',
    ],
  };

  function openingBars(song: Song, count: number): string[] {
    const riff = riffOf(song);
    const barLength = beatsPerBar(riff.timeSignature);
    return Array.from({ length: count }, (_, bar) =>
      riff.events
        .filter(
          (event) =>
            event.beat >= bar * barLength - EPSILON && event.beat < (bar + 1) * barLength - EPSILON,
        )
        .sort((a, b) => a.beat - b.beat || midiOf(a) - midiOf(b))
        .map((event) => `${noteName(midiOf(event))}${midiToOctave(midiOf(event))}`)
        .join(' '),
    );
  }

  for (const song of PUBLIC_DOMAIN) {
    it(`${song.title} opens with the notes of its Mutopia edition`, () => {
      expect(openingBars(song, 3)).toEqual(OPENING[song.id]);
    });
  }

  it('keep the time signature and tempo of the edition', () => {
    expect(riffOf(byId('bach-prelude-bwv999')).timeSignature).toEqual([3, 4]);
    expect(riffOf(byId('bach-prelude-bwv999')).bpm).toBe(80);
    expect(riffOf(byId('carcassi-etude-op60-7')).timeSignature).toEqual([4, 4]);
    expect(riffOf(byId('carcassi-etude-op60-7')).bpm).toBe(110);
    expect(riffOf(byId('carcassi-etude-op60-3')).bpm).toBe(60);
    expect(riffOf(byId('mertz-etude-a-minor')).bpm).toBe(76);
    expect(riffOf(byId('sor-etude-op35-14')).bpm).toBe(80);
  });

  it('play the triplets of Carcassi No. 3 as true thirds of a beat', () => {
    const events = riffOf(byId('carcassi-etude-op60-3')).events;
    const onThirds = (event: TabEvent) => Math.abs(event.beat * 3 - Math.round(event.beat * 3)) < EPSILON;
    // Everything up to the cadence in bar 16, where the edition switches to eighths.
    expect(events.filter((event) => event.beat < 60).every(onThirds)).toBe(true);
    // Beat 1 + 1/3: the first inner note after the bass.
    expect(events.some((event) => Math.abs(event.beat - 1 / 3) < EPSILON)).toBe(true);
  });
});

describe('the original studies', () => {
  const A_MINOR: ReadonlySet<PitchClass> = new Set([9, 11, 0, 2, 4, 5, 7]);

  function pitchClasses(events: readonly TabEvent[]): Set<PitchClass> {
    return new Set(events.map((event) => midiToPitchClass(midiOf(event))));
  }

  it('write only guitarRot as the artist and need no attribution', () => {
    for (const song of ORIGINAL) {
      expect(song.artist).toBe('guitarRot');
      expect(song.attribution).toBeUndefined();
    }
  });

  it('keeps the alternate-picking ladder inside A natural minor, all sixteenths but the last note', () => {
    const events = riffOf(alternatePickingLadderSong).events;
    for (const pc of pitchClasses(events)) expect(A_MINOR.has(pc)).toBe(true);
    expect(events).toHaveLength(8 * 16 - 3);
    const sixteenths = events.slice(0, -1);
    expect(sixteenths.every((event) => event.duration === 0.25)).toBe(true);
    // It climbs from A2 to D5 and lands on A2.
    expect(Math.min(...events.map(midiOf))).toBe(45);
    expect(Math.max(...events.map(midiOf))).toBe(74);
    expect(midiOf(events[events.length - 1] as TabEvent)).toBe(45);
  });

  it('sweeps the five strings of Am, F, C, G, twice over, with chord tones only', () => {
    const riff = riffOf(sweepCascadeSong);
    const chords: readonly (readonly PitchClass[])[] = [
      [9, 0, 4], // Am
      [5, 9, 0], // F
      [0, 4, 7], // C
      [7, 11, 2], // G
    ];
    for (let bar = 0; bar < riff.bars; bar += 1) {
      const inBar = riff.events.filter((event) => Math.floor(event.beat / 4) === bar);
      expect(inBar, `bar ${bar + 1}`).toHaveLength(16);
      const allowed = new Set(chords[bar % 4]);
      for (const pc of pitchClasses(inBar)) expect(allowed.has(pc), `bar ${bar + 1}`).toBe(true);
      // All five strings of the sweep shape are used.
      expect(new Set(inBar.map((event) => event.stringIndex)).size).toBe(5);
    }
  });

  it('plays the Travis blues on the E7, A7 and B7 chords of a twelve-bar form', () => {
    const riff = riffOf(travisBluesInESong);
    expect(riff.bars).toBe(12);
    const form = ['E', 'E', 'E', 'E', 'A', 'A', 'E', 'E', 'B', 'A', 'E', 'B'] as const;
    const tones: Record<'E' | 'A' | 'B', ReadonlySet<PitchClass>> = {
      E: new Set([4, 8, 11, 2, 7]), // E G# B D, plus the blue third G
      A: new Set([9, 1, 4, 7]), // A C# E G
      B: new Set([11, 3, 6, 9, 4, 8]), // B D# F# A, plus the walk-down's G# and the E it lands on
    };
    form.forEach((chord, bar) => {
      const inBar = riff.events.filter((event) => Math.floor(event.beat / 4) === bar);
      expect(inBar.length, `bar ${bar + 1}`).toBeGreaterThanOrEqual(10);
      for (const pc of pitchClasses(inBar)) {
        expect(tones[chord].has(pc), `bar ${bar + 1} (${chord}7) pitch class ${pc}`).toBe(true);
      }
    });
  });

  it('keeps the Travis thumb steady: a bass note on every beat of every bar', () => {
    const riff = riffOf(travisBluesInESong);
    for (let beat = 0; beat < riffTotalBeats(riff); beat += 1) {
      const bass = riff.events.filter((event) => event.beat === beat && event.stringIndex <= 2);
      expect(bass.length, `beat ${beat}`).toBeGreaterThanOrEqual(1);
    }
  });
});
