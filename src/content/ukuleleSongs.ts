import { STANDARD_TUNING, fretToMidi, noteName, type Midi } from '@/music';
import { melodyRiff } from './melody';
import { MOVIES_TAG, type Difficulty, type Song } from './songs';
import { beatsPerBar, type Riff } from './types';

/*
 * The ukulele's editions of the guitar's single-note songs.
 *
 * A song written as a line of notes is the same tune on any instrument; only
 * the string-and-fret choices differ. So a ukulele edition is made FROM the
 * guitar song, not typed in again: its notes are read off the guitar tab as
 * pitches (the guitar's tuning says which), moved by the semitones this table
 * names, and put back on the strings by `melodyRiff`, the same lowest-fret
 * search that tabs every melody in the app, on the ukulele's tuning. The tests
 * pin the pitches of the opening bars and hold every edition to its guitar
 * song, so a fingering slip cannot change the music.
 *
 * What a ukulele is not: it has no note below C4 (the C string, open), four
 * strings, and a re-entrant top: the high G sits above the C. Where a tune
 * dips under C4 it is moved up as a whole (a fourth, into F, most often, which
 * also makes the first three frets enough); a note or two that still falls
 * under it is raised an octave. Where a piece is more than a line (a bass
 * beneath a tune, power chords, dense arpeggios) the ukulele has no room for
 * both voices at the pitch they need, and the piece has no ukulele edition:
 * `UKULELE_LEFT_OUT` says which and why.
 */

/** The lowest note a ukulele can sound: the open C string, C4. */
const LOWEST_UKULELE_NOTE: Midi = 60;

export type TuneEdition = {
  /** The ukulele song's id. */
  id: string;
  /** Which guitar song this is an edition of. */
  from: string;
  /** Semitones every note moves, up (positive) or down. */
  shift: number;
  /** The bars of the guitar tab to take, 1-based and inclusive: all of it when absent. */
  bars?: readonly [first: number, last: number];
  /**
   * Where the tune lives when the tab holds a bass under it: only notes at or
   * above this pitch (on the guitar's tuning, before the shift) are the tune.
   * Absent for a tab that is one line already.
   */
  tuneFrom?: Midi;
  /** The key, as the Songs list prints it. */
  key: string;
  difficulty: Difficulty;
  bpm?: number;
  /** A line for a person: why this one is worth playing on a ukulele, and what was changed. */
  about: string;
  /** The sentence added to the guitar song's attribution: what was done to the notes. */
  change: string;
  /** Tags that were true of the guitar tab only because of its key, to be replaced. */
  keyTags?: readonly string[];
};

const EDITIONS: readonly TuneEdition[] = [
  {
    id: 'uke-ode-to-joy',
    from: 'ode-to-joy',
    shift: 5,
    key: 'F',
    difficulty: 'easy',
    about:
      'The classic first melody, heard in Die Hard (1988), a fourth higher than on the guitar so all of it sits in the first three frets. It opens La La Sib Do, then steps back down.',
    change: 'Ukulele edition: the same melody a fourth higher, in F, so the lowest note is the open C string.',
    keyTags: ['C major'],
  },
  {
    id: 'uke-twinkle-twinkle',
    from: 'twinkle-twinkle',
    shift: 0,
    key: 'C',
    difficulty: 'easy',
    about:
      'It opens Do Do Sol Sol La La Sol: a leap of a fifth, then steps. On the ukulele it is nearly all open strings, so it is a good first tune to sing along to.',
    change: 'Ukulele edition: the same melody and key, found on the four strings.',
  },
  {
    id: 'uke-frere-jacques',
    from: 'frere-jacques',
    shift: 5,
    key: 'F',
    difficulty: 'easy',
    about:
      'It opens Fa Sol La Fa, twice over. A fourth higher than on the guitar, so the last bars land on the open C string. A round: start a friend two bars behind you.',
    change: 'Ukulele edition: the same melody a fourth higher, in F, so the lowest note is the open C string.',
    keyTags: ['C major'],
  },
  {
    id: 'uke-mary-had-a-little-lamb',
    from: 'mary-had-a-little-lamb',
    shift: 0,
    key: 'C',
    difficulty: 'easy',
    about:
      'It opens Mi Re Do Re, Mi Mi Mi, and Mi is the open E string. Three of the same note in a row is a fair test of an even picking hand.',
    change: 'Ukulele edition: the same melody and key, found on the four strings.',
  },
  {
    id: 'uke-jingle-bells',
    from: 'jingle-bells',
    shift: 0,
    key: 'C',
    difficulty: 'easy',
    about:
      'The chorus opens Mi Mi Mi, Mi Mi Mi, Mi Sol Do Re Mi. Count the dotted rhythm in the third bar out loud before you play it.',
    change: 'Ukulele edition: the same melody and key, found on the four strings.',
  },
  {
    id: 'uke-au-clair-de-la-lune',
    from: 'au-clair-de-la-lune',
    shift: 5,
    key: 'F',
    difficulty: 'easy',
    about:
      'It opens Fa Fa Fa Sol, La Sol. A fourth higher than on the guitar, and the last line walks down to the open C string, the lowest note a ukulele has.',
    change: 'Ukulele edition: the same melody a fourth higher, in F, so the lowest note is the open C string.',
    keyTags: ['C major'],
  },
  {
    id: 'uke-dies-irae',
    from: 'dies-irae',
    shift: 17,
    key: 'Dm',
    difficulty: 'medium',
    about:
      'The medieval chant behind the opening of The Shining (1980). Eight notes, played slowly: twice high on the A string, then twice an octave lower, near the nut.',
    change:
      'Ukulele edition: the same chant a fourth and an octave higher, in D Dorian, so that the lower statements, an octave below the first, still clear the open C string.',
  },
  {
    id: 'uke-in-the-hall-of-the-mountain-king',
    from: 'in-the-hall-of-the-mountain-king',
    shift: 6,
    bars: [5, 16],
    key: 'Fm',
    difficulty: 'hard',
    bpm: 120,
    about:
      'The theme heard in The Social Network (2010). The quiet low opening is left out (it sits under the ukulele); the climb is in F minor and runs up the neck.',
    change:
      'Ukulele edition: bars 5 to 16 of the guitar tab (the second statement of the theme onward), a tritone higher, in F minor: the opening statement is below the ukulele\'s lowest note and is left out.',
    keyTags: ['B minor'],
  },
  {
    id: 'uke-hillside-jig',
    from: 'hillside-jig',
    shift: 0,
    tuneFrom: 55,
    key: 'G',
    difficulty: 'easy',
    about:
      'A guitarRot original: a lilting 6/8 tune in G for the green-hills mood of an old fantasy film. The ukulele plays the tune alone; the guitar\'s low drones are left out.',
    change:
      'Ukulele edition: the tune of the guitar piece without its drones; the few notes of it below the ukulele\'s lowest are raised an octave.',
    keyTags: ['drone', 'two-voices'],
  },
];

/**
 * Guitar riff songs that have no ukulele edition, and why. Every riff song of
 * the guitar catalogue is either an edition above or a key here (the tests
 * hold that to be true), so a new guitar song has to be answered for.
 */
export const UKULELE_LEFT_OUT: Readonly<Record<string, string>> = {
  'gallop-in-e': 'A palm-muted gallop on the low E string, below the ukulele\'s lowest note.',
  'downstroke-wall': 'Power chords on the low strings, a guitar sound; a ukulele has no strings that low.',
  'bend-and-wail': 'String bends at the twelfth fret of a guitar; a ukulele\'s nylon strings do not bend that way.',
  'hymn-for-a-stone-hall': 'Slow power chords built from the low E string, below the ukulele\'s lowest note.',
  'quiet-ruins': 'Open low strings left ringing under a tune; the bass and the tune need over two octaves between them.',
  'canon-in-d': 'A ground bass under a violin line: together they span 27 semitones, the ukulele has 24.',
  'gymnopedie-no-1': 'A bass note under a melody: together they span 27 semitones, the ukulele has 24, and the bass must stay under the tune.',
  'air-on-the-g-string': 'A walking bass under a melody over three octaves, 180 notes in 12 bars; four strings cannot hold both voices.',
  'the-entertainer': 'A ragtime bass on the beat under the tune; the two span the whole ukulele with the bass above the tune.',
  'bach-prelude-bwv999': 'A bass note ringing under sixteenth-note arpeggios over three octaves.',
  'carcassi-etude-op60-7': 'A walking thumb bass under a repeated top note, over three octaves.',
  'carcassi-etude-op60-3': 'A melody over rolling triplets, three voices at once over three octaves.',
  'mertz-etude-a-minor': 'Four voices at once over three octaves; a ukulele has four strings and no room.',
  'sor-etude-op35-14': 'Two independent voices, a singing top line and a long-note bass, over three octaves.',
  'alternate-picking-ladder': 'A ladder of eighteen notes across six strings; the ukulele has its own scale-run riffs in the feed.',
  'sweep-cascade': 'Five-string sweep arpeggios; a ukulele has four strings and its own arpeggio riffs in the feed.',
  'travis-blues-in-e': 'An alternating thumb bass on the low E and A strings under the tune.',
};

type Tune = { midi: Midi; beat: number; duration: number };

/** The notes of a guitar riff as pitches, in the order they sound: bars `bars` only, the tune only. */
function tuneOf(riff: Riff, bars: readonly [number, number] | undefined, tuneFrom: Midi | undefined): Tune[] {
  const perBar = beatsPerBar(riff.timeSignature);
  const start = bars === undefined ? 0 : (bars[0] - 1) * perBar;
  const end = bars === undefined ? riff.bars * perBar : bars[1] * perBar;

  // The highest note at each moment is the tune; anything under `tuneFrom` is the bass.
  const top = new Map<number, Tune>();
  for (const event of riff.events) {
    if (event.beat < start - 1e-6 || event.beat >= end - 1e-6) continue;
    const midi = fretToMidi(STANDARD_TUNING, event.stringIndex, event.fret);
    if (tuneFrom !== undefined && midi < tuneFrom) continue;
    const beat = event.beat - start;
    const held = top.get(beat);
    if (held === undefined || midi > held.midi) top.set(beat, { midi, beat, duration: event.duration });
  }

  const line = [...top.values()].sort((a, b) => a.beat - b.beat);
  // One voice at a time: a note ends where the next begins.
  return line.map((note, index) => {
    const next = line[index + 1];
    return next === undefined ? note : { ...note, duration: Math.min(note.duration, next.beat - note.beat) };
  });
}

/** `shift` semitones up, and an octave up for whatever is still under the C string. */
function placeOnUkulele(midi: Midi, shift: number): Midi {
  const moved = midi + shift;
  return moved >= LOWEST_UKULELE_NOTE ? moved : moved + 12 * Math.ceil((LOWEST_UKULELE_NOTE - moved) / 12);
}

const EPSILON = 1e-6;

/** Quarter-note lengths as the melody text writes them: 0.25, not 0.25000000001. */
function beats(value: number): string {
  return String(Number(value.toFixed(4)));
}

/**
 * The tune as `melodyRiff` reads it: `NOTE:BEATS` tokens, rests where the tab
 * is silent, through to the end of the last bar.
 */
function melodyText(line: readonly Tune[], shift: number, totalBeats: number): string {
  const tokens: string[] = [];
  let at = 0;
  for (const note of line) {
    if (note.beat - at > EPSILON) tokens.push(`r:${beats(note.beat - at)}`);
    tokens.push(`${noteName(placeOnUkulele(note.midi, shift), { withOctave: true })}:${beats(note.duration)}`);
    at = note.beat + note.duration;
  }
  if (totalBeats - at > EPSILON) tokens.push(`r:${beats(totalBeats - at)}`);
  return tokens.join(' ');
}

const LEVEL: Record<Difficulty, Riff['level']> = { easy: 1, medium: 3, hard: 5 };

/** Drops the tags that named the guitar tab's key, and says the new one. */
function tagsFor(guitar: Song, edition: TuneEdition): string[] {
  const dropped = new Set(edition.keyTags ?? []);
  const keyTag = edition.key.endsWith('m') ? `${edition.key.slice(0, -1)} minor` : `${edition.key} major`;
  return [...new Set([...guitar.tags.filter((tag) => !dropped.has(tag)), keyTag, 'ukulele'])];
}

function ukuleleEdition(guitar: Song, edition: TuneEdition): Song {
  const source = guitar.riff;
  if (source === undefined) throw new Error(`${guitar.id} has no riff to make a ukulele edition of`);
  const perBar = beatsPerBar(source.timeSignature);
  const bars = edition.bars === undefined ? source.bars : edition.bars[1] - edition.bars[0] + 1;
  const line = tuneOf(source, edition.bars, edition.tuneFrom);
  const bpm = edition.bpm ?? guitar.bpm;
  // A tune written for this app has no attribution to carry; a public-domain one keeps its own and says what was done.
  const attribution = guitar.attribution === undefined ? '' : `${guitar.attribution} ${edition.change}`;
  const tags = tagsFor(guitar, edition);

  const riff = melodyRiff({
    id: `uke-${source.id}`,
    instrument: 'ukulele',
    title: guitar.title,
    style: guitar.style,
    level: LEVEL[edition.difficulty],
    bpm,
    timeSignature: source.timeSignature,
    tags,
    source: guitar.source,
    ...(attribution === '' ? {} : { attribution }),
    notes: melodyText(line, edition.shift, bars * perBar),
  });

  return {
    id: edition.id,
    instrument: 'ukulele',
    title: guitar.title,
    artist: guitar.artist,
    difficulty: edition.difficulty,
    style: guitar.style,
    key: edition.key,
    bpm,
    source: guitar.source,
    ...(attribution === '' ? {} : { attribution }),
    ...(guitar.credit === undefined ? {} : { credit: guitar.credit }),
    tags,
    about: edition.about,
    riff,
  };
}

/** What each ukulele edition was made from, for the tests that hold it to its guitar song. */
export const UKULELE_EDITION_SPECS: readonly TuneEdition[] = EDITIONS;

/** The ukulele editions of whichever of these guitar songs have one, in the order of the table above. */
export function ukuleleEditions(guitarSongs: readonly Song[]): Song[] {
  return EDITIONS.flatMap((edition) => {
    const guitar = guitarSongs.find((song) => song.id === edition.from);
    return guitar === undefined ? [] : [ukuleleEdition(guitar, edition)];
  });
}

/**
 * Songs written for the ukulele alone, with no guitar tab to make them from.
 *
 * The Canon's eight-chord ground is a chord chart, not a tune, so it is the one
 * piece whose ukulele form is a strummed song: the harmony is Pachelbel's and
 * in the public domain, the chart is ours. (The guitar's tab of the Canon is a
 * Mutopia edition of both voices, and stays a tab.)
 */
export const UKULELE_CHART_SONGS: readonly Song[] = [
  {
    id: 'uke-canon-in-d',
    instrument: 'ukulele',
    title: 'Canon in D (the chords)',
    artist: 'Johann Pachelbel',
    difficulty: 'medium',
    style: 'Baroque',
    key: 'D',
    bpm: 55,
    source: 'public-domain',
    attribution:
      'Johann Pachelbel (1653\u20131706), Canon in D; the eight-chord ground that repeats under it, in the public domain. The chord chart and its arpeggio are guitarRot\'s.',
    tags: [MOVIES_TAG, 'film', 'classical', 'baroque', 'public-domain', 'arpeggio', 'ground-bass', 'D major', 'ukulele'],
    about:
      'Heard in Ordinary People (1980). The same eight chords go round and round, picked one string at a time; the Bm and F#m are the ones to drill.',
    chart: {
      pattern: 'arpeggio',
      timeSignature: [4, 4],
      sections: [
        { label: 'Ground', bars: ['D', 'A', 'Bm', 'F#m', 'G', 'D', 'G', 'A'] },
        { label: 'Again', bars: ['D', 'A', 'Bm', 'F#m', 'G', 'D', 'G', 'A'] },
      ],
    },
  },
];
