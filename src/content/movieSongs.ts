import { rowsToEvents, type TabRow } from './classicalTabs';
import {
  AIR_ROWS,
  CANON_ROWS,
  DIES_IRAE_ROWS,
  ENTERTAINER_ROWS,
  GYMNOPEDIE_ROWS,
  HILLSIDE_JIG_ROWS,
  MOUNTAIN_KING_ROWS,
  QUIET_RUINS_ROWS,
  STONE_HALL_HYMN_ROWS,
} from './movieTabs';
import { MOVIES_TAG, type Difficulty, type Song } from './songs';
import type { Riff } from './types';

/*
 * The Movies category: six public-domain pieces that famous films used, and
 * three originals written for guitarRot in the mood of a film score.
 *
 * LICENSING. Film scores are under copyright, so nothing here is, quotes or
 * paraphrases one. The six pieces are older than the films that used them
 * (a chant, and works by composers who died before 1930), and the film named
 * in each `about` line is only where the piece was heard: a film's own
 * recording or arrangement is not ours and is not what is taught. Five come
 * from the Mutopia Project (mutopiaproject.org), whose pages were checked and
 * whose licences are recorded in the attributions below; the notes, rhythms
 * and tempi are the editions', the string-and-fret choices are ours. The chant
 * is a few notes long and is written out from the chant itself. The three
 * originals are new melodies and describe only a mood, never a film or a place
 * in one.
 */

const MUTOPIA_PIECE = 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=';

type MutopiaOptions = {
  composer: string;
  dates: string;
  work: string;
  id: number;
  maintainer: string;
  licence: 'Public Domain' | 'Creative Commons Attribution 4.0';
  edition?: string;
  excerpt: string;
};

/**
 * The line for the About sheet when an edition is under a Creative Commons
 * Attribution licence: that licence wants the credit visible "in any
 * reasonable manner", and the attribution above is data nobody sees. A Public
 * Domain edition needs none.
 */
function editionCredit(title: string, opts: MutopiaOptions): string | undefined {
  if (opts.licence === 'Public Domain') return undefined;
  return `${title} edition: ${opts.maintainer}, Mutopia Project, ${opts.licence.replace('Creative Commons Attribution', 'CC BY')}.`;
}

function mutopia(opts: MutopiaOptions): string {
  return (
    `${opts.composer} (${opts.dates}), ${opts.work}. ` +
    `Mutopia Project ${opts.edition ?? 'edition'} (maintainer ${opts.maintainer}), ` +
    `${opts.licence} (${MUTOPIA_PIECE}${opts.id}). ` +
    `${opts.excerpt} Arranged for guitar by guitarRot.`
  );
}

type MovieSpec = {
  id: string;
  title: string;
  artist: string;
  difficulty: Difficulty;
  style: string;
  key: string;
  bpm: number;
  bars: number;
  timeSignature: readonly [number, number];
  rows: readonly TabRow[];
  source: 'public-domain' | 'original';
  attribution?: string;
  credit?: string;
  tags: readonly string[];
  about: string;
};

/** The same difficulty-to-level mapping `songToRiff` uses for chart songs. */
const LEVEL: Record<Difficulty, Riff['level']> = { easy: 1, medium: 3, hard: 5 };

function movieSong(spec: MovieSpec): Song {
  const riff: Riff = {
    id: `piece-${spec.id}`,
    title: spec.title,
    style: spec.style,
    level: LEVEL[spec.difficulty],
    bpm: spec.bpm,
    timeSignature: [spec.timeSignature[0], spec.timeSignature[1]],
    bars: spec.bars,
    events: rowsToEvents(spec.rows),
    tags: [...spec.tags],
    source: spec.source,
    ...(spec.attribution === undefined ? {} : { attribution: spec.attribution }),
  };
  return {
    id: spec.id,
    title: spec.title,
    artist: spec.artist,
    difficulty: spec.difficulty,
    style: spec.style,
    key: spec.key,
    bpm: spec.bpm,
    source: spec.source,
    ...(spec.attribution === undefined ? {} : { attribution: spec.attribution }),
    ...(spec.credit === undefined ? {} : { credit: spec.credit }),
    tags: spec.tags,
    about: spec.about,
    riff,
  };
}

/** `movies` puts a song in the category; `film` lets a search for either word find it. */
const MOVIE_TAGS = [MOVIES_TAG, 'film'];

// ---------------------------------------------------------------------------
// Public-domain pieces that famous films used.
// ---------------------------------------------------------------------------

export const diesIrae: Song = movieSong({
  id: 'dies-irae',
  title: 'Dies Irae',
  artist: 'Gregorian chant',
  difficulty: 'easy',
  style: 'Gregorian chant',
  key: 'Am',
  bpm: 56,
  bars: 8,
  timeSignature: [4, 4],
  rows: DIES_IRAE_ROWS,
  source: 'public-domain',
  attribution:
    'Dies irae, a Gregorian chant sequence of the 13th century (attributed to Thomas of Celano, ' +
    'c. 1200–1265); in the public domain. The first line was checked against the tune DIES IRAE ' +
    '(plainsong) at Hymnary.org, a Public Domain record (https://hymnary.org/tune/dies_irae_plainsong). ' +
    'Written from A, in the Dorian mode; arranged for guitar by guitarRot.',
  tags: [...MOVIE_TAGS, 'chant', 'medieval', 'dorian', 'minor', 'public-domain', 'melody', 'single-notes'],
  about:
    'The medieval chant behind the opening of The Shining (1980). Eight notes, played slowly: twice high, then twice an octave lower.',
});

export const hallOfTheMountainKing: Song = movieSong({
  id: 'in-the-hall-of-the-mountain-king',
  title: 'In the Hall of the Mountain King',
  artist: 'Edvard Grieg',
  difficulty: 'medium',
  style: 'Romantic',
  key: 'Bm',
  bpm: 138,
  bars: 16,
  timeSignature: [4, 4],
  rows: MOUNTAIN_KING_ROWS,
  source: 'public-domain',
  attribution: mutopia({
    composer: 'Edvard Grieg',
    dates: '1843–1907',
    work: 'In the Hall of the Mountain King, from Peer Gynt, Op. 46 No. 4',
    id: 1888,
    maintainer: 'Coyau',
    licence: 'Public Domain',
    excerpt: 'The theme, bars 2–17, as the right hand plays it.',
  }),
  tags: [...MOVIE_TAGS, 'classical', 'public-domain', 'melody', 'single-notes', 'staccato', 'B minor'],
  about:
    'The theme heard in The Social Network (2010). It starts quiet and low, then creeps upward.',
});

const CANON_EDITION: MutopiaOptions = {
  composer: 'Johann Pachelbel',
  dates: '1653–1706',
  work: 'Canon in D (Canon per 3 Violini e Basso)',
  id: 2047,
  maintainer: 'Michael Fischer v. Mollard',
  licence: 'Creative Commons Attribution 4.0',
  excerpt:
    'Bars 1–10: the ground bass of the cello and the melody of the first violin; the end leads straight back to bar 1.',
};

export const canonInD: Song = movieSong({
  id: 'canon-in-d',
  title: 'Canon in D',
  artist: 'Johann Pachelbel',
  difficulty: 'medium',
  style: 'Baroque',
  key: 'D',
  bpm: 55,
  bars: 10,
  timeSignature: [4, 4],
  rows: CANON_ROWS,
  source: 'public-domain',
  attribution: mutopia(CANON_EDITION),
  credit: editionCredit('Canon in D', CANON_EDITION),
  tags: [...MOVIE_TAGS, 'classical', 'baroque', 'public-domain', 'two-voices', 'ground-bass', 'D major'],
  about:
    'Heard in Ordinary People (1980). The same eight bass notes walk round and round under a long, slow melody.',
});

export const gymnopedieNo1: Song = movieSong({
  id: 'gymnopedie-no-1',
  title: 'Gymnopédie No. 1',
  artist: 'Erik Satie',
  difficulty: 'medium',
  style: 'French piano',
  key: 'D',
  bpm: 60,
  bars: 14,
  timeSignature: [3, 4],
  rows: GYMNOPEDIE_ROWS,
  source: 'public-domain',
  attribution: mutopia({
    composer: 'Erik Satie',
    dates: '1866–1925',
    work: 'Gymnopédie No. 1 (1888)',
    id: 37,
    maintainer: 'Evin Robertson',
    licence: 'Public Domain',
    excerpt: 'Bars 5–18: the melody and the bass note of each bar.',
  }),
  tags: [...MOVIE_TAGS, 'classical', 'public-domain', 'two-voices', 'slow', 'waltz', '3/4', 'D major'],
  about:
    'Heard in My Dinner with Andre (1981). A bass note, then the tune floating over it; slow enough that every note has to be clean.',
});

export const airOnTheGString: Song = movieSong({
  id: 'air-on-the-g-string',
  title: 'Air on the G String',
  artist: 'Johann Sebastian Bach',
  difficulty: 'hard',
  style: 'Baroque',
  key: 'D',
  bpm: 72,
  bars: 12,
  timeSignature: [4, 4],
  rows: AIR_ROWS,
  source: 'public-domain',
  attribution: mutopia({
    composer: 'Johann Sebastian Bach',
    dates: '1685–1750',
    work: 'Air from the Orchestral Suite No. 3, BWV 1068',
    id: 1534,
    maintainer: 'Mike Blackstock',
    licence: 'Public Domain',
    edition: 'adaptation for flute and guitar',
    excerpt: 'Bars 1–12: the melody of the flute over the walking bass of the guitar part.',
  }),
  tags: [...MOVIE_TAGS, 'classical', 'baroque', 'public-domain', 'two-voices', 'walking-bass', 'D major'],
  about:
    'Heard in Se7en (1995). A long singing melody over a bass that never stops walking in eighth notes.',
});

export const theEntertainer: Song = movieSong({
  id: 'the-entertainer',
  title: 'The Entertainer',
  artist: 'Scott Joplin',
  difficulty: 'hard',
  style: 'Ragtime',
  key: 'C',
  bpm: 72,
  bars: 16,
  timeSignature: [2, 4],
  rows: ENTERTAINER_ROWS,
  source: 'public-domain',
  attribution: mutopia({
    composer: 'Scott Joplin',
    dates: '1868–1917',
    work: 'The Entertainer (1902)',
    id: 263,
    maintainer: 'Chris Sawer',
    licence: 'Public Domain',
    excerpt:
      'Bars 5–20: the tune and the bass on the beat; the pick-up at the end leads straight back to bar 1.',
  }),
  tags: [...MOVIE_TAGS, 'ragtime', 'public-domain', 'two-voices', 'syncopation', 'C major'],
  about:
    'The rag that became the theme of The Sting (1973). A bouncing bass under a tune that leaps between E and C.',
});

// ---------------------------------------------------------------------------
// Originals in film-score moods. New tunes: none of them quotes, paraphrases or
// echoes a film theme, and they name no film, franchise, place or character.
// ---------------------------------------------------------------------------

export const hillsideJig: Song = movieSong({
  id: 'hillside-jig',
  title: 'Hillside Jig',
  artist: 'guitarRot',
  difficulty: 'medium',
  style: 'Pastoral folk',
  key: 'G',
  bpm: 104,
  bars: 16,
  timeSignature: [6, 8],
  rows: HILLSIDE_JIG_ROWS,
  source: 'original',
  tags: [...MOVIE_TAGS, 'original', 'fantasy', 'jig', '6/8', 'drone', 'G major', 'two-voices'],
  about:
    'A guitarRot original: a lilting 6/8 tune over open-string drones, for the green-hills mood of an old fantasy film.',
});

export const hymnForAStoneHall: Song = movieSong({
  id: 'hymn-for-a-stone-hall',
  title: 'Hymn for a Stone Hall',
  artist: 'guitarRot',
  difficulty: 'easy',
  style: 'Dirge',
  key: 'Em',
  bpm: 52,
  bars: 8,
  timeSignature: [4, 4],
  rows: STONE_HALL_HYMN_ROWS,
  source: 'original',
  tags: [...MOVIE_TAGS, 'original', 'fantasy', 'power-chords', 'slow', 'low', 'dorian', 'E minor'],
  about:
    'A guitarRot original: a slow, low minor hymn in power chords, for the echoing-hall mood of an old fantasy film.',
});

export const quietRuins: Song = movieSong({
  id: 'quiet-ruins',
  title: 'Quiet Ruins',
  artist: 'guitarRot',
  difficulty: 'medium',
  style: 'Ambient fingerstyle',
  key: 'Em',
  bpm: 60,
  bars: 8,
  timeSignature: [4, 4],
  rows: QUIET_RUINS_ROWS,
  source: 'original',
  tags: [...MOVIE_TAGS, 'original', 'fingerpicking', 'sparse', 'open-strings', 'dorian', 'E minor', 'slow'],
  about:
    'A guitarRot original: sparse fingerpicking with the open strings left ringing, for the empty-world mood of a survival drama.',
});

/** Every Movies-category song added by this module; existing songs are tagged in songCatalog.ts. */
export const MOVIE_SONGS: readonly Song[] = [
  diesIrae,
  hillsideJig,
  hymnForAStoneHall,
  quietRuins,
  hallOfTheMountainKing,
  canonInD,
  gymnopedieNo1,
  airOnTheGString,
  theEntertainer,
];
