import type { Riff, TabEvent } from './types';
import type { InstrumentId } from '@/music';
import { MOVIES_TAG, songPlayableOn, type Song, type SongSection } from './songs';
import { melodyRiff } from './melody';
import { HARD_SONGS } from './hardSongs';
import { MOVIE_SONGS } from './movieSongs';
import { UKULELE_CHART_SONGS, ukuleleEditions } from './ukuleleSongs';

const TRAD = (where: string) => `Traditional ${where}; melody and harmony are in the public domain.`;

function section(label: string, bars: string): SongSection {
  return { label, bars: bars.trim().split(/\s+/) };
}

// ---------------------------------------------------------------------------
// Original technique studies. Written for guitarRot, so they can be shipped,
// shared and remixed freely — and each one drills the right hand of a style
// rather than quoting anybody's song.
// ---------------------------------------------------------------------------

/** Eighth-plus-two-sixteenths on one string: the downpicked gallop. */
function gallop(stringIndex: number, fret: number, beat: number): TabEvent[] {
  return [
    { stringIndex, fret, beat, duration: 0.5, technique: 'palmMute' },
    { stringIndex, fret, beat: beat + 0.5, duration: 0.25, technique: 'palmMute' },
    { stringIndex, fret, beat: beat + 0.75, duration: 0.25, technique: 'palmMute' },
  ];
}

function stab(rootFret: number, beat: number, duration: number): TabEvent[] {
  return [
    { stringIndex: 0, fret: rootFret, beat, duration },
    { stringIndex: 1, fret: rootFret + 2, beat, duration },
  ];
}

const gallopInE: Riff = {
  id: 'study-gallop-in-e',
  title: 'Gallop in E',
  style: 'Thrash metal',
  level: 5,
  bpm: 160,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['downpicking', 'palm-muting', 'metal', 'E minor'],
  events: [
    ...[0, 1, 2].flatMap((b) => gallop(0, 0, b)),
    ...stab(3, 3, 1),
    ...[4, 5, 6].flatMap((b) => gallop(0, 0, b)),
    ...stab(3, 7, 1),
    ...[8, 9, 10].flatMap((b) => gallop(0, 0, b)),
    ...stab(5, 11, 1),
    ...[12, 13, 14].flatMap((b) => gallop(0, 0, b)),
    ...stab(0, 15, 1),
  ],
};

/** Palm-muted straight eighths: the wrist endurance test. */
function wall(rootFret: number, barStart: number): TabEvent[] {
  return [0, 1, 2, 3, 4, 5, 6, 7].flatMap((eighth) => {
    const beat = barStart + eighth * 0.5;
    return [
      { stringIndex: 0, fret: rootFret, beat, duration: 0.5, technique: 'palmMute' as const },
      { stringIndex: 1, fret: rootFret + 2, beat, duration: 0.5, technique: 'palmMute' as const },
    ];
  });
}

const downstrokeWall: Riff = {
  id: 'study-downstroke-wall',
  title: 'Downstroke Wall',
  style: 'Hard rock',
  level: 3,
  bpm: 140,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['power-chords', 'downpicking', 'palm-muting', 'endurance'],
  events: [...wall(0, 0), ...wall(3, 4), ...wall(5, 8), ...wall(0, 12)],
};

const bendAndWail: Riff = {
  id: 'study-bend-and-wail',
  title: 'Bend and Wail',
  style: 'Blues rock',
  level: 4,
  bpm: 92,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['bending', 'pentatonic', 'lead', 'E minor', 'twelfth-position'],
  events: [
    { stringIndex: 3, fret: 14, beat: 0, duration: 1, technique: 'bend' },
    { stringIndex: 4, fret: 12, beat: 1, duration: 0.5 },
    { stringIndex: 3, fret: 14, beat: 1.5, duration: 0.5 },
    { stringIndex: 3, fret: 12, beat: 2, duration: 0.5 },
    { stringIndex: 2, fret: 14, beat: 2.5, duration: 1.5 },
    { stringIndex: 2, fret: 12, beat: 4, duration: 0.5, technique: 'pull' },
    { stringIndex: 3, fret: 14, beat: 4.5, duration: 0.5 },
    { stringIndex: 3, fret: 12, beat: 5, duration: 1 },
    { stringIndex: 4, fret: 15, beat: 6, duration: 2, technique: 'bend' },
    { stringIndex: 5, fret: 12, beat: 8, duration: 0.5 },
    { stringIndex: 5, fret: 15, beat: 8.5, duration: 0.5, technique: 'slide' },
    { stringIndex: 4, fret: 15, beat: 9, duration: 1, technique: 'bend' },
    { stringIndex: 4, fret: 12, beat: 10, duration: 0.5 },
    { stringIndex: 3, fret: 14, beat: 10.5, duration: 1.5 },
    { stringIndex: 3, fret: 12, beat: 12, duration: 0.5 },
    { stringIndex: 2, fret: 14, beat: 12.5, duration: 0.5 },
    { stringIndex: 2, fret: 12, beat: 13, duration: 1, technique: 'pull' },
    { stringIndex: 1, fret: 14, beat: 14, duration: 2 },
  ],
};

// ---------------------------------------------------------------------------
// Public-domain melodies, played as single notes.
//
// Written as pitch names and tabbed by `melodyEvents`, so what gets reviewed
// is the tune itself rather than a column of fret numbers. All six are in
// C major, in 4/4, and sit in first position. Each is checked note for note
// against its tune in songs.test.ts.
// ---------------------------------------------------------------------------

type MelodySongSpec = {
  id: string;
  title: string;
  artist: string;
  style: string;
  bpm: number;
  attribution: string;
  tags: readonly string[];
  about: string;
  notes: string;
};

function melodySong(spec: MelodySongSpec): Song {
  const { notes, ...song } = spec;
  return {
    ...song,
    difficulty: 'easy',
    key: 'C',
    source: 'public-domain',
    riff: melodyRiff({
      id: `melody-${spec.id}`,
      title: spec.title,
      style: spec.style,
      level: 1,
      bpm: spec.bpm,
      tags: [...spec.tags],
      source: 'public-domain',
      attribution: spec.attribution,
      notes,
    }),
  };
}

const MELODY_TAGS = ['melody', 'single-notes', 'first-position', 'C major'];

const odeToJoy = melodySong({
  id: 'ode-to-joy',
  title: 'Ode to Joy',
  artist: 'Ludwig van Beethoven',
  style: 'Classical',
  bpm: 100,
  attribution: 'Ludwig van Beethoven, Symphony No. 9, fourth movement (1824); in the public domain.',
  tags: [...MELODY_TAGS, 'classical', 'stepwise', MOVIES_TAG, 'film'],
  about:
    'The classic first melody, heard in Die Hard (1988). It opens Mi Mi Fa Sol, Sol Fa Mi Re, and almost never leaps, so the fretting hand barely has to travel.',
  notes:
    'E4:1 E4:1 F4:1 G4:1 | G4:1 F4:1 E4:1 D4:1 | C4:1 C4:1 D4:1 E4:1 | E4:1.5 D4:0.5 D4:2 | ' +
    'E4:1 E4:1 F4:1 G4:1 | G4:1 F4:1 E4:1 D4:1 | C4:1 C4:1 D4:1 E4:1 | D4:1.5 C4:0.5 C4:2 | ' +
    'D4:1 D4:1 E4:1 C4:1 | D4:1 E4:0.5 F4:0.5 E4:1 C4:1 | D4:1 E4:0.5 F4:0.5 E4:1 D4:1 | C4:1 D4:1 G3:2 | ' +
    'E4:1 E4:1 F4:1 G4:1 | G4:1 F4:1 E4:1 D4:1 | C4:1 C4:1 D4:1 E4:1 | D4:1.5 C4:0.5 C4:2',
});

const twinkleTwinkle = melodySong({
  id: 'twinkle-twinkle',
  title: 'Twinkle, Twinkle, Little Star',
  artist: 'Traditional',
  style: 'Nursery rhyme',
  bpm: 100,
  attribution:
    'French melody "Ah! vous dirai-je, maman", published in 1761; in the public domain.',
  tags: [...MELODY_TAGS, 'nursery-rhyme', 'repetition'],
  about:
    'It opens Do Do Sol Sol La La Sol: a leap of a fifth, then steps. Sing the solfège as you play and the shape of the tune sticks.',
  notes:
    'C4:1 C4:1 G4:1 G4:1 | A4:1 A4:1 G4:2 | F4:1 F4:1 E4:1 E4:1 | D4:1 D4:1 C4:2 | ' +
    'G4:1 G4:1 F4:1 F4:1 | E4:1 E4:1 D4:2 | G4:1 G4:1 F4:1 F4:1 | E4:1 E4:1 D4:2 | ' +
    'C4:1 C4:1 G4:1 G4:1 | A4:1 A4:1 G4:2 | F4:1 F4:1 E4:1 E4:1 | D4:1 D4:1 C4:2',
});

const frereJacques = melodySong({
  id: 'frere-jacques',
  title: 'Frère Jacques',
  artist: 'Traditional',
  style: 'Nursery rhyme',
  bpm: 100,
  attribution: TRAD('French round'),
  tags: [...MELODY_TAGS, 'round', 'frere-jacques', 'french'],
  about:
    'It opens Do Re Mi Do, twice over. A round: once it is steady, have a friend start the same tune two bars behind you.',
  notes:
    'C4:1 D4:1 E4:1 C4:1 | C4:1 D4:1 E4:1 C4:1 | E4:1 F4:1 G4:2 | E4:1 F4:1 G4:2 | ' +
    'G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4:1 C4:1 | G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4:1 C4:1 | ' +
    'C4:1 G3:1 C4:2 | C4:1 G3:1 C4:2',
});

const maryHadALittleLamb = melodySong({
  id: 'mary-had-a-little-lamb',
  title: 'Mary Had a Little Lamb',
  artist: 'Traditional',
  style: 'Nursery rhyme',
  bpm: 100,
  attribution: TRAD('American nursery song, first published in the 1830s'),
  tags: [...MELODY_TAGS, 'nursery-rhyme', 'repeated-notes'],
  about:
    'It opens Mi Re Do Re, Mi Mi Mi. Three of the same note in a row is a fair test of an even picking hand.',
  notes:
    'E4:1 D4:1 C4:1 D4:1 | E4:1 E4:1 E4:2 | D4:1 D4:1 D4:2 | E4:1 G4:1 G4:2 | ' +
    'E4:1 D4:1 C4:1 D4:1 | E4:1 E4:1 E4:1 E4:1 | D4:1 D4:1 E4:1 D4:1 | C4:4',
});

const jingleBells = melodySong({
  id: 'jingle-bells',
  title: 'Jingle Bells',
  artist: 'James Lord Pierpont',
  style: 'Carol',
  bpm: 110,
  attribution: 'James Lord Pierpont, "One Horse Open Sleigh" (1857), the chorus; in the public domain.',
  tags: [...MELODY_TAGS, 'christmas', 'dotted-rhythm'],
  about:
    'The chorus opens Mi Mi Mi, Mi Mi Mi, Mi Sol Do Re Mi. Count the dotted rhythm in the third bar out loud before you play it.',
  notes:
    'E4:1 E4:1 E4:2 | E4:1 E4:1 E4:2 | E4:1 G4:1 C4:1.5 D4:0.5 | E4:4 | ' +
    'F4:1 F4:1 F4:1.5 F4:0.5 | F4:1 E4:1 E4:1 E4:0.5 E4:0.5 | E4:1 D4:1 D4:1 E4:1 | D4:2 G4:2 | ' +
    'E4:1 E4:1 E4:2 | E4:1 E4:1 E4:2 | E4:1 G4:1 C4:1.5 D4:0.5 | E4:4 | ' +
    'F4:1 F4:1 F4:1.5 F4:0.5 | F4:1 E4:1 E4:1 E4:0.5 E4:0.5 | G4:1 G4:1 F4:1 D4:1 | C4:4',
});

const auClairDeLaLune = melodySong({
  id: 'au-clair-de-la-lune',
  title: 'Au Clair de la Lune',
  artist: 'Traditional',
  style: 'French song',
  bpm: 90,
  attribution: TRAD('French song'),
  tags: [...MELODY_TAGS, 'french', 'lullaby'],
  about:
    'It opens Do Do Do Re, Mi Re. The second half drops to La and Sol on the G string, a first step down off the top two strings.',
  notes:
    'C4:1 C4:1 C4:1 D4:1 | E4:2 D4:2 | C4:1 E4:1 D4:1 D4:1 | C4:4 | ' +
    'C4:1 C4:1 C4:1 D4:1 | E4:2 D4:2 | C4:1 E4:1 D4:1 D4:1 | C4:4 | ' +
    'D4:1 D4:1 D4:1 D4:1 | A3:2 A3:2 | D4:1 C4:1 B3:1 A3:1 | G3:4 | ' +
    'C4:1 C4:1 C4:1 D4:1 | E4:2 D4:2 | C4:1 E4:1 D4:1 D4:1 | C4:4',
});

// ---------------------------------------------------------------------------
// The catalogue.
// ---------------------------------------------------------------------------

export const SONGS: readonly Song[] = [
  // --- Originals ---------------------------------------------------------
  {
    id: 'gallop-in-e',
    title: 'Gallop in E',
    artist: 'guitarRot',
    difficulty: 'hard',
    style: 'Thrash metal',
    key: 'E',
    bpm: 160,
    source: 'original',
    tags: ['metal', 'downpicking', 'palm-muting'],
    about: 'All downstrokes, all picking hand. Start at 60% and only speed up when it stops hurting.',
    riff: gallopInE,
  },
  {
    id: 'downstroke-wall',
    title: 'Downstroke Wall',
    artist: 'guitarRot',
    difficulty: 'medium',
    style: 'Hard rock',
    key: 'E',
    bpm: 140,
    source: 'original',
    tags: ['power-chords', 'downpicking', 'endurance'],
    about: 'Three power chords, sixteen bars of straight eighths. Pure right-hand stamina.',
    riff: downstrokeWall,
  },
  {
    id: 'bend-and-wail',
    title: 'Bend and Wail',
    artist: 'guitarRot',
    difficulty: 'hard',
    style: 'Blues rock',
    key: 'Em',
    bpm: 92,
    source: 'original',
    tags: ['lead', 'bending', 'pentatonic'],
    about: 'Box one at the twelfth fret. The bends are the song — get them in tune or it all falls apart.',
    riff: bendAndWail,
  },
  {
    id: 'slow-burn',
    title: 'Slow Burn',
    artist: 'guitarRot',
    difficulty: 'medium',
    style: 'Post-grunge',
    key: 'Em',
    bpm: 76,
    source: 'original',
    tags: ['arpeggio', 'fingerpicking', 'ballad', 'clean'],
    about: 'The slow clean arpeggio every 90s rock ballad is built on. Let every note ring into the next.',
    chart: {
      pattern: 'arpeggio',
      timeSignature: [4, 4],
      sections: [
        section('Verse', 'Em Em C C G G D D'),
        section('Chorus', 'C C G G D D Em Em'),
      ],
    },
  },

  // --- Public domain -----------------------------------------------------
  {
    id: 'tom-dooley',
    title: 'Tom Dooley',
    artist: 'Traditional',
    difficulty: 'easy',
    style: 'Folk',
    key: 'G',
    bpm: 120,
    source: 'public-domain',
    attribution: TRAD('Appalachian ballad, collected in the 19th century'),
    tags: ['two-chord', 'first-song', 'folk'],
    about: 'Two chords, start to finish. If you have never played a whole song, play this one.',
    chart: {
      pattern: 'folk',
      timeSignature: [4, 4],
      sections: [section('Verse', 'G - D - D - G -'), section('Chorus', 'G - D - D - G -')],
    },
  },
  {
    id: 'down-in-the-valley',
    title: 'Down in the Valley',
    artist: 'Traditional',
    difficulty: 'easy',
    style: 'Folk waltz',
    key: 'G',
    bpm: 100,
    source: 'public-domain',
    attribution: TRAD('American folk song'),
    tags: ['two-chord', 'waltz', '3/4'],
    about: 'A waltz in two chords. Counting to three instead of four is the whole lesson.',
    chart: {
      pattern: 'downs',
      timeSignature: [3, 4],
      sections: [section('Verse', 'G - - - D - - G')],
    },
  },
  {
    id: 'when-the-saints',
    title: 'When the Saints Go Marching In',
    artist: 'Traditional',
    difficulty: 'easy',
    style: 'Gospel',
    key: 'G',
    bpm: 132,
    source: 'public-domain',
    attribution: TRAD('American gospel song, published in the early 20th century'),
    tags: ['three-chord', 'gospel', 'upbeat'],
    about: 'Everybody knows it, which means everybody can hear when you rush. Keep it steady.',
    chart: {
      pattern: 'folk',
      timeSignature: [4, 4],
      sections: [section('Verse', 'G - - - G - D -'), section('Turn', 'D - - - G C G -')],
    },
  },
  {
    id: 'man-of-constant-sorrow',
    title: 'Man of Constant Sorrow',
    artist: 'Traditional',
    difficulty: 'easy',
    style: 'Bluegrass',
    key: 'G',
    bpm: 116,
    source: 'public-domain',
    attribution: 'First published by Dick Burnett in 1913; in the public domain.',
    tags: ['three-chord', 'bluegrass', 'strumming'],
    about: 'Three chords and a story. The G-to-C change is the one to drill.',
    chart: {
      pattern: 'folk',
      timeSignature: [4, 4],
      sections: [section('Verse', 'G - C G G - D -'), section('Refrain', 'G - C G G D G -')],
    },
  },
  {
    id: 'amazing-grace',
    title: 'Amazing Grace',
    artist: 'Traditional',
    difficulty: 'easy',
    style: 'Hymn',
    key: 'G',
    bpm: 84,
    source: 'public-domain',
    attribution: 'Words by John Newton (1779), tune "New Britain" (1835); both in the public domain.',
    tags: ['waltz', 'hymn', 'three-chord', '3/4'],
    about: 'Slow enough that every fumbled change is audible. That is exactly why it teaches you.',
    chart: {
      pattern: 'downs',
      timeSignature: [3, 4],
      sections: [section('Verse', 'G - C G G - D -'), section('Verse 2', 'G - C G G D G -')],
    },
  },
  {
    id: 'oh-susanna',
    title: 'Oh! Susanna',
    artist: 'Stephen Foster',
    difficulty: 'easy',
    style: 'Folk',
    key: 'G',
    bpm: 128,
    source: 'public-domain',
    attribution: 'Written by Stephen Foster in 1848; in the public domain.',
    tags: ['three-chord', 'folk', 'upbeat'],
    about: 'Bouncy and forgiving. Good for practising a strum that swings instead of stomps.',
    chart: {
      pattern: 'folk',
      timeSignature: [4, 4],
      sections: [section('Verse', 'G - - - D - G -'), section('Chorus', 'C - G - G D G -')],
    },
  },
  {
    id: 'aura-lee',
    title: 'Aura Lee',
    artist: 'Traditional',
    difficulty: 'easy',
    style: 'Parlour ballad',
    key: 'G',
    bpm: 88,
    source: 'public-domain',
    attribution: 'Music by George R. Poulton, words by W. W. Fosdick (1861); in the public domain.',
    tags: ['ballad', 'three-chord', 'melodic'],
    about: 'A Civil War parlour song whose melody kept getting borrowed. Slow, sweet, easy.',
    chart: {
      pattern: 'folk',
      timeSignature: [4, 4],
      sections: [section('Verse', 'G - C G G - D -'), section('Verse 2', 'G C G D G - - -')],
    },
  },
  {
    id: 'in-the-pines',
    title: 'In the Pines',
    artist: 'Traditional',
    difficulty: 'easy',
    style: 'Appalachian',
    key: 'A',
    bpm: 96,
    source: 'public-domain',
    attribution: TRAD('Appalachian folk song, collected from the 1870s onward'),
    tags: ['three-chord', 'dark', 'folk'],
    about: 'Bleak and beautiful in three chords. Play it slow and let the A ring.',
    chart: {
      pattern: 'folk',
      timeSignature: [4, 4],
      sections: [section('Verse', 'A - D - A - E -'), section('Refrain', 'A - D - A E A -')],
    },
  },
  {
    id: 'cripple-creek',
    title: 'Cripple Creek',
    artist: 'Traditional',
    difficulty: 'medium',
    style: 'Old-time',
    key: 'A',
    bpm: 150,
    source: 'public-domain',
    attribution: TRAD('American old-time fiddle and banjo tune'),
    tags: ['fast', 'old-time', 'three-chord'],
    about: 'The changes are easy; the tempo is not. This is where clean chord changes get tested.',
    chart: {
      pattern: 'eighths',
      timeSignature: [4, 4],
      sections: [section('A part', 'A - D A A - E A'), section('B part', 'A - - - D A E A')],
    },
  },
  {
    id: 'wayfaring-stranger',
    title: 'Wayfaring Stranger',
    artist: 'Traditional',
    difficulty: 'medium',
    style: 'Spiritual',
    key: 'Am',
    bpm: 72,
    source: 'public-domain',
    attribution: TRAD('American folk spiritual, printed in the early 19th century'),
    tags: ['minor', 'slow', 'spiritual'],
    about: 'Your first minor-key song. The Dm-to-E move at the end is the whole mood.',
    chart: {
      pattern: 'arpeggio',
      timeSignature: [4, 4],
      sections: [section('Verse', 'Am - C - Am - Em -'), section('Turn', 'Dm - Am - E - Am -')],
    },
  },
  {
    id: 'shady-grove',
    title: 'Shady Grove',
    artist: 'Traditional',
    difficulty: 'easy',
    style: 'Old-time',
    key: 'Dm',
    bpm: 112,
    source: 'public-domain',
    attribution: TRAD('Appalachian old-time song, derived from the English ballad "Matty Groves"'),
    tags: ['modal', 'two-chord', 'old-time'],
    about: 'Two chords in Dorian mode — the reason it sounds old rather than sad.',
    chart: {
      pattern: 'folk',
      timeSignature: [4, 4],
      sections: [section('Verse', 'Dm - C - Dm - C Dm'), section('Chorus', 'Dm - C - Dm C Dm -')],
    },
  },
  {
    id: 'drunken-sailor',
    title: 'Drunken Sailor',
    artist: 'Traditional',
    difficulty: 'easy',
    style: 'Sea shanty',
    key: 'Dm',
    bpm: 128,
    source: 'public-domain',
    attribution: TRAD('sea shanty, printed from the 1820s onward'),
    tags: ['modal', 'two-chord', 'shanty'],
    about: 'Two chords, relentless pulse. Built for shouting along at the wrong volume.',
    chart: {
      pattern: 'eighths',
      timeSignature: [4, 4],
      sections: [section('Verse', 'Dm - - - C - Dm -'), section('Chorus', 'Dm - - - C - Dm -')],
    },
  },
  {
    id: 'scarborough-fair',
    title: 'Scarborough Fair',
    artist: 'Traditional',
    difficulty: 'medium',
    style: 'English folk',
    key: 'Am',
    bpm: 96,
    source: 'public-domain',
    attribution: TRAD('English ballad, collected from the 17th century onward'),
    tags: ['waltz', 'modal', 'fingerpicking', '3/4', MOVIES_TAG, 'film'],
    about:
      'On the soundtrack of The Graduate (1967), sung by Simon & Garfunkel; this is the old English tune, not their arrangement. Dorian in 3/4.',
    chart: {
      pattern: 'arpeggio',
      timeSignature: [3, 4],
      sections: [
        section('Verse', 'Am - C G Am - - -'),
        section('Verse 2', 'Am C Am G Am - - -'),
      ],
    },
  },
  {
    id: 'greensleeves',
    title: 'Greensleeves',
    artist: 'Traditional',
    difficulty: 'medium',
    style: 'Renaissance',
    key: 'Am',
    bpm: 100,
    source: 'public-domain',
    attribution: TRAD('English tune, registered in 1580'),
    tags: ['6/8', 'fingerpicking', 'minor', 'renaissance'],
    about: 'Four hundred years old and still the best argument for 6/8 time.',
    chart: {
      pattern: 'arpeggio',
      timeSignature: [6, 8],
      sections: [
        section('A', 'Am - G - Am E - -'),
        section('B', 'C - G - Am E Am -'),
      ],
    },
  },
  {
    id: 'house-of-the-rising-sun',
    title: 'House of the Rising Sun',
    artist: 'Traditional',
    difficulty: 'hard',
    style: 'Folk blues',
    key: 'Am',
    bpm: 76,
    source: 'public-domain',
    attribution: TRAD('American folk ballad, collected in the 1930s from older sources'),
    tags: ['6/8', 'arpeggio', 'minor', 'barre-chord'],
    about: 'The 6/8 arpeggio everybody tries first. The F barre in bar four is why most people stop.',
    chart: {
      pattern: 'arpeggio',
      timeSignature: [6, 8],
      sections: [
        section('Verse', 'Am C D F Am C E -'),
        section('Turn', 'Am C D F Am E Am -'),
      ],
    },
  },
  {
    id: 'st-james-infirmary',
    title: 'St. James Infirmary',
    artist: 'Traditional',
    difficulty: 'medium',
    style: 'Jazz blues',
    key: 'Am',
    bpm: 88,
    source: 'public-domain',
    attribution: TRAD('folk blues descended from the English broadside "The Unfortunate Rake"'),
    tags: ['minor', 'blues', 'slow'],
    about: 'A funeral march you can swing. Drag the beat slightly and it comes alive.',
    chart: {
      pattern: 'folk',
      timeSignature: [4, 4],
      sections: [section('Verse', 'Am - E - Am - Am -'), section('Turn', 'Dm - Am - E - Am -')],
    },
  },
  {
    id: 'streets-of-laredo',
    title: 'Streets of Laredo',
    artist: 'Traditional',
    difficulty: 'easy',
    style: 'Cowboy waltz',
    key: 'G',
    bpm: 92,
    source: 'public-domain',
    attribution: TRAD('American cowboy ballad, itself a rewrite of the Irish "Bard of Armagh"'),
    tags: ['waltz', 'three-chord', '3/4'],
    about: 'A cowboy waltz. Three chords, three beats, no hiding place for a sloppy change.',
    chart: {
      pattern: 'downs',
      timeSignature: [3, 4],
      sections: [section('Verse', 'G - C G G - D -'), section('Verse 2', 'G C G D G - - -')],
    },
  },
  {
    id: 'john-henry',
    title: 'John Henry',
    artist: 'Traditional',
    difficulty: 'easy',
    style: 'Work song',
    key: 'G',
    bpm: 124,
    source: 'public-domain',
    attribution: TRAD('American work song and ballad, collected from the 1900s'),
    tags: ['three-chord', 'driving', 'folk'],
    about: 'A hammer song, so play it like a hammer: dead even, no fills.',
    chart: {
      pattern: 'folk',
      timeSignature: [4, 4],
      sections: [section('Verse', 'G - C G G - D -'), section('Refrain', 'G - C G G D G -')],
    },
  },
  {
    id: 'the-water-is-wide',
    title: 'The Water Is Wide',
    artist: 'Traditional',
    difficulty: 'easy',
    style: 'Scottish folk',
    key: 'G',
    bpm: 80,
    source: 'public-domain',
    attribution: TRAD('Scottish folk song, printed from the 17th century onward'),
    tags: ['slow', 'fingerpicking', 'ballad'],
    about: 'Slow, open and forgiving — the song to play when you want it to sound easy.',
    chart: {
      pattern: 'arpeggio',
      timeSignature: [4, 4],
      sections: [section('Verse', 'G - Em - C - G -'), section('Verse 2', 'G - C - D - G -')],
    },
  },
  {
    id: 'sakura',
    title: 'Sakura',
    artist: 'Traditional',
    difficulty: 'easy',
    style: 'Japanese folk',
    key: 'Am',
    bpm: 76,
    source: 'public-domain',
    attribution: TRAD('Japanese folk song from the Edo period'),
    tags: ['minor', 'slow', 'melodic'],
    about: 'A cherry-blossom song in a scale that is not the one you have been practising.',
    chart: {
      pattern: 'arpeggio',
      timeSignature: [4, 4],
      sections: [section('A', 'Am - - - Am - - -'), section('B', 'Dm - Am - E - Am -')],
    },
  },
  {
    id: 'wildwood-flower',
    title: 'Wildwood Flower',
    artist: 'Traditional',
    difficulty: 'easy',
    style: 'Country',
    key: 'G',
    bpm: 108,
    source: 'public-domain',
    attribution:
      'Melody from "I\'ll Twine \'Mid the Ringlets" by Joseph Philbrick Webster (1860); in the public domain.',
    tags: ['country', 'three-chord', 'flatpicking'],
    about: 'The country flatpicking standard. Learn the changes here, add the melody later.',
    chart: {
      pattern: 'folk',
      timeSignature: [4, 4],
      sections: [section('Verse', 'G - - - G - D -'), section('Chorus', 'G - C G G D G -')],
    },
  },
  {
    id: 'hava-nagila',
    title: 'Hava Nagila',
    artist: 'Traditional',
    difficulty: 'medium',
    style: 'Klezmer',
    key: 'Am',
    bpm: 108,
    source: 'public-domain',
    attribution: TRAD('Hebrew folk melody, based on a Ukrainian Hasidic nigun'),
    tags: ['minor', 'accelerando', 'celebration'],
    about: 'Starts slow, ends fast. Use the speed slider as the arrangement.',
    chart: {
      pattern: 'eighths',
      timeSignature: [4, 4],
      sections: [section('A', 'Am - - - Dm - Am -'), section('B', 'E - Am - Dm E Am -')],
    },
  },

  // --- Public-domain melodies (single notes) -----------------------------
  odeToJoy,
  twinkleTwinkle,
  frereJacques,
  maryHadALittleLamb,
  jingleBells,
  auClairDeLaLune,

  // --- Movies: public-domain film classics and film-mood originals (movieSongs.ts)
  ...MOVIE_SONGS,

  // --- Hard: classical pieces and advanced studies (hardSongs.ts) --------
  ...HARD_SONGS,
];

/**
 * The ukulele's own songs (see ukuleleSongs.ts): its editions of the guitar's
 * single-note songs and the few written for it alone. Each is a separate song
 * with its own id, written for four strings; the guitar's `SONGS` stay
 * exactly as they were.
 */
export const UKULELE_SONGS: readonly Song[] = [...ukuleleEditions(SONGS), ...UKULELE_CHART_SONGS];

/** Every song in the app, whichever instrument it is for. */
export const ALL_SONGS: readonly Song[] = [...SONGS, ...UKULELE_SONGS];

export function getSong(id: string): Song | undefined {
  return ALL_SONGS.find((song) => song.id === id);
}

/** The songs one instrument can play, in catalogue order (see `songPlayableOn`). */
export function songsFor(instrument: InstrumentId): readonly Song[] {
  return ALL_SONGS.filter((song) => songPlayableOn(song, instrument));
}
