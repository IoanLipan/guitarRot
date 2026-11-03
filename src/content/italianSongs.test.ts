import { describe, expect, it } from 'vitest';
import {
  STANDARD_TUNING,
  fretToMidi,
  midiToOctave,
  midiToPitchClass,
  noteName,
  type PitchClass,
} from '@/music';
import { chordsFor } from './chords';
import {
  ITALIAN_SONGS,
  bellaCiao,
  funiculiFunicula,
  rooftopsOfFlorence,
  santaLucia,
  sereDiGiugno,
  spanishRomance,
  tarantellaInAMinor,
  tornaASurriento,
} from './italianSongs';
import { legatoProblems } from './legato';
import { ALL_SONGS, SONGS, getSong, songsFor } from './songCatalog';
import {
  ITALIAN_TAG,
  chartBars,
  isItalianSong,
  songPlayableOn,
  songToRiff,
  validateSong,
  type Song,
} from './songs';
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

const CHARTS = ITALIAN_SONGS.filter((song) => song.chart !== undefined);
const TABS = ITALIAN_SONGS.filter((song) => song.riff !== undefined);
const PUBLIC_DOMAIN = ITALIAN_SONGS.filter((song) => song.source === 'public-domain');
const ORIGINAL = ITALIAN_SONGS.filter((song) => song.source === 'original');

describe('the Italian songs', () => {
  it('are nine songs: five chord charts and a guitar piece in the public domain, and three originals', () => {
    expect(ITALIAN_SONGS).toHaveLength(9);
    expect(PUBLIC_DOMAIN.map((song) => song.id)).toEqual([
      'santa-lucia',
      'o-sole-mio',
      'funiculi-funicula',
      'torna-a-surriento',
      'bella-ciao',
      'spanish-romance',
    ]);
    expect(ORIGINAL.map((song) => song.id)).toEqual([
      'rooftops-of-florence',
      'sere-di-giugno',
      'tarantella-in-a-minor',
    ]);
    expect(CHARTS).toHaveLength(6);
    expect(TABS).toHaveLength(3);
  });

  it('spread easy, medium and hard', () => {
    expect(new Set(ITALIAN_SONGS.map((song) => song.difficulty))).toEqual(
      new Set(['easy', 'medium', 'hard']),
    );
    expect(santaLucia.difficulty).toBe('easy');
    expect(bellaCiao.difficulty).toBe('easy');
    expect(tarantellaInAMinor.difficulty).toBe('hard');
  });

  it('are in the catalogue once each, found by id, and carry the italian tag', () => {
    const ids = ALL_SONGS.map((song) => song.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const song of ITALIAN_SONGS) {
      expect(ids.filter((id) => id === song.id), song.id).toHaveLength(1);
      expect(getSong(song.id), song.id).toBe(song);
      expect(song.tags, song.id).toContain(ITALIAN_TAG);
      expect(isItalianSong(song), song.id).toBe(true);
    }
  });

  it('are exactly the songs with the italian tag, and the Renaissance one also says so', () => {
    expect(SONGS.filter(isItalianSong).map((song) => song.id)).toEqual(ITALIAN_SONGS.map((song) => song.id));
    expect(ITALIAN_SONGS.filter((song) => song.tags.includes('renaissance')).map((song) => song.id)).toEqual([
      'rooftops-of-florence',
    ]);
  });

  it('validate as songs, with sound tags and a one-line about', () => {
    for (const song of ITALIAN_SONGS) {
      expect(validateSong(song), song.id).toEqual([]);
      expect(new Set(song.tags).size, song.id).toBe(song.tags.length);
      expect(song.about.length, song.id).toBeLessThanOrEqual(190);
      expect(song.about, song.id).not.toMatch(/\n/);
      expect(song.about, song.id).toMatch(/^[A-Z]/);
    }
  });

  it('use no emoji', () => {
    const symbols = /\p{Extended_Pictographic}/u;
    for (const song of ITALIAN_SONGS) {
      const text = [song.title, song.artist, song.style, song.about, song.attribution ?? '', ...song.tags].join(' ');
      expect(text, song.id).not.toMatch(symbols);
    }
  });

  it('name no trademark, game, character or modern song in any title, tag or about line', () => {
    const names = /ezio|assassin|creed|kyd|ubisoft|ramazzotti|cose della vita/i;
    for (const song of ITALIAN_SONGS) {
      const text = [song.title, song.artist, song.style, song.about, ...song.tags].join(' ');
      expect(text, song.id).not.toMatch(names);
    }
  });
});

describe('the chord charts', () => {
  it('use only chords the guitar library has', () => {
    const guitar = new Set(chordsFor('guitar').map((chord) => chord.name));
    for (const song of CHARTS) {
      for (const bar of chartBars(song.chart!)) {
        expect(guitar.has(bar.chordName), `${song.id}: ${bar.chordName}`).toBe(true);
      }
    }
  });

  it('also play on the ukulele, since the ukulele library has every one of their chords', () => {
    for (const song of CHARTS) {
      expect(songPlayableOn(song, 'guitar'), song.id).toBe(true);
      expect(songPlayableOn(song, 'ukulele'), song.id).toBe(true);
      expect(songsFor('ukulele'), song.id).toContain(song);
      expect(validateRiff(songToRiff(song, 'ukulele')), song.id).toEqual([]);
      expect(validateRiff(songToRiff(song, 'guitar')), song.id).toEqual([]);
    }
  });

  it('keep the key and time signature of the song they belong to', () => {
    const shape: Record<string, readonly [readonly [number, number], string, number]> = {
      'santa-lucia': [[3, 4], 'C', 96],
      'o-sole-mio': [[4, 4], 'C', 70],
      'funiculi-funicula': [[6, 8], 'G', 120],
      'torna-a-surriento': [[4, 4], 'Em', 66],
      'bella-ciao': [[4, 4], 'Am', 110],
      'sere-di-giugno': [[4, 4], 'C', 100],
    };
    for (const [id, [timeSignature, key, bpm]] of Object.entries(shape)) {
      const song = ITALIAN_SONGS.find((candidate) => candidate.id === id)!;
      expect(song.chart!.timeSignature, id).toEqual(timeSignature);
      expect(song.key, id).toBe(key);
      expect(song.bpm, id).toBe(bpm);
      // Each starts and ends on its home chord.
      const bars = chartBars(song.chart!);
      expect(bars[0]!.chordName, id).toBe(key);
      expect(bars.at(-1)!.chordName, id).toBe(key);
    }
  });

  it('give Funiculi a 6/8 bar of three beats and the ballad a verse and a chorus', () => {
    expect(beatsPerBar(funiculiFunicula.chart!.timeSignature)).toBe(3);
    expect(songToRiff(funiculiFunicula).bars).toBe(chartBars(funiculiFunicula.chart!).length);
    const labels = sereDiGiugno.chart!.sections.map((part) => part.label);
    expect(labels).toContain('Verse');
    expect(labels).toContain('Chorus');
    // The classic turn: C G Am F in the verse, and a second turn that is F G Em Am.
    const verse = chartBars({ ...sereDiGiugno.chart!, sections: [sereDiGiugno.chart!.sections[0]!] });
    expect(verse.slice(0, 4).map((bar) => bar.chordName)).toEqual(['C', 'G', 'Am', 'F']);
    const chorus = chartBars({ ...sereDiGiugno.chart!, sections: [sereDiGiugno.chart!.sections[1]!] });
    expect(chorus.slice(0, 4).map((bar) => bar.chordName)).toEqual(['F', 'G', 'Em', 'Am']);
  });

  it('carry no lyrics: a chart has bars, not words', () => {
    for (const song of CHARTS) expect(song.chart).not.toHaveProperty('lyrics');
  });

  it('say how Torna a Surriento is public domain in the EU and the US, and name the composers', () => {
    expect(tornaASurriento.attribution).toMatch(/1937/);
    expect(tornaASurriento.attribution).toMatch(/EU/);
    expect(tornaASurriento.attribution).toMatch(/United States/);
    const composers: Record<string, RegExp> = {
      'santa-lucia': /Cottrau.*1827–1879.*1849/,
      'o-sole-mio': /di Capua.*1865–1917.*1898/,
      'funiculi-funicula': /Denza.*1846–1922.*1880/,
      'torna-a-surriento': /De Curtis.*1875–1937.*1902/,
    };
    for (const [id, pattern] of Object.entries(composers)) {
      expect(getSong(id)!.attribution, id).toMatch(pattern);
    }
  });
});

describe('the guitar pieces', () => {
  it('validate as riffs and have no legato problems', () => {
    for (const song of TABS) {
      const riff = riffOf(song);
      expect(validateRiff(riff), `${song.id} riff`).toEqual([]);
      expect(legatoProblems(riff), `${song.id} legato`).toEqual([]);
      expect(validateRiff(songToRiff(song)), `${song.id} playable`).toEqual([]);
      expect(riff.bpm).toBe(song.bpm);
      expect(riff.title).toBe(song.title);
      expect(riff.source).toBe(song.source);
      expect(riff.attribution).toBe(song.attribution);
    }
  });

  it('are guitar-only, 16 bars, starting on beat 0 and ending inside their own length', () => {
    for (const song of TABS) {
      const riff = riffOf(song);
      expect(songPlayableOn(song, 'guitar'), song.id).toBe(true);
      expect(songPlayableOn(song, 'ukulele'), song.id).toBe(false);
      expect(riff.bars, song.id).toBe(16);
      const last = Math.max(...riff.events.map((event) => event.beat + event.duration));
      expect(last, song.id).toBeLessThanOrEqual(riffTotalBeats(riff) + EPSILON);
      expect(Math.min(...riff.events.map((event) => event.beat)), song.id).toBe(0);
    }
  });

  it('keep every note on the neck: E2 up to the top of the 15th fret', () => {
    for (const song of TABS) {
      for (const event of riffOf(song).events) {
        expect(event.fret, song.id).toBeLessThanOrEqual(15);
        expect(midiOf(event), song.id).toBeGreaterThanOrEqual(40);
        expect(midiOf(event), song.id).toBeLessThanOrEqual(79);
      }
    }
  });

  it('never ask one string to sound two notes at once', () => {
    for (const song of TABS) {
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

  it('keep notes that ring together within a five-fret reach', () => {
    for (const song of TABS) {
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

  it('never stretch more than five frets inside one beat', () => {
    for (const song of TABS) {
      const events = riffOf(song).events;
      for (const beat of new Set(events.map((event) => Math.floor(event.beat + EPSILON)))) {
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

/** Notes starting inside a bar, in time order then pitch, as names with octaves. */
function inBar(song: Song, bar: number): string {
  const riff = riffOf(song);
  const length = beatsPerBar(riff.timeSignature);
  return riff.events
    .filter((event) => event.beat >= bar * length - EPSILON && event.beat < (bar + 1) * length - EPSILON)
    .sort((a, b) => a.beat - b.beat || midiOf(a) - midiOf(b))
    .map((event) => `${noteName(midiOf(event))}${midiToOctave(midiOf(event))}`)
    .join(' ');
}

describe('Spanish Romance', () => {
  it('is an anonymous public-domain piece, with no author claimed and no later arranger’s edition used', () => {
    expect(spanishRomance.artist).toBe('Anonymous');
    expect(spanishRomance.source).toBe('public-domain');
    const attribution = spanishRomance.attribution ?? '';
    expect(attribution).toMatch(/anonymous/i);
    expect(attribution).toMatch(/19th century/);
    expect(attribution).toMatch(/arranged\s+for guitar by guitarRot/i);
    expect(attribution).not.toMatch(/ShareAlike|NonCommercial|Mutopia/i);
  });

  it('is the E minor first section: 16 bars of 3/4 at 80, medium', () => {
    const riff = riffOf(spanishRomance);
    expect(riff.timeSignature).toEqual([3, 4]);
    expect(riff.bars).toBe(16);
    expect(riff.bpm).toBe(80);
    expect(spanishRomance.key).toBe('Em');
    expect(spanishRomance.difficulty).toBe('medium');
  });

  /**
   * The pitches of the tune as it is known, with the bass and the two open
   * strings under it, in the order they sound, bar by bar. If a fingering
   * change ever moved a note, this fails.
   */
  const OPENING: Record<number, string> = {
    0: 'E2 B4 B3 G3 B4 B3 G3 B4 B3 G3',
    1: 'E2 B4 B3 G3 A4 B3 G3 G4 B3 G3',
    2: 'E2 G4 B3 G3 F#4 B3 G3 E4 B3 G3',
    3: 'E2 E4 B3 G3 G4 B3 G3 B4 B3 G3',
    4: 'E2 E5 B3 G3 E5 B3 G3 E5 B3 G3',
    5: 'E2 E5 B3 G3 D5 B3 G3 C5 B3 G3',
    6: 'A2 C5 E4 C4 B4 E4 C4 A4 E4 C4',
    8: 'B2 B4 F#4 D#4 C5 F#4 D#4 B4 F#4 D#4',
    9: 'B2 D#5 F#4 D#4 C5 F#4 D#4 B4 F#4 D#4',
    12: 'B2 F#4 B3 A3 F#4 B3 A3 F#4 B3 A3',
    13: 'D#3 F#4 B3 A3 G4 B3 A3 F#4 B3 A3',
    14: 'E3 E4 B3 G3 B2 E4 B3 G3 G2 E4 B3 G3',
    15: 'E2 E4',
  };
  for (const [bar, expected] of Object.entries(OPENING)) {
    it(`sounds bar ${Number(bar) + 1} as the tune does`, () => {
      expect(inBar(spanishRomance, Number(bar))).toBe(expected);
    });
  }

  it('keeps the bass on the three low strings', () => {
    for (const event of riffOf(spanishRomance).events) {
      const pitch = midiOf(event);
      if (pitch <= 50) expect(event.stringIndex, `${pitch}`).toBeLessThanOrEqual(2);
    }
  });

  it('comes home to a held E in the last bar', () => {
    const events = riffOf(spanishRomance).events.filter((event) => event.beat >= 15 * 3);
    expect(events.map((event) => noteName(midiOf(event)))).toEqual(['E', 'E']);
  });
});

describe('the originals', () => {
  function pitchClasses(song: Song): Set<PitchClass> {
    return new Set(riffOf(song).events.map((event) => midiToPitchClass(midiOf(event))));
  }

  it('write only guitarRot as the artist, need no attribution, and say they are originals', () => {
    for (const song of ORIGINAL) {
      expect(song.artist).toBe('guitarRot');
      expect(song.attribution).toBeUndefined();
      expect(song.about).toMatch(/^A guitarRot original: /);
      expect(song.tags).toContain('original');
    }
  });

  describe('Rooftops of Florence', () => {
    const A_MINOR_AND_E: ReadonlySet<PitchClass> = new Set([9, 11, 0, 2, 4, 5, 7, 8, 1]);

    it('is a slow 4/4 piece in A minor, 16 bars, in the Renaissance category', () => {
      const riff = riffOf(rooftopsOfFlorence);
      expect(riff.timeSignature).toEqual([4, 4]);
      expect(riff.bpm).toBe(60);
      expect(riff.bars).toBe(16);
      expect(rooftopsOfFlorence.key).toBe('Am');
      expect(rooftopsOfFlorence.tags).toContain('renaissance');
      expect(rooftopsOfFlorence.about).toBe(
        'A guitarRot original: a slow Renaissance-style arpeggio piece for the mood of a Florentine rooftop at dusk.',
      );
      for (const pc of pitchClasses(rooftopsOfFlorence)) expect(A_MINOR_AND_E.has(pc), `pitch class ${pc}`).toBe(true);
    });

    it('walks the bass down A, G, F, E in its opening four bars', () => {
      const riff = riffOf(rooftopsOfFlorence);
      const bass = riff.events
        .filter((event) => midiOf(event) < 50 && Math.abs((event.beat % 4)) < EPSILON && event.beat < 16)
        .sort((a, b) => a.beat - b.beat)
        .map((event) => noteName(midiOf(event)));
      expect(bass).toEqual(['A', 'G', 'F', 'E']);
    });

    it('opens with the first bar pinned', () => {
      expect(inBar(rooftopsOfFlorence, 0)).toBe('A2 A4 A3 C4 A3 G4 E3 E4 A3 C4 A3');
    });

    it('uses open strings under the tune, and ends on an A major chord (a Picardy third)', () => {
      const events = riffOf(rooftopsOfFlorence).events;
      expect(events.filter((event) => event.fret === 0).length).toBeGreaterThan(events.length / 5);
      expect(inBar(rooftopsOfFlorence, 15)).toBe('A2 E3 A3 C#4 E4');
    });
  });

  describe('Tarantella in A minor', () => {
    it('is a fast 6/8 piece in A minor, 16 bars, hard', () => {
      const riff = riffOf(tarantellaInAMinor);
      expect(riff.timeSignature).toEqual([6, 8]);
      expect(riff.bpm).toBe(140);
      expect(riff.bars).toBe(16);
      expect(tarantellaInAMinor.difficulty).toBe('hard');
      expect(riff.level).toBe(5);
    });

    it('moves in eighth notes, six to a bar, over a drone on the first and fourth', () => {
      const riff = riffOf(tarantellaInAMinor);
      for (let bar = 0; bar < riff.bars - 1; bar += 1) {
        const tune = riff.events.filter(
          (event) => midiOf(event) >= 59 && event.beat >= bar * 3 - EPSILON && event.beat < (bar + 1) * 3 - EPSILON,
        );
        expect(tune, `bar ${bar + 1}`).toHaveLength(6);
        expect(tune.every((event) => Math.abs(event.duration - 0.5) < EPSILON), `bar ${bar + 1}`).toBe(true);
        for (const beat of [0, 1.5]) {
          const drone = riff.events.filter(
            (event) => Math.abs(event.beat - (bar * 3 + beat)) < EPSILON && midiOf(event) <= 55,
          );
          expect(drone.length, `bar ${bar + 1} at ${beat}`).toBe(1);
        }
      }
    });

    it('opens with the tune A C B A C B and ends on a long A', () => {
      expect(inBar(tarantellaInAMinor, 0)).toBe('A2 A4 C5 B4 E2 A4 C5 B4');
      expect(inBar(tarantellaInAMinor, 15)).toBe('A2 A4');
    });
  });
});
