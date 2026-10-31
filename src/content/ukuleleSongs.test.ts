import { describe, expect, it } from 'vitest';
import { STANDARD_TUNING, UKULELE, fretToMidi, noteName, type Midi } from '@/music';
import { legatoProblems } from './legato';
import { SONGS, UKULELE_SONGS, ALL_SONGS, getSong, songsFor } from './songCatalog';
import { MOVIES_TAG, chartBars, isMovieSong, songPlayableOn, songToRiff, validateSong, type Song } from './songs';
import { UKULELE_EDITION_SPECS, UKULELE_LEFT_OUT, type TuneEdition } from './ukuleleSongs';
import { beatsPerBar, validateRiff, type Riff, type TabEvent } from './types';

const EPSILON = 1e-6;

function riffOf(song: Song): Riff {
  const riff = song.riff;
  if (riff === undefined) throw new Error(`${song.id} has no riff`);
  return riff;
}

function ukulele(id: string): Song {
  const song = UKULELE_SONGS.find((candidate) => candidate.id === id);
  if (song === undefined) throw new Error(`no ukulele song ${id}`);
  return song;
}

function guitar(id: string): Song {
  const song = SONGS.find((candidate) => candidate.id === id);
  if (song === undefined) throw new Error(`no guitar song ${id}`);
  return song;
}

/** The ukulele songs made from a guitar tab: all but the ones written for it alone. */
const TUNES = UKULELE_SONGS.filter((song) => song.riff !== undefined);

const midiOnUkulele = (event: TabEvent): Midi => fretToMidi(UKULELE.tuning, event.stringIndex, event.fret);
const midiOnGuitar = (event: TabEvent): Midi => fretToMidi(STANDARD_TUNING, event.stringIndex, event.fret);

/** The pitches of a riff in the order they start, with how long each is held. */
function line(riff: Riff, midiOf: (event: TabEvent) => Midi): { name: string; beat: number; duration: number }[] {
  return [...riff.events]
    .sort((a, b) => a.beat - b.beat)
    .map((event) => ({ name: noteName(midiOf(event), { withOctave: true }), beat: event.beat, duration: event.duration }));
}

const names = (riff: Riff, count: number): string[] =>
  line(riff, midiOnUkulele)
    .slice(0, count)
    .map((note) => note.name);

describe('the ukulele editions of the single-note songs', () => {
  it('are nine songs, each its own entry with a ukulele id', () => {
    expect(TUNES).toHaveLength(9);
    expect(TUNES.map((song) => song.id)).toEqual([
      'uke-ode-to-joy',
      'uke-twinkle-twinkle',
      'uke-frere-jacques',
      'uke-mary-had-a-little-lamb',
      'uke-jingle-bells',
      'uke-au-clair-de-la-lune',
      'uke-dies-irae',
      'uke-in-the-hall-of-the-mountain-king',
      'uke-hillside-jig',
    ]);
    for (const song of UKULELE_SONGS) {
      expect(song.id.startsWith('uke-'), song.id).toBe(true);
      expect(song.instrument, song.id).toBe('ukulele');
    }
    for (const song of TUNES) expect(riffOf(song).instrument, song.id).toBe('ukulele');
  });

  it('are in the catalogue once each, found by id, and the guitar\'s songs are exactly as they were', () => {
    const ids = ALL_SONGS.map((song) => song.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const song of UKULELE_SONGS) expect(getSong(song.id), song.id).toBe(song);
    expect(ALL_SONGS.slice(0, SONGS.length)).toEqual(SONGS);
    expect(songsFor('guitar')).toEqual(SONGS);
    expect(SONGS.some((song) => song.instrument === 'ukulele')).toBe(false);
  });

  it('are the ukulele\'s alone: listed for it, never for the guitar', () => {
    for (const song of UKULELE_SONGS) {
      expect(songPlayableOn(song, 'ukulele'), song.id).toBe(true);
      expect(songPlayableOn(song, 'guitar'), song.id).toBe(false);
      expect(songsFor('ukulele'), song.id).toContain(song);
      expect(songsFor('guitar'), song.id).not.toContain(song);
    }
  });

  it('validate as songs, riffs and legato phrasing, and play back as riffs', () => {
    for (const song of TUNES) {
      expect(validateSong(song), `${song.id} song`).toEqual([]);
      const riff = riffOf(song);
      expect(validateRiff(riff), `${song.id} riff`).toEqual([]);
      expect(legatoProblems(riff), `${song.id} legato`).toEqual([]);
      expect(songToRiff(song), song.id).toBe(riff);
    }
  });

  it('keep the song and its riff in step', () => {
    for (const song of TUNES) {
      const riff = riffOf(song);
      expect(riff.bpm, song.id).toBe(song.bpm);
      expect(riff.title, song.id).toBe(song.title);
      expect(riff.style, song.id).toBe(song.style);
      expect(riff.source, song.id).toBe(song.source);
      expect(riff.attribution, song.id).toBe(song.attribution);
      expect(riff.level, song.id).toBe(song.difficulty === 'easy' ? 1 : song.difficulty === 'medium' ? 3 : 5);
      expect(riff.tags, song.id).toEqual([...song.tags]);
    }
  });

  it('carry the licensing rule over: public-domain tunes keep their attribution, plus what was changed', () => {
    for (const song of TUNES) {
      const spec = UKULELE_EDITION_SPECS.find((candidate) => candidate.id === song.id) as TuneEdition;
      const original = guitar(spec.from);
      expect(song.source, song.id).toBe(original.source);
      if (original.source === 'public-domain') {
        expect(song.attribution, song.id).toContain(original.attribution);
      }
      if (original.attribution !== undefined) expect(song.attribution, song.id).toContain(spec.change);
      expect(song.credit, song.id).toBe(original.credit);
      expect(song.artist, song.id).toBe(original.artist);
    }
  });

  it('keep the Movies tag on a movie song, and the film in its about line', () => {
    const movies = UKULELE_SONGS.filter(isMovieSong).map((song) => song.id);
    expect(movies.sort()).toEqual([
      'uke-canon-in-d',
      'uke-dies-irae',
      'uke-hillside-jig',
      'uke-in-the-hall-of-the-mountain-king',
      'uke-ode-to-joy',
    ]);
    for (const song of TUNES) {
      expect(isMovieSong(song), song.id).toBe(isMovieSong(guitar(UKULELE_EDITION_SPECS.find((s) => s.id === song.id)!.from)));
      if (isMovieSong(song)) expect(song.tags, song.id).toContain(MOVIES_TAG);
    }
    expect(ukulele('uke-ode-to-joy').about).toContain('Die Hard (1988)');
    expect(ukulele('uke-dies-irae').about).toContain('The Shining (1980)');
    expect(ukulele('uke-in-the-hall-of-the-mountain-king').about).toContain('The Social Network (2010)');
    expect(ukulele('uke-canon-in-d').about).toContain('Ordinary People (1980)');
  });

  it('keep an about line written for a person: one line, no longer than the guitar\'s', () => {
    for (const song of UKULELE_SONGS) {
      expect(song.about.length, song.id).toBeLessThanOrEqual(190);
      expect(song.about, song.id).not.toMatch(/\n/);
    }
  });

  it('tag their key afresh, never the guitar tab\'s', () => {
    expect(ukulele('uke-ode-to-joy').tags).toContain('F major');
    expect(ukulele('uke-ode-to-joy').tags).not.toContain('C major');
    expect(ukulele('uke-twinkle-twinkle').tags).toContain('C major');
    expect(ukulele('uke-in-the-hall-of-the-mountain-king').tags).toContain('F minor');
    expect(ukulele('uke-in-the-hall-of-the-mountain-king').tags).not.toContain('B minor');
    for (const song of UKULELE_SONGS) {
      expect(new Set(song.tags).size, song.id).toBe(song.tags.length);
      expect(song.tags, song.id).toContain('ukulele');
    }
  });
});

describe('the same tunes, moved to four strings', () => {
  /** The tune a guitar tab plays, as pitches: its highest note at each moment, from `tuneFrom` up, in the bars asked for. */
  function guitarTune(spec: TuneEdition): { midi: Midi; beat: number }[] {
    const original = riffOf(guitar(spec.from));
    const perBar = beatsPerBar(original.timeSignature);
    const [first, last] = spec.bars ?? [1, original.bars];
    const top = new Map<number, Midi>();
    for (const event of original.events) {
      if (event.beat < (first - 1) * perBar - EPSILON || event.beat >= last * perBar - EPSILON) continue;
      const midi = midiOnGuitar(event);
      if (spec.tuneFrom !== undefined && midi < spec.tuneFrom) continue;
      top.set(event.beat - (first - 1) * perBar, Math.max(top.get(event.beat - (first - 1) * perBar) ?? 0, midi));
    }
    return [...top.entries()].sort((a, b) => a[0] - b[0]).map(([beat, midi]) => ({ midi, beat }));
  }

  it.each(UKULELE_EDITION_SPECS.map((spec) => [spec.id, spec] as const))(
    '%s is the guitar song\'s tune, note for note, moved by its shift (and an octave where it would sound below C4)',
    (_id, spec) => {
      const tune = guitarTune(spec);
      const played = line(riffOf(ukulele(spec.id)), midiOnUkulele);
      expect(played).toHaveLength(tune.length);
      tune.forEach((note, index) => {
        const moved = note.midi + spec.shift;
        const expected = moved >= 60 ? moved : moved + 12 * Math.ceil((60 - moved) / 12);
        expect(played[index]?.name, `${spec.id} note ${index + 1}`).toBe(noteName(expected, { withOctave: true }));
        expect(played[index]?.beat, `${spec.id} note ${index + 1}`).toBeCloseTo(note.beat, 6);
      });
    },
  );

  it('keep every note in the ukulele\'s range: C4, the open C string, up to the twelfth fret of the A string', () => {
    for (const song of TUNES) {
      for (const event of riffOf(song).events) {
        expect(midiOnUkulele(event), song.id).toBeGreaterThanOrEqual(60);
        expect(midiOnUkulele(event), song.id).toBeLessThanOrEqual(81);
        expect(event.stringIndex, song.id).toBeLessThan(4);
        expect(event.fret, song.id).toBeLessThanOrEqual(12);
      }
    }
  });

  it('keep the first-position tunes to the first five frets, and say honestly when a tune climbs the neck', () => {
    const highest = (id: string) => Math.max(...riffOf(ukulele(id)).events.map((event) => event.fret));
    for (const id of [
      'uke-ode-to-joy',
      'uke-twinkle-twinkle',
      'uke-frere-jacques',
      'uke-mary-had-a-little-lamb',
      'uke-jingle-bells',
      'uke-au-clair-de-la-lune',
      'uke-hillside-jig',
    ]) {
      expect(highest(id), id).toBeLessThanOrEqual(5);
      expect(ukulele(id).difficulty, id).toBe('easy');
    }
    expect(highest('uke-dies-irae')).toBeLessThanOrEqual(8);
    expect(ukulele('uke-dies-irae').difficulty).toBe('medium');
    expect(highest('uke-in-the-hall-of-the-mountain-king')).toBeGreaterThan(8);
    expect(ukulele('uke-in-the-hall-of-the-mountain-king').difficulty).toBe('hard');
  });

  it('are one voice: a single note at a time, each ending before the next, and never past the bar', () => {
    for (const song of TUNES) {
      const riff = riffOf(song);
      const events = [...riff.events].sort((a, b) => a.beat - b.beat);
      events.forEach((event, index) => {
        const next = events[index + 1];
        if (next !== undefined) expect(event.beat + event.duration, `${song.id} at ${event.beat}`).toBeLessThanOrEqual(next.beat + EPSILON);
      });
      const last = events[events.length - 1] as TabEvent;
      expect(last.beat + last.duration, song.id).toBeLessThanOrEqual(riff.bars * beatsPerBar(riff.timeSignature) + EPSILON);
      expect(events[0]?.beat, song.id).toBe(0);
    }
  });

  it('are as long as their excerpt: the bars of the guitar tab they took', () => {
    for (const spec of UKULELE_EDITION_SPECS) {
      const original = riffOf(guitar(spec.from));
      const expected = spec.bars === undefined ? original.bars : spec.bars[1] - spec.bars[0] + 1;
      expect(riffOf(ukulele(spec.id)).bars, spec.id).toBe(expected);
      expect(riffOf(ukulele(spec.id)).timeSignature, spec.id).toEqual(original.timeSignature);
    }
  });

  it('opens each tune on the pitches it opens on, written out so a fingering slip cannot hide', () => {
    const open = (id: string, count: number) => names(riffOf(ukulele(id)), count);
    // A fourth up, into F.
    expect(open('uke-ode-to-joy', 12)).toEqual(['A4', 'A4', 'A#4', 'C5', 'C5', 'A#4', 'A4', 'G4', 'F4', 'F4', 'G4', 'A4']);
    expect(open('uke-frere-jacques', 12)).toEqual(['F4', 'G4', 'A4', 'F4', 'F4', 'G4', 'A4', 'F4', 'A4', 'A#4', 'C5', 'A4']);
    expect(open('uke-au-clair-de-la-lune', 12)).toEqual(['F4', 'F4', 'F4', 'G4', 'A4', 'G4', 'F4', 'A4', 'G4', 'G4', 'F4', 'F4']);
    // Where the guitar has it.
    expect(open('uke-twinkle-twinkle', 14)).toEqual([
      'C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4', 'D4', 'C4',
    ]);
    expect(open('uke-mary-had-a-little-lamb', 13)).toEqual([
      'E4', 'D4', 'C4', 'D4', 'E4', 'E4', 'E4', 'D4', 'D4', 'D4', 'E4', 'G4', 'G4',
    ]);
    expect(open('uke-jingle-bells', 11)).toEqual(['E4', 'E4', 'E4', 'E4', 'E4', 'E4', 'E4', 'G4', 'C4', 'D4', 'E4']);
    // The chant: twice high, twice an octave lower, a fourth and an octave above the guitar's.
    expect(open('uke-dies-irae', 8)).toEqual(['F5', 'E5', 'F5', 'D5', 'E5', 'C5', 'D5', 'D5']);
    const chant = names(riffOf(ukulele('uke-dies-irae')), 32);
    expect(chant.slice(16, 24)).toEqual(['F4', 'E4', 'F4', 'D4', 'E4', 'C4', 'D4', 'D4']);
    // From the second statement of the theme on, a tritone up.
    expect(open('uke-in-the-hall-of-the-mountain-king', 9)).toEqual(['F4', 'G4', 'G#4', 'A#4', 'C5', 'G#4', 'C5', 'B4', 'G4']);
    // The jig: the tune alone, its low notes lifted.
    expect(open('uke-hillside-jig', 8)).toEqual(['D4', 'G4', 'B4', 'G4', 'A4', 'F#4', 'D4', 'E4']);
  });

  it('puts the tunes on the strings a ukulele player would use: open strings first, the A string for the high notes', () => {
    const at = (id: string, beat: number) =>
      riffOf(ukulele(id)).events.find((event) => Math.abs(event.beat - beat) < EPSILON) as TabEvent;
    // Twinkle: C4 on the open C string, G4 on the open G string, A4 on the open A string.
    expect([at('uke-twinkle-twinkle', 0).stringIndex, at('uke-twinkle-twinkle', 0).fret]).toEqual([1, 0]);
    expect([at('uke-twinkle-twinkle', 2).stringIndex, at('uke-twinkle-twinkle', 2).fret]).toEqual([0, 0]);
    expect([at('uke-twinkle-twinkle', 4).stringIndex, at('uke-twinkle-twinkle', 4).fret]).toEqual([3, 0]);
    // Ode to Joy in F: C5 is the third fret of the A string; the first A is open.
    expect([at('uke-ode-to-joy', 0).stringIndex, at('uke-ode-to-joy', 0).fret]).toEqual([3, 0]);
    expect([at('uke-ode-to-joy', 3).stringIndex, at('uke-ode-to-joy', 3).fret]).toEqual([3, 3]);
  });

  it('end the lullaby and the round on the open C string, the lowest note a ukulele has', () => {
    for (const id of ['uke-au-clair-de-la-lune', 'uke-frere-jacques']) {
      const events = [...riffOf(ukulele(id)).events].sort((a, b) => a.beat - b.beat);
      const lowest = Math.min(...events.map(midiOnUkulele));
      expect(lowest, id).toBe(60);
    }
  });
});

describe('the tunes that have no ukulele edition', () => {
  const guitarRiffSongs = SONGS.filter((song) => song.riff !== undefined);

  it('are named, each with a reason, and every guitar riff song is either one of them or has an edition', () => {
    const edited = new Set(UKULELE_EDITION_SPECS.map((spec) => spec.from));
    for (const song of guitarRiffSongs) {
      const left = Object.hasOwn(UKULELE_LEFT_OUT, song.id);
      expect(edited.has(song.id) !== left, `${song.id} must be edited or left out, not both and not neither`).toBe(true);
    }
    for (const id of Object.keys(UKULELE_LEFT_OUT)) {
      expect(guitarRiffSongs.some((song) => song.id === id), `${id} is not a guitar riff song`).toBe(true);
      expect((UKULELE_LEFT_OUT[id] ?? '').length, id).toBeGreaterThan(20);
    }
    expect(Object.keys(UKULELE_LEFT_OUT)).toHaveLength(17);
  });
});

describe('the Canon in D, as chords', () => {
  const canon = () => ukulele('uke-canon-in-d');

  it('is a strummed chart for the ukulele alone, with a ukulele shape for each of its chords', () => {
    const song = canon();
    expect(song.chart).toBeDefined();
    expect(song.riff).toBeUndefined();
    expect(validateSong(song)).toEqual([]);
    expect(songPlayableOn(song, 'ukulele')).toBe(true);
    expect(songPlayableOn(song, 'guitar')).toBe(false);
    expect(chartBars(song.chart!).map((bar) => bar.chordName)).toEqual([
      ...['D', 'A', 'Bm', 'F#m', 'G', 'D', 'G', 'A'],
      ...['D', 'A', 'Bm', 'F#m', 'G', 'D', 'G', 'A'],
    ]);
  });

  it('plays as a ukulele riff on four strings, and stays public domain with an attribution', () => {
    const riff = songToRiff(canon());
    expect(riff.instrument).toBe('ukulele');
    expect(validateRiff(riff)).toEqual([]);
    expect(Math.max(...riff.events.map((event) => event.stringIndex))).toBeLessThan(4);
    expect(canon().source).toBe('public-domain');
    expect(canon().attribution).toContain('Pachelbel');
  });
});
