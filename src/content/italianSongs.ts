import { rowsToEvents, type TabRow } from './classicalTabs';
import { ROOFTOPS_ROWS, SPANISH_ROMANCE_ROWS, TARANTELLA_ROWS } from './italianTabs';
import { ITALIAN_TAG, type Difficulty, type Song, type SongSection, type StrumPattern } from './songs';
import type { Riff, TimeSignature } from './types';

/*
 * The Italian set: five public-domain Italian songs as chord charts, one
 * public-domain guitar piece as tab, and three guitarRot originals written in
 * an Italian mood.
 *
 * LICENSING. Nothing here transcribes a copyrighted piece, and no title trades
 * on one. The five songs are old Neapolitan and folk songs whose composers died
 * long ago (Cottrau 1879, di Capua 1917, Denza 1922, De Curtis 1937) and whose
 * first publication was before 1930; the chord charts are guitarRot's own
 * harmonisation of those melodies, with no lyrics. The guitar piece is an
 * anonymous 19th-century romance; the tab is guitarRot's own arrangement. The
 * three originals are new tunes; they describe a mood and name no song,
 * recording, film, game or character.
 */

function section(label: string, bars: string): SongSection {
  return { label, bars: bars.trim().split(/\s+/) };
}

/** `italian` puts a song in the category; the other word lets a search for it find the song. */
const ITALIAN = [ITALIAN_TAG, 'italy'];

type ChartSpec = {
  id: string;
  title: string;
  artist: string;
  difficulty: Difficulty;
  style: string;
  key: string;
  bpm: number;
  attribution?: string;
  source: 'public-domain' | 'original';
  tags: readonly string[];
  about: string;
  pattern: StrumPattern;
  timeSignature: TimeSignature;
  sections: readonly SongSection[];
};

function chartSong(spec: ChartSpec): Song {
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
    tags: spec.tags,
    about: spec.about,
    chart: { pattern: spec.pattern, timeSignature: spec.timeSignature, sections: spec.sections },
  };
}

type TabSpec = {
  id: string;
  title: string;
  artist: string;
  difficulty: Difficulty;
  style: string;
  key: string;
  bpm: number;
  bars: number;
  timeSignature: TimeSignature;
  rows: readonly TabRow[];
  source: 'public-domain' | 'original';
  attribution?: string;
  tags: readonly string[];
  about: string;
};

/** The same difficulty-to-level mapping `songToRiff` uses for chart songs. */
const LEVEL: Record<Difficulty, Riff['level']> = { easy: 1, medium: 3, hard: 5 };

function tabSong(spec: TabSpec): Song {
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
    tags: spec.tags,
    about: spec.about,
    riff,
  };
}

const CHART_NOTE = 'The chord chart is guitarRot\'s own harmonisation, with no lyrics.';

// ---------------------------------------------------------------------------
// Public-domain Italian songs, as chord charts. They play on the ukulele too.
// ---------------------------------------------------------------------------

export const santaLucia: Song = chartSong({
  id: 'santa-lucia',
  title: 'Santa Lucia',
  artist: 'Teodoro Cottrau',
  difficulty: 'easy',
  style: 'Neapolitan barcarolle',
  key: 'C',
  bpm: 96,
  source: 'public-domain',
  attribution:
    'Traditional Neapolitan boat song, published by Teodoro Cottrau (1827–1879) in 1849; in the public domain. ' +
    CHART_NOTE,
  tags: [...ITALIAN, 'neapolitan', 'waltz', '3/4', 'public-domain', 'major', 'barcarolle', 'C major'],
  about: 'A boat song from Naples in three-four time: one chord to a bar, with only C, F and G7 to keep track of.',
  pattern: 'downs',
  timeSignature: [3, 4],
  sections: [
    section('Verse', 'C - G7 - G7 - C - C - F - C - G7 - G7 - C -'),
    section('Chorus', 'F - C - G7 - C - F - C - G7 - C -'),
  ],
});

export const oSoleMio: Song = chartSong({
  id: 'o-sole-mio',
  title: 'O sole mio',
  artist: 'Eduardo di Capua',
  difficulty: 'medium',
  style: 'Neapolitan song',
  key: 'C',
  bpm: 70,
  source: 'public-domain',
  attribution:
    'Eduardo di Capua (1865–1917), ‘O sole mio, 1898 (words by Giovanni Capurro, 1859–1920); in the public domain. ' +
    CHART_NOTE,
  tags: [...ITALIAN, 'neapolitan', 'public-domain', 'ballad', 'C major'],
  about: 'The great Neapolitan tune. The verse is simple, then the refrain turns minor for a moment with Am, Dm and E7.',
  pattern: 'folk',
  timeSignature: [4, 4],
  sections: [
    section('Verse', 'C G7 C G7 C F G7 C'),
    section('Refrain', 'F C Dm G7 Am E7 Am G7 C C'),
  ],
});

export const funiculiFunicula: Song = chartSong({
  id: 'funiculi-funicula',
  title: 'Funiculì, Funiculà',
  artist: 'Luigi Denza',
  difficulty: 'medium',
  style: 'Neapolitan tarantella',
  key: 'G',
  bpm: 120,
  source: 'public-domain',
  attribution:
    'Luigi Denza (1846–1922), Funiculì, Funiculà, 1880 (words by Peppino Turco, 1846–1903); in the public domain. ' +
    CHART_NOTE,
  tags: [...ITALIAN, 'neapolitan', 'tarantella', '6/8', 'public-domain', 'lively', 'G major'],
  about: 'Written for the opening of a funicular railway, so it never stops hopping. Strum it in a bouncing 6/8, a bar at a time.',
  pattern: 'eighths',
  timeSignature: [6, 8],
  sections: [
    section('Verse', 'G G D7 D7 G Em Am D7'),
    section('Refrain', 'G C G D G C D7 G'),
  ],
});

export const tornaASurriento: Song = chartSong({
  id: 'torna-a-surriento',
  title: 'Torna a Surriento',
  artist: 'Ernesto De Curtis',
  difficulty: 'medium',
  style: 'Neapolitan song',
  key: 'Em',
  bpm: 66,
  source: 'public-domain',
  attribution:
    'Ernesto De Curtis (1875–1937), Torna a Surriento, 1902 (words by Giambattista De Curtis, 1860–1926); ' +
    'in the public domain in the EU (more than 70 years since the composer’s death) and in the United States (published before 1930). ' +
    CHART_NOTE,
  tags: [...ITALIAN, 'neapolitan', 'public-domain', 'ballad', 'minor', 'E minor'],
  about: 'A slow Neapolitan lament in E minor that opens into G for the refrain. B7 is the chord that makes it sound Italian.',
  pattern: 'folk',
  timeSignature: [4, 4],
  sections: [
    section('Verse', 'Em B7 Em B7 Em Am B7 Em'),
    section('Refrain', 'G D7 G G Am Em B7 Em'),
  ],
});

export const bellaCiao: Song = chartSong({
  id: 'bella-ciao',
  title: 'Bella ciao',
  artist: 'Traditional',
  difficulty: 'easy',
  style: 'Italian folk',
  key: 'Am',
  bpm: 110,
  source: 'public-domain',
  attribution:
    'Traditional Italian folk song; anonymous, its melody related to older folk tunes of the early 1900s, ' +
    'and in the public domain. Chart only: the chords are guitarRot\'s own, with no lyrics.',
  tags: [...ITALIAN, 'folk', 'public-domain', 'minor', 'two-chords', 'A minor'],
  about: 'An Italian folk song on two chords, Am and E7, strummed with the folk pattern. Once the changes are in your hands, sing it.',
  pattern: 'folk',
  timeSignature: [4, 4],
  sections: [
    section('Verse', 'Am Am Am Am E7 E7 Am Am'),
    section('Chorus', 'Am Am E7 E7 Am Am E7 Am'),
  ],
});

// ---------------------------------------------------------------------------
// A public-domain guitar piece, as tab.
// ---------------------------------------------------------------------------

export const spanishRomance: Song = tabSong({
  id: 'spanish-romance',
  title: 'Spanish Romance',
  artist: 'Anonymous',
  difficulty: 'medium',
  style: 'Romantic guitar',
  key: 'Em',
  bpm: 80,
  bars: 16,
  timeSignature: [3, 4],
  rows: SPANISH_ROMANCE_ROWS,
  source: 'public-domain',
  attribution:
    'Romance anónimo (Spanish Romance, also called Romance de amor), an anonymous guitar piece of the 19th century, ' +
    'first recorded between 1897 and 1901; the authorship is unknown and has been claimed for several people, ' +
    'so no author is credited. In the public domain; the first section (E minor), bars 1–16, arranged ' +
    'for guitar by guitarRot. This is not any later arranger’s edition.',
  tags: [...ITALIAN, 'spanish', 'romantic', 'classical', 'fingerpicking', 'public-domain', 'arpeggio', '3/4', 'E minor'],
  about:
    'The famous E minor romance: the tune on the first string, open B and G plucked beneath it, a thumb bass under all. The old-world, candle-lit mood of a Renaissance score.',
});

// ---------------------------------------------------------------------------
// guitarRot originals in Italian moods.
// ---------------------------------------------------------------------------

export const rooftopsOfFlorence: Song = tabSong({
  id: 'rooftops-of-florence',
  title: 'Rooftops of Florence',
  artist: 'guitarRot',
  difficulty: 'medium',
  style: 'Renaissance fingerstyle',
  key: 'Am',
  bpm: 60,
  bars: 16,
  timeSignature: [4, 4],
  rows: ROOFTOPS_ROWS,
  source: 'original',
  tags: [
    ...ITALIAN, 'renaissance', 'original', 'fingerpicking', 'lute', 'arpeggio', 'descending-bass', 'slow',
    'open-strings', 'A minor',
  ],
  about:
    'A guitarRot original: a slow Renaissance-style arpeggio piece for the mood of a Florentine rooftop at dusk.',
});

export const sereDiGiugno: Song = chartSong({
  id: 'sere-di-giugno',
  title: 'Sere di giugno',
  artist: 'guitarRot',
  difficulty: 'medium',
  style: 'Italian pop ballad',
  key: 'C',
  bpm: 100,
  source: 'original',
  tags: [...ITALIAN, 'original', 'pop', 'ballad', 'singer-songwriter', 'strumming', 'C major'],
  about:
    'A guitarRot original: an Italian pop ballad of the kind that filled the 1990s, built on the C, G, Am, F turn that every cantautore knows.',
  pattern: 'folk',
  timeSignature: [4, 4],
  sections: [
    section('Verse', 'C G Am F C G F G'),
    section('Chorus', 'F G Em Am Dm G C C'),
    section('Bridge', 'Am F C G'),
    section('Chorus', 'F G Em Am Dm G C C'),
  ],
});

export const tarantellaInAMinor: Song = tabSong({
  id: 'tarantella-in-a-minor',
  title: 'Tarantella in A minor',
  artist: 'guitarRot',
  difficulty: 'hard',
  style: 'Tarantella',
  key: 'Am',
  bpm: 140,
  bars: 16,
  timeSignature: [6, 8],
  rows: TARANTELLA_ROWS,
  source: 'original',
  tags: [...ITALIAN, 'original', 'tarantella', '6/8', 'fast', 'drone', 'A minor', 'single-notes'],
  about:
    'A guitarRot original: a fast 6/8 dance in A minor, eighth notes on the top strings over an open-string drone, for the energy of a Neapolitan feast.',
});

/** Every song of the Italian set, in the order the catalogue lists them. */
export const ITALIAN_SONGS: readonly Song[] = [
  santaLucia,
  oSoleMio,
  funiculiFunicula,
  tornaASurriento,
  bellaCiao,
  spanishRomance,
  rooftopsOfFlorence,
  sereDiGiugno,
  tarantellaInAMinor,
];
