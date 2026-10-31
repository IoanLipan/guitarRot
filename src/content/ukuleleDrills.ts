import { melodyRiff } from './melody';
import { songToRiff, type Song, type StrumPattern } from './songs';
import type { Riff, TabEvent, TimeSignature } from './types';

/**
 * Practice material for the ukulele course, written for this app like the
 * guitar's drills (see drills.ts) and found the same way, through `findRiff`.
 * Every riff names `instrument: 'ukulele'`, so its strings, frets and chord
 * shapes are the ukulele's own. The melodies are public-domain tunes, written
 * as pitch names and tabbed by `melodyEvents`; nothing here quotes anybody's
 * song.
 */

// ---------------------------------------------------------------------------
// Open strings.
// ---------------------------------------------------------------------------

/** Names the four strings: G C E A, then back down. */
const openStringsWalk: Riff = {
  id: 'uke-open-strings-walk',
  instrument: 'ukulele',
  title: 'Open strings, up and back',
  style: 'Drill',
  level: 1,
  bpm: 70,
  timeSignature: [4, 4],
  bars: 2,
  source: 'original',
  tags: ['open-strings', 'string-names', 'quarter-notes', 'ukulele'],
  events: [0, 1, 2, 3, 3, 2, 1, 0].map((stringIndex, beat) => ({ stringIndex, fret: 0, beat, duration: 1 })),
};

/** One downstroke on every beat across the four open strings. */
const openStrum: Riff = {
  id: 'uke-open-strum',
  instrument: 'ukulele',
  title: 'Open strings, four downstrokes',
  style: 'Drill',
  level: 1,
  bpm: 70,
  timeSignature: [4, 4],
  bars: 4,
  source: 'original',
  tags: ['strumming', 'downstrokes', 'open-strings', 'ukulele'],
  events: Array.from({ length: 16 }, (_, beat) =>
    [0, 1, 2, 3].map((stringIndex): TabEvent => ({ stringIndex, fret: 0, beat: beat + stringIndex * 0.02, duration: 1 - stringIndex * 0.02 })),
  ).flat(),
};

// ---------------------------------------------------------------------------
// Chord changes, strummed and picked.
//
// Built from a chart through `songToRiff` on the ukulele's shapes, so a drill
// strums exactly the way the Songs tab does. The riff id is the drill's own.
// ---------------------------------------------------------------------------

function chartDrill(spec: {
  id: string;
  title: string;
  pattern: StrumPattern;
  /** Space-separated chord names, one per bar. */
  bars: string;
  bpm: number;
  level: Riff['level'];
  tags: string[];
  timeSignature?: TimeSignature;
}): Riff {
  const bars = spec.bars.split(' ');
  const song: Song = {
    id: spec.id,
    instrument: 'ukulele',
    title: spec.title,
    artist: 'guitarRot',
    difficulty: 'easy',
    style: 'Drill',
    key: bars[0] ?? '',
    bpm: spec.bpm,
    source: 'original',
    tags: [...spec.tags, 'ukulele'],
    about: spec.title,
    chart: { pattern: spec.pattern, timeSignature: spec.timeSignature ?? [4, 4], sections: [{ label: 'Drill', bars }] },
  };
  return { ...songToRiff(song, 'ukulele'), id: spec.id, level: spec.level };
}

const cFourDowns = chartDrill({
  id: 'uke-c-four-downs',
  title: 'C, four downstrokes',
  pattern: 'downs',
  bars: 'C C C C',
  bpm: 70,
  level: 1,
  tags: ['strumming', 'downstrokes', 'C', 'one-chord'],
});

const cAmChange = chartDrill({
  id: 'uke-c-am-change',
  title: 'C to Am',
  pattern: 'downs',
  bars: 'C C Am Am C C Am Am',
  bpm: 70,
  level: 1,
  tags: ['chord-change', 'downstrokes', 'C', 'Am'],
});

const amFChange = chartDrill({
  id: 'uke-am-f-change',
  title: 'Am to F',
  pattern: 'downs',
  bars: 'Am Am F F Am Am F F',
  bpm: 70,
  level: 1,
  tags: ['chord-change', 'downstrokes', 'Am', 'F'],
});

const cFChange = chartDrill({
  id: 'uke-c-f-change',
  title: 'C to F',
  pattern: 'downs',
  bars: 'C C F F C C F F',
  bpm: 70,
  level: 1,
  tags: ['chord-change', 'downstrokes', 'C', 'F'],
});

const cGChange = chartDrill({
  id: 'uke-c-g-change',
  title: 'C to G',
  pattern: 'downs',
  bars: 'C C G G C C G G',
  bpm: 70,
  level: 2,
  tags: ['chord-change', 'downstrokes', 'C', 'G'],
});

const cG7Change = chartDrill({
  id: 'uke-c-g7-change',
  title: 'C to G7',
  pattern: 'downs',
  bars: 'C C G7 G7 C C G7 G7',
  bpm: 70,
  level: 1,
  tags: ['chord-change', 'downstrokes', 'C', 'G7'],
});

const islandC = chartDrill({
  id: 'uke-island-c',
  title: 'Island strum on C',
  pattern: 'folk',
  bars: 'C C C C',
  bpm: 70,
  level: 1,
  tags: ['strumming', 'island-strum', 'C', 'one-chord'],
});

const fourChordLoop = chartDrill({
  id: 'uke-c-am-f-g-loop',
  title: 'The four-chord loop: C, Am, F, G',
  pattern: 'downs',
  bars: 'C Am F G C Am F G',
  bpm: 70,
  level: 2,
  tags: ['chord-change', 'downstrokes', 'C', 'Am', 'F', 'G', 'four-chord'],
});

const islandLoop = chartDrill({
  id: 'uke-island-loop',
  title: 'Island strum on C, Am, F, G',
  pattern: 'folk',
  bars: 'C Am F G C Am F G',
  bpm: 70,
  level: 2,
  tags: ['strumming', 'island-strum', 'C', 'Am', 'F', 'G', 'four-chord'],
});

const dmAmChange = chartDrill({
  id: 'uke-dm-am-change',
  title: 'Dm to Am',
  pattern: 'downs',
  bars: 'Dm Dm Am Am Dm Dm Am Am',
  bpm: 70,
  level: 2,
  tags: ['chord-change', 'downstrokes', 'Dm', 'Am'],
});

const dmCChange = chartDrill({
  id: 'uke-dm-c-change',
  title: 'Dm to C',
  pattern: 'downs',
  bars: 'Dm Dm C C Dm Dm C C',
  bpm: 70,
  level: 2,
  tags: ['chord-change', 'downstrokes', 'Dm', 'C'],
});

const cC7Change = chartDrill({
  id: 'uke-c-c7-change',
  title: 'C, C7 and F',
  pattern: 'downs',
  bars: 'C C C7 C7 F F C C',
  bpm: 70,
  level: 1,
  tags: ['chord-change', 'downstrokes', 'C', 'C7', 'F', 'seventh'],
});

const dmA7Change = chartDrill({
  id: 'uke-dm-a7-change',
  title: 'Dm to A7',
  pattern: 'downs',
  bars: 'Dm Dm A7 A7 Dm Dm A7 A7',
  bpm: 70,
  level: 2,
  tags: ['chord-change', 'downstrokes', 'Dm', 'A7', 'seventh'],
});

/**
 * The chop: down on 1 and 3 so the strings ring, down on 2 and 4 with the hand
 * pressing them dead at once, so those strokes are short and muted.
 */
function chop(riff: Riff, id: string, title: string): Riff {
  return {
    ...riff,
    id,
    title,
    tags: [...riff.tags, 'chop', 'muting'],
    events: riff.events.map((event) =>
      Math.floor(event.beat) % 2 === 1 ? { ...event, duration: 0.12, technique: 'palmMute' as const } : event,
    ),
  };
}

const chopCG7 = chop(
  chartDrill({
    id: 'uke-chop-c-g7',
    title: 'Chop on C and G7',
    pattern: 'downs',
    bars: 'C C G7 G7 C C G7 G7',
    bpm: 70,
    level: 2,
    tags: ['strumming', 'C', 'G7'],
  }),
  'uke-chop-c-g7',
  'Strum and chop on C and G7',
);

const waltzGCD = chartDrill({
  id: 'uke-waltz-g-c-d',
  title: 'Waltz on G, C and D',
  pattern: 'downs',
  bars: 'G G C C G D G G',
  bpm: 84,
  level: 2,
  tags: ['waltz', 'downstrokes', 'G', 'C', 'D', '3/4'],
  timeSignature: [3, 4],
});

const oneFourFiveC = chartDrill({
  id: 'uke-one-four-five-c',
  title: 'C, F and G7: I, IV and V',
  pattern: 'downs',
  bars: 'C C F F G7 G7 C C',
  bpm: 76,
  level: 2,
  tags: ['chord-change', 'downstrokes', 'C', 'F', 'G7', 'one-four-five'],
});

const oneFourFiveG = chartDrill({
  id: 'uke-one-four-five-g',
  title: 'G, C and D: I, IV and V',
  pattern: 'downs',
  bars: 'G G C C D D G G',
  bpm: 76,
  level: 2,
  tags: ['chord-change', 'downstrokes', 'G', 'C', 'D', 'one-four-five'],
});

const fingerpickC = chartDrill({
  id: 'uke-fingerpick-c',
  title: 'Fingerpicking on C',
  pattern: 'arpeggio',
  bars: 'C C C C',
  bpm: 66,
  level: 2,
  tags: ['fingerpicking', 'arpeggio', 'C', 'one-chord'],
});

const fingerpickLoop = chartDrill({
  id: 'uke-fingerpick-loop',
  title: 'Fingerpicking on C, Am, F, G',
  pattern: 'arpeggio',
  bars: 'C Am F G C Am F G',
  bpm: 66,
  level: 3,
  tags: ['fingerpicking', 'arpeggio', 'C', 'Am', 'F', 'G', 'four-chord'],
});

const oneFourFiveF = chartDrill({
  id: 'uke-one-four-five-f',
  title: 'F, Bb and C: I, IV and V',
  pattern: 'downs',
  bars: 'F F Bb Bb C C F F',
  bpm: 66,
  level: 3,
  tags: ['chord-change', 'downstrokes', 'F', 'Bb', 'C', 'one-four-five'],
});

const fBbChange = chartDrill({
  id: 'uke-f-bb-change',
  title: 'F to Bb',
  pattern: 'downs',
  bars: 'F F Bb Bb F F Bb Bb',
  bpm: 66,
  level: 3,
  tags: ['chord-change', 'downstrokes', 'F', 'Bb', 'barre'],
});

// ---------------------------------------------------------------------------
// Single notes: the E and A strings, then two public-domain tunes.
// ---------------------------------------------------------------------------

function melodyDrill(spec: {
  id: string;
  title: string;
  level: Riff['level'];
  bpm: number;
  tags: string[];
  notes: string;
  onString?: number;
  source?: 'original' | 'public-domain';
  attribution?: string;
}): Riff {
  const { onString, source = 'original', attribution, ...rest } = spec;
  return melodyRiff({
    ...rest,
    instrument: 'ukulele',
    style: 'Drill',
    source,
    ...(attribution === undefined ? {} : { attribution }),
    ...(onString === undefined ? {} : { onString }),
  });
}

/** The first four notes of the E string: open, then frets 1, 3 and 5. */
const eStringLandmarks = melodyDrill({
  id: 'uke-e-string-landmarks',
  title: 'E string: Mi Fa Sol La',
  level: 1,
  bpm: 70,
  tags: ['single-notes', 'E-string', 'fret-landmarks', 'natural-notes', 'ukulele'],
  notes: 'E4:1 F4:1 G4:1 A4:1 | A4:1 G4:1 F4:1 E4:1',
  onString: 2,
});

/** The A string's natural notes, open to fret 7. */
const aStringLandmarks = melodyDrill({
  id: 'uke-a-string-landmarks',
  title: 'A string: La Si Do Re Mi',
  level: 1,
  bpm: 70,
  tags: ['single-notes', 'A-string', 'fret-landmarks', 'natural-notes', 'ukulele'],
  notes: 'A4:1 B4:1 C5:1 D5:1 | E5:1 D5:1 C5:1 B4:1 | A4:4',
  onString: 3,
});

const TWINKLE_ATTRIBUTION = 'French melody "Ah! vous dirai-je, maman", published in 1761; in the public domain.';

/** The whole of the tune, in first position on the ukulele: mostly open strings. */
const twinkle = melodyDrill({
  id: 'uke-twinkle',
  title: 'Twinkle, Twinkle, Little Star',
  level: 1,
  bpm: 90,
  tags: ['melody', 'single-notes', 'first-position', 'C major', 'nursery-rhyme', 'ukulele'],
  source: 'public-domain',
  attribution: TWINKLE_ATTRIBUTION,
  notes:
    'C4:1 C4:1 G4:1 G4:1 | A4:1 A4:1 G4:2 | F4:1 F4:1 E4:1 E4:1 | D4:1 D4:1 C4:2 | ' +
    'G4:1 G4:1 F4:1 F4:1 | E4:1 E4:1 D4:2 | G4:1 G4:1 F4:1 F4:1 | E4:1 E4:1 D4:2 | ' +
    'C4:1 C4:1 G4:1 G4:1 | A4:1 A4:1 G4:2 | F4:1 F4:1 E4:1 E4:1 | D4:1 D4:1 C4:2',
});

/** The opening phrase of the tune, four bars. */
const odeToJoy = melodyDrill({
  id: 'uke-ode-to-joy',
  title: 'Ode to Joy, first phrase',
  level: 2,
  bpm: 90,
  tags: ['melody', 'single-notes', 'first-position', 'C major', 'classical', 'stepwise', 'ukulele'],
  source: 'public-domain',
  attribution: 'Ludwig van Beethoven, Symphony No. 9, fourth movement (1824); in the public domain.',
  notes: 'E4:1 E4:1 F4:1 G4:1 | G4:1 F4:1 E4:1 D4:1 | C4:1 C4:1 D4:1 E4:1 | E4:1.5 D4:0.5 D4:2',
});

// ---------------------------------------------------------------------------
// The re-entrant scale.
// ---------------------------------------------------------------------------

/**
 * C up to A and back, each note left ringing over the next wherever the next
 * note is on another string: that is the whole idea of "campanella". Where the
 * next note is on the same string it must cut the old one, so it keeps one beat.
 */
function campanella(): Riff {
  const base = melodyRiff({
    id: 'uke-campanella-scale',
    instrument: 'ukulele',
    title: 'The ringing scale: C up to A and back',
    style: 'Drill',
    level: 2,
    bpm: 66,
    tags: ['single-notes', 'campanella', 'scale', 'C major', 're-entrant', 'ukulele'],
    source: 'original',
    notes: 'C4:1 D4:1 E4:1 F4:1 | G4:1 A4:1 A4:1 G4:1 | F4:1 E4:1 D4:1 C4:1',
  });
  const total = base.bars * 4;
  return {
    ...base,
    events: base.events.map((event, i) => {
      const next = base.events[i + 1];
      const ringing = next !== undefined && next.stringIndex !== event.stringIndex;
      return ringing ? { ...event, duration: Math.min(2.5, total - event.beat) } : event;
    }),
  };
}

export const UKULELE_DRILLS: readonly Riff[] = [
  openStringsWalk,
  openStrum,
  cFourDowns,
  cAmChange,
  amFChange,
  cFChange,
  cGChange,
  cG7Change,
  islandC,
  fourChordLoop,
  islandLoop,
  dmAmChange,
  dmCChange,
  cC7Change,
  dmA7Change,
  chopCG7,
  waltzGCD,
  oneFourFiveC,
  oneFourFiveG,
  oneFourFiveF,
  fingerpickC,
  fingerpickLoop,
  fBbChange,
  eStringLandmarks,
  aStringLandmarks,
  twinkle,
  odeToJoy,
  campanella(),
];
