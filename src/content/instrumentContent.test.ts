import { describe, expect, it } from 'vitest';
import { UKULELE, instrumentIdOf, instrumentOf } from '@/music';
import { ALL_LESSONS, COURSE, courseFor } from './course';
import { chordByName, chartBars, songPlayableOn, songToRiff, validateSong, type Song } from './songs';
import { SONGS, songsFor } from './songCatalog';
import { RIFFS, riffsFor } from './riffs';
import { UKULELE_COURSE } from './ukuleleCourse';
import { validateLesson } from './lessons';
import { validateRiff } from './types';
import { chordsFor } from './chords';

const charts = SONGS.filter((song) => song.chart !== undefined);
const riffSongs = SONGS.filter((song) => song.riff !== undefined);

describe('songs per instrument', () => {
  it('keeps every song on the guitar exactly as before', () => {
    expect(songsFor('guitar')).toEqual(SONGS);
  });

  it('plays a chart song on the ukulele when, and only when, every chord of it has a ukulele shape', () => {
    expect(charts.length).toBeGreaterThan(0);
    for (const song of charts) {
      const chart = song.chart;
      if (chart === undefined) continue;
      const every = chartBars(chart).every((bar) => chordByName(bar.chordName, 'ukulele') !== undefined);
      expect(songPlayableOn(song, 'ukulele'), song.id).toBe(every);
      expect(songsFor('ukulele').includes(song), song.id).toBe(every);
    }
  });

  it('plays every chart song on the ukulele: the library has a shape for every chord any chart names', () => {
    for (const song of charts) expect(songPlayableOn(song, 'ukulele'), song.id).toBe(true);
    expect(charts.filter((song) => songsFor('ukulele').includes(song))).toEqual(charts);
  });

  it('has a ukulele shape for every guitar chord by name but the power chords and the two suspended seconds', () => {
    const ukulele = new Set(chordsFor('ukulele').map((chord) => chord.name));
    const missing = chordsFor('guitar')
      .map((chord) => chord.name)
      .filter((name) => !ukulele.has(name));
    // Power chords are two-note guitar shapes; Dsus2 is note for note the Asus4 the library has (a quiz must not
    // offer two names for one shape); Asus2 has no comfortable first-position shape on four strings.
    expect(missing.sort()).toEqual(['A5', 'Asus2', 'D5', 'Dsus2', 'E5', 'G5']);
  });

  it('has some chart songs to play on the ukulele today, and never a song with a chord it cannot finger', () => {
    const playable = songsFor('ukulele');
    expect(playable.length).toBeGreaterThan(0);
    for (const song of playable) {
      expect(song.chart, song.id).toBeDefined();
      for (const bar of chartBars(song.chart!)) {
        expect(chordByName(bar.chordName, 'ukulele'), `${song.id}: ${bar.chordName}`).toBeDefined();
      }
    }
  });

  it('keeps riff and tab songs on the guitar until a ukulele arrangement exists', () => {
    for (const song of riffSongs) {
      expect(songPlayableOn(song, 'guitar'), song.id).toBe(true);
      expect(songPlayableOn(song, 'ukulele'), song.id).toBe(false);
    }
  });

  it('plays a song that names its instrument on that one alone', () => {
    const arrangement: Song = { ...(charts[0] as Song), id: 'uke-only-test', instrument: 'ukulele' };
    expect(songPlayableOn(arrangement, 'ukulele')).toBe(true);
    expect(songPlayableOn(arrangement, 'guitar')).toBe(false);
  });

  it('turns a chart into a riff of the chosen instrument, played on that instrument\'s own shapes', () => {
    const song = songsFor('ukulele')[0];
    if (song === undefined) throw new Error('no ukulele chart songs');
    const ukulele = songToRiff(song, 'ukulele');
    const guitar = songToRiff(song, 'guitar');

    expect(instrumentIdOf(ukulele)).toBe('ukulele');
    expect(instrumentIdOf(guitar)).toBe('guitar');
    expect(guitar).not.toHaveProperty('instrument');
    // Four strings, and the same bars and tempo as the guitar's.
    expect(Math.max(...ukulele.events.map((event) => event.stringIndex))).toBeLessThan(4);
    expect(ukulele.bars).toBe(guitar.bars);
    expect(ukulele.bpm).toBe(guitar.bpm);
    expect(validateRiff(ukulele)).toEqual([]);
  });

  it('keeps every chart song sound as a ukulele riff', () => {
    for (const song of songsFor('ukulele')) {
      expect(validateSong(song), song.id).toEqual([]);
      const riff = songToRiff(song, 'ukulele');
      expect(validateRiff(riff), song.id).toEqual([]);
      expect(riff.events.length, song.id).toBeGreaterThan(0);
    }
  });

  it('builds a ukulele strum from the shape\'s own frets: G is 0 2 3 2 across the four strings', () => {
    const song = songsFor('ukulele').find(
      (candidate) => candidate.chart?.pattern === 'downs' && chartBars(candidate.chart)[0]?.chordName === 'G',
    );
    if (song === undefined) throw new Error('no ukulele song opening on G with downstrokes');
    const first = songToRiff(song, 'ukulele').events.filter((event) => event.beat < 0.5);
    expect(first.map((event) => [event.stringIndex, event.fret])).toEqual([
      [0, 0],
      [1, 2],
      [2, 3],
      [3, 2],
    ]);
  });
});

describe('riffs and drills per instrument', () => {
  it('keeps the feed riffs on the guitar and has none for the ukulele yet', () => {
    expect(riffsFor('guitar')).toEqual(RIFFS);
    expect(riffsFor('ukulele')).toEqual([]);
  });

  it('writes a ukulele riff on four strings and holds it to the ukulele\'s neck', () => {
    const riff = {
      ...(RIFFS[0] as (typeof RIFFS)[number]),
      id: 'uke-test-riff',
      instrument: 'ukulele' as const,
      events: [{ stringIndex: 3, fret: 3, beat: 0, duration: 1 }],
    };
    expect(validateRiff(riff)).toEqual([]);
    expect(validateRiff({ ...riff, events: [{ stringIndex: 4, fret: 0, beat: 0, duration: 1 }] }).join(' ')).toContain(
      'out-of-range string index',
    );
    expect(validateRiff({ ...riff, events: [{ stringIndex: 0, fret: 16, beat: 0, duration: 1 }] }).join(' ')).toContain(
      'out-of-range fret',
    );
    expect(instrumentOf(riff)).toBe(UKULELE);
  });
});

describe('courses per instrument', () => {
  it('keeps the guitar course exactly as before and has no ukulele lessons yet', () => {
    expect(courseFor('guitar')).toEqual(COURSE);
    expect(courseFor('ukulele')).toEqual(UKULELE_COURSE);
    expect(courseFor('ukulele')).toEqual([]);
  });

  it('keeps lesson ids unique across every course, and a ukulele lesson\'s id prefixed uke-', () => {
    const ids = ALL_LESSONS.map((lesson) => lesson.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const lesson of UKULELE_COURSE) {
      expect(lesson.instrument, lesson.id).toBe('ukulele');
      expect(lesson.id.startsWith('uke-'), lesson.id).toBe(true);
    }
    for (const lesson of COURSE) expect(lesson.id.startsWith('uke-'), lesson.id).toBe(false);
  });

  it('holds a ukulele lesson to the ukulele: its strings, its frets, its own chords', () => {
    const base = { id: 'uke-test', unit: 'Test', title: 'Test', goal: 'Test.' };
    const ukulele = {
      ...base,
      instrument: 'ukulele' as const,
      steps: [
        { kind: 'chord' as const, chordId: 'uke-C' },
        { kind: 'drill' as const, strings: [0, 1, 2, 3], fretRange: [0, 5] as [number, number], count: 4 },
      ],
    };
    expect(validateLesson(ukulele)).toEqual([]);

    const sixthString = { ...ukulele, steps: [{ ...ukulele.steps[1]!, strings: [5] }] };
    expect(validateLesson(sixthString).join(' ')).toContain('real strings');

    const guitarChord = { ...ukulele, steps: [{ kind: 'chord' as const, chordId: 'E-open' }, ukulele.steps[1]!] };
    expect(validateLesson(guitarChord).join(' ')).toContain('guitar chord');

    const unprefixed = { ...ukulele, id: 'chords-one' };
    expect(validateLesson(unprefixed).join(' ')).toContain('uke-');
  });

  it('lists the ukulele its own chords and not the guitar\'s', () => {
    expect(chordsFor('ukulele').every((chord) => instrumentIdOf(chord) === 'ukulele')).toBe(true);
  });
});
