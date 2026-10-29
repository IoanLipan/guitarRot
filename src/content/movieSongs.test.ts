import { describe, expect, it } from 'vitest';
import {
  STANDARD_TUNING,
  fretToMidi,
  midiToOctave,
  midiToPitchClass,
  noteName,
  type PitchClass,
} from '@/music';
import { legatoProblems } from './legato';
import { MOVIE_SONGS, diesIrae, hillsideJig, hymnForAStoneHall, quietRuins } from './movieSongs';
import { SONGS, getSong } from './songCatalog';
import { MOVIES_TAG, isMovieSong, songToRiff, validateSong, type Song } from './songs';
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
  const song = MOVIE_SONGS.find((candidate) => candidate.id === id);
  if (song === undefined) throw new Error(`no movie song ${id}`);
  return song;
}

const PUBLIC_DOMAIN = MOVIE_SONGS.filter((song) => song.source === 'public-domain');
const ORIGINAL = MOVIE_SONGS.filter((song) => song.source === 'original');

describe('the movie songs', () => {
  it('are nine songs: six public-domain pieces and three originals', () => {
    expect(MOVIE_SONGS).toHaveLength(9);
    expect(PUBLIC_DOMAIN).toHaveLength(6);
    expect(ORIGINAL).toHaveLength(3);
  });

  it('spread easy, medium and hard', () => {
    expect(new Set(MOVIE_SONGS.map((song) => song.difficulty))).toEqual(
      new Set(['easy', 'medium', 'hard']),
    );
  });

  it('are in the catalogue, once each, with the movies tag', () => {
    const ids = SONGS.map((song) => song.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const song of MOVIE_SONGS) {
      expect(getSong(song.id), song.id).toBe(song);
      expect(song.tags, song.id).toContain(MOVIES_TAG);
      expect(isMovieSong(song), song.id).toBe(true);
    }
  });

  it('also tag the two existing songs a famous film used, and nothing else', () => {
    const tagged = SONGS.filter(isMovieSong).map((song) => song.id);
    expect(tagged.sort()).toEqual(
      [...MOVIE_SONGS.map((song) => song.id), 'ode-to-joy', 'scarborough-fair'].sort(),
    );
  });

  it('name the film and year in plain words in the about line', () => {
    const films: Record<string, string> = {
      'dies-irae': 'The Shining (1980)',
      'in-the-hall-of-the-mountain-king': 'The Social Network (2010)',
      'canon-in-d': 'Ordinary People (1980)',
      'gymnopedie-no-1': 'My Dinner with Andre (1981)',
      'air-on-the-g-string': 'Se7en (1995)',
      'the-entertainer': 'The Sting (1973)',
      'ode-to-joy': 'Die Hard (1988)',
      'scarborough-fair': 'The Graduate (1967)',
    };
    for (const [id, film] of Object.entries(films)) {
      expect(getSong(id)?.about, id).toContain(film);
    }
  });

  it('say honestly that Scarborough Fair here is the old tune, not the recording', () => {
    expect(getSong('scarborough-fair')?.about).toMatch(/not their arrangement/);
  });

  it('are all riff songs that validate as songs, riffs and legato phrasing', () => {
    for (const song of MOVIE_SONGS) {
      expect(validateSong(song), `${song.id} song`).toEqual([]);
      const riff = riffOf(song);
      expect(validateRiff(riff), `${song.id} riff`).toEqual([]);
      expect(legatoProblems(riff), `${song.id} legato`).toEqual([]);
      expect(validateRiff(songToRiff(song)), `${song.id} playable`).toEqual([]);
    }
  });

  it('keep the song and its riff in step', () => {
    for (const song of MOVIE_SONGS) {
      const riff = riffOf(song);
      expect(riff.bpm).toBe(song.bpm);
      expect(riff.title).toBe(song.title);
      expect(riff.style).toBe(song.style);
      expect(riff.source).toBe(song.source);
      expect(riff.attribution).toBe(song.attribution);
      expect(riff.level).toBe(song.difficulty === 'easy' ? 1 : song.difficulty === 'medium' ? 3 : 5);
    }
  });

  it('are sensible excerpts: 8 to 24 bars, starting on beat 0 and ending inside their own length', () => {
    for (const song of MOVIE_SONGS) {
      const riff = riffOf(song);
      expect(riff.bars, song.id).toBeGreaterThanOrEqual(8);
      expect(riff.bars, song.id).toBeLessThanOrEqual(24);
      const last = Math.max(...riff.events.map((event) => event.beat + event.duration));
      expect(last, song.id).toBeLessThanOrEqual(riffTotalBeats(riff) + EPSILON);
      expect(Math.min(...riff.events.map((event) => event.beat)), song.id).toBe(0);
    }
  });

  it('keep a 1-line about, written for a person rather than a catalogue', () => {
    for (const song of MOVIE_SONGS) {
      expect(song.about.length, song.id).toBeLessThanOrEqual(190);
      expect(song.about, song.id).not.toMatch(/\n/);
    }
  });
});

describe('physical playability', () => {
  it('keeps every note on the neck: E2 up to the top of the 15th fret on the high string', () => {
    for (const song of MOVIE_SONGS) {
      for (const event of riffOf(song).events) {
        expect(event.fret, song.id).toBeGreaterThanOrEqual(0);
        expect(event.fret, song.id).toBeLessThanOrEqual(15);
        expect(midiOf(event), song.id).toBeGreaterThanOrEqual(40);
        expect(midiOf(event), song.id).toBeLessThanOrEqual(79);
      }
    }
  });

  it('never asks one string to sound two notes at once', () => {
    for (const song of MOVIE_SONGS) {
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
    for (const song of MOVIE_SONGS) {
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
    for (const song of MOVIE_SONGS) {
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

describe('the public-domain pieces', () => {
  it('each name their composer, where the notes came from and a permitted licence', () => {
    const composers: Record<string, string> = {
      'in-the-hall-of-the-mountain-king': 'Grieg',
      'canon-in-d': 'Pachelbel',
      'gymnopedie-no-1': 'Satie',
      'air-on-the-g-string': 'Bach',
      'the-entertainer': 'Joplin',
    };
    for (const [id, composer] of Object.entries(composers)) {
      const attribution = byId(id).attribution ?? '';
      expect(attribution, id).toContain(composer);
      expect(attribution, id).toContain('Mutopia Project ');
      expect(attribution, id).toContain('https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=');
      // Only licences that let an app ship the notes: Public Domain, or CC
      // Attribution (which the attribution itself satisfies). Never ShareAlike
      // or NonCommercial.
      expect(attribution, id).toMatch(/Public Domain|Creative Commons Attribution \d/);
      expect(attribution, id).not.toMatch(/ShareAlike|NonCommercial|Non-Commercial/i);
      expect(attribution, id).toContain('Arranged for guitar by guitarRot');
      expect(attribution, id).toMatch(/\(\d{4}[–-]\d{4}\)/);
    }
  });

  it('use the Public Domain edition wherever there is one: only the Canon is Creative Commons Attribution', () => {
    const cc = PUBLIC_DOMAIN.filter((song) => /Creative Commons/.test(song.attribution ?? ''));
    expect(cc.map((song) => song.id)).toEqual(['canon-in-d']);
  });

  it('carry a composer who died long enough ago to be out of copyright', () => {
    for (const song of PUBLIC_DOMAIN) {
      const died = /\(\d{4}[–-](\d{4})\)/.exec(song.attribution ?? '')?.[1];
      // The chant is anonymous and medieval; everyone else is checked against
      // 1930, a margin inside the rule the catalogue follows (died before 1955,
      // published before 1930).
      if (song.id === 'dies-irae') expect(died, song.id).toBeUndefined();
      else expect(Number(died), song.id).toBeLessThan(1930);
    }
  });

  it('say where the chant was checked and that it is a medieval public-domain melody', () => {
    const attribution = diesIrae.attribution ?? '';
    expect(attribution).toContain('13th century');
    expect(attribution).toContain('https://hymnary.org/tune/dies_irae_plainsong');
    expect(attribution).toContain('public domain');
  });

  /**
   * The first three bars, as the pitches of the Mutopia edition (read from its
   * MIDI file, not from our fingering), moved by the octaves movieTabs.ts
   * describes: `|` between bars, notes in the order they start. If the
   * string-and-fret search ever moved a note, this fails. Bb is written A#, and
   * so on: sharps only.
   */
  const OPENING: Record<string, readonly [string, string, string]> = {
    // Written from the chant itself: C B C A B G A A, twice high.
    'dies-irae': ['C4 B3 C4 A3', 'B3 G3 A3 A3', 'C4 B3 C4 A3'],
    // The theme B C# D E F# D F#, then F C# F, E C E; the right hand, up an octave.
    'in-the-hall-of-the-mountain-king': [
      'B2 C#3 D3 E3 F#3 D3 F#3',
      'F3 C#3 F3 E3 C3 E3',
      'B2 C#3 D3 E3 F#3 D3 F#3 B3',
    ],
    // The ground bass D A B F# | G D G A under the first violin's F# E D C#.
    'canon-in-d': ['D3 A2 B2 F#2', 'G2 D3 G2 A2', 'D3 F#4 A2 E4 B2 D4 F#2 C#4'],
    // A bass G, the melody F# A over it, then the bass D.
    'gymnopedie-no-1': ['G2 F#4 A4', 'D3 G4 F#4 C#4', 'G2 B3 C#4 D4'],
    // F# held over the bass D C# B A, then the flute's run down.
    'air-on-the-g-string': [
      'D3 F#4 D3 C#3 C#3 B2 B2 A2 A2',
      'G2 G2 B4 G4 F#4 G#2 E4 D4 G#2 C#4 D4 A2 C#4 A2 B3 G2 A3 G2',
      'F#2 A4 F#2 E2 D#3 F#4 D#3 C4 B3 B2 E4 D#4 B3 A4 G4',
    ],
    // The tune E C E C E C over the bass C G; then F E in the bass and C D D# above.
    'the-entertainer': [
      'C3 E3 C4 E3 G2 C4 E3 C4',
      'F2 E2 C4 D4 D#4',
      'G2 E4 C4 D4 E4 G2 B3 D4',
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
    it(`${song.title} opens with the notes of its source`, () => {
      expect(openingBars(song, 3)).toEqual(OPENING[song.id]);
    });
  }

  it('keep the time signature and tempo of the edition', () => {
    const edition: Record<string, readonly [readonly [number, number], number]> = {
      'in-the-hall-of-the-mountain-king': [[4, 4], 138],
      'canon-in-d': [[4, 4], 55],
      'gymnopedie-no-1': [[3, 4], 60],
      'air-on-the-g-string': [[4, 4], 72],
      'the-entertainer': [[2, 4], 72],
    };
    for (const [id, [timeSignature, bpm]] of Object.entries(edition)) {
      expect(riffOf(byId(id)).timeSignature, id).toEqual(timeSignature);
      expect(riffOf(byId(id)).bpm, id).toBe(bpm);
    }
  });

  it('give the Canon its ground bass: the same eight bass notes, round and round', () => {
    const riff = riffOf(byId('canon-in-d'));
    const bass = riff.events
      .filter((event) => event.stringIndex <= 2 && midiOf(event) < 52 && event.duration === 1)
      .sort((a, b) => a.beat - b.beat)
      .map((event) => noteName(midiOf(event)));
    expect(bass).toHaveLength(riff.bars * 4);
    for (let i = 8; i < bass.length; i += 1) expect(bass[i], `bass note ${i}`).toBe(bass[i - 8]);
    expect(bass.slice(0, 8)).toEqual(['D', 'A', 'B', 'F#', 'G', 'D', 'G', 'A']);
  });

  it('keep the Canon melody to half notes and quarters before it picks up eighths', () => {
    const riff = riffOf(byId('canon-in-d'));
    const melody = riff.events.filter((event) => midiOf(event) >= 52 && event.beat < 24);
    expect(melody.map((event) => noteName(midiOf(event))).slice(0, 8)).toEqual([
      'F#', 'E', 'D', 'C#', 'B', 'A', 'B', 'C#',
    ]);
    expect(melody.slice(0, 8).every((event) => event.duration === 1)).toBe(true);
  });

  it('sound the Dies irae as the chant does: down a semitone, back up, then 3, up 2, 4, up 2', () => {
    const notes = [...riffOf(diesIrae).events].sort((a, b) => a.beat - b.beat).map(midiOf);
    // Four statements of eight notes; one note to the beat.
    expect(notes).toHaveLength(32);
    const phrase = [-1, 1, -3, 2, -4, 2, 0];
    for (let statement = 0; statement < 4; statement += 1) {
      const start = statement * 8;
      const steps = notes.slice(start + 1, start + 8).map((note, i) => note - (notes[start + i] ?? 0));
      expect(steps, `statement ${statement + 1}`).toEqual(phrase);
    }
    // The chant comes to rest on its final, here A: high twice, then an octave lower.
    expect(notes[7]! % 12).toBe(9);
    expect(notes.slice(0, 16)).toEqual([...notes.slice(0, 8), ...notes.slice(0, 8)]);
    expect(notes.slice(16, 24).map((note) => note + 12)).toEqual(notes.slice(0, 8));
    expect(notes.slice(24)).toEqual(notes.slice(16, 24));
  });
});

describe('the originals', () => {
  function pitchClasses(song: Song): Set<PitchClass> {
    return new Set(riffOf(song).events.map((event) => midiToPitchClass(midiOf(event))));
  }

  /** Notes starting inside a bar, in time order then pitch. */
  function inBar(song: Song, bar: number): TabEvent[] {
    const riff = riffOf(song);
    const length = beatsPerBar(riff.timeSignature);
    return riff.events
      .filter((event) => event.beat >= bar * length - EPSILON && event.beat < (bar + 1) * length - EPSILON)
      .sort((a, b) => a.beat - b.beat || midiOf(a) - midiOf(b));
  }

  it('write only guitarRot as the artist and need no attribution', () => {
    for (const song of ORIGINAL) {
      expect(song.artist).toBe('guitarRot');
      expect(song.attribution).toBeUndefined();
    }
  });

  it('describe a mood and a genre, and name no film, franchise, place, character or composer', () => {
    const names =
      /shire|hobbit|middle[- ]?earth|mordor|gondor|rohan|moria|gandalf|frodo|bilbo|aragorn|tolkien|lord of the rings|last of us|ellie|joel|santaolalla|howard shore|zimmer|dwarf|dwarves|elf\b|elves|jackson|naughty dog|lotr/i;
    for (const song of ORIGINAL) {
      const text = [song.title, song.artist, song.style, song.about, ...song.tags].join(' ');
      expect(text, song.id).not.toMatch(names);
      expect(song.about, song.id).toMatch(/guitarRot original/);
    }
  });

  it('are in the Movies category like the pieces they sit beside', () => {
    for (const song of ORIGINAL) expect(isMovieSong(song), song.id).toBe(true);
  });

  describe('Hillside Jig', () => {
    const G_MAJOR: ReadonlySet<PitchClass> = new Set([7, 9, 11, 0, 2, 4, 6]);

    it('is a 6/8 tune in G major that comes home to G', () => {
      const riff = riffOf(hillsideJig);
      expect(riff.timeSignature).toEqual([6, 8]);
      expect(riff.bars).toBe(16);
      for (const pc of pitchClasses(hillsideJig)) expect(G_MAJOR.has(pc), `pitch class ${pc}`).toBe(true);
      const last = [...riff.events].sort((a, b) => a.beat - b.beat).at(-1) as TabEvent;
      expect(midiToPitchClass(midiOf(last))).toBe(7);
    });

    it('keeps an open-string drone moving under the tune: a bass note on beat 1 and beat 3 of every bar', () => {
      const riff = riffOf(hillsideJig);
      for (let bar = 0; bar < riff.bars - 1; bar += 1) {
        const notes = inBar(hillsideJig, bar);
        for (const beat of [0, 1.5]) {
          const bass = notes.filter(
            (event) => Math.abs(event.beat - (bar * 3 + beat)) < EPSILON && midiOf(event) <= 55,
          );
          expect(bass.length, `bar ${bar + 1} beat ${beat}`).toBeGreaterThanOrEqual(1);
        }
      }
    });

    it('keeps the tune low on the neck: nothing above the seventh fret', () => {
      const melody = riffOf(hillsideJig).events.filter((event) => midiOf(event) >= 52);
      expect(Math.max(...melody.map((event) => event.fret))).toBeLessThanOrEqual(7);
    });
  });

  describe('Hymn for a Stone Hall', () => {
    const E_DORIAN: ReadonlySet<PitchClass> = new Set([4, 6, 7, 9, 11, 1, 2]);

    it('is slow, low and minor: E Dorian, nothing above D4, no faster than 56 BPM', () => {
      const riff = riffOf(hymnForAStoneHall);
      expect(riff.bpm).toBeLessThanOrEqual(56);
      expect(Math.max(...riff.events.map(midiOf))).toBeLessThanOrEqual(62);
      for (const pc of pitchClasses(hymnForAStoneHall)) expect(E_DORIAN.has(pc), `pitch class ${pc}`).toBe(true);
    });

    it('plays only power chords: a root, its fifth and its octave, struck together', () => {
      const riff = riffOf(hymnForAStoneHall);
      const onsets = [...new Set(riff.events.map((event) => event.beat))].sort((a, b) => a - b);
      for (const onset of onsets) {
        const chord = riff.events.filter((event) => event.beat === onset).map(midiOf).sort((a, b) => a - b);
        expect(chord, `beat ${onset}`).toHaveLength(3);
        const [root = 0, fifth = 0, octave = 0] = chord;
        expect([fifth - root, octave - root], `beat ${onset}`).toEqual([7, 12]);
      }
    });

    it('opens and closes on the E power chord', () => {
      const riff = riffOf(hymnForAStoneHall);
      const roots = (beat: number) => Math.min(...riff.events.filter((e) => e.beat === beat).map(midiOf));
      expect(roots(0)).toBe(40);
      expect(roots(riffTotalBeats(riff) - 4)).toBe(40);
    });
  });

  describe('Quiet Ruins', () => {
    const E_DORIAN: ReadonlySet<PitchClass> = new Set([4, 6, 7, 9, 11, 1, 2]);

    it('is slow and sparse: fewer than one note a beat, and a bar with room to breathe', () => {
      const riff = riffOf(quietRuins);
      expect(riff.bpm).toBeLessThanOrEqual(66);
      expect(riff.events.length).toBeLessThan(riffTotalBeats(riff));
      const quietBar = Array.from({ length: riff.bars }, (_, bar) => inBar(quietRuins, bar)).some(
        (notes) => notes.length <= 2,
      );
      expect(quietBar).toBe(true);
    });

    it('lets the open strings ring: at least half its notes are open', () => {
      const events = riffOf(quietRuins).events;
      expect(events.filter((event) => event.fret === 0).length).toBeGreaterThanOrEqual(events.length / 2);
    });

    it('stays in E Dorian and ends ringing on the open E chord', () => {
      for (const pc of pitchClasses(quietRuins)) expect(E_DORIAN.has(pc), `pitch class ${pc}`).toBe(true);
      const lastBar = inBar(quietRuins, riffOf(quietRuins).bars - 1);
      expect(lastBar.map((event) => noteName(midiOf(event)))).toEqual(['E', 'B', 'E']);
    });
  });
});
