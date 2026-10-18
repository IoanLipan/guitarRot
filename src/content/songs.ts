import { CHORDS } from './chords';
import { beatsPerBar, type Riff, type TabEvent, type TimeSignature } from './types';
import { chordStrings, type ChordShape } from '@/music';

export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];

/**
 * How the right hand moves through a bar. Patterns are expressed as beat
 * offsets so they work in any time signature, not just 4/4.
 */
export type StrumPattern = 'downs' | 'eighths' | 'folk' | 'arpeggio';

/**
 * One section of a chord chart. Each entry in `bars` is a chord name from
 * the library, or `-` to hold the previous chord for another bar.
 */
export type SongSection = { label: string; bars: readonly string[] };

export type SongChart = {
  pattern: StrumPattern;
  timeSignature: TimeSignature;
  sections: readonly SongSection[];
};

export type Song = {
  id: string;
  title: string;
  /** Who wrote it. "Traditional" for the folk repertoire. */
  artist: string;
  difficulty: Difficulty;
  style: string;
  /** Home key, for the browser's subtitle line. */
  key: string;
  bpm: number;
  source: 'public-domain' | 'original';
  attribution?: string;
  tags: readonly string[];
  /** One line on why this one is worth your time. */
  about: string;
  /** Chord-chart songs carry a chart; riff songs carry a riff. Never both. */
  chart?: SongChart;
  riff?: Riff;
};

/** `-` in a chart means "hold whatever was ringing". */
export const HOLD = '-';

export function chordByName(name: string): ChordShape | undefined {
  return CHORDS.find((chord) => chord.name === name);
}

/** Every bar of a chart, flattened, with holds resolved to a real chord. */
export type ChartBar = { index: number; section: string; chordName: string; isRepeat: boolean };

export function chartBars(chart: SongChart): ChartBar[] {
  const bars: ChartBar[] = [];
  let last = '';
  for (const section of chart.sections) {
    for (const raw of section.bars) {
      const isRepeat = raw === HOLD;
      const chordName = isRepeat ? last : raw;
      last = chordName;
      bars.push({ index: bars.length, section: section.label, chordName, isRepeat });
    }
  }
  return bars;
}

export function songBarCount(song: Song): number {
  if (song.chart !== undefined) return chartBars(song.chart).length;
  return song.riff?.bars ?? 0;
}

/**
 * The beats within a bar on which the right hand moves. The folk pattern is
 * the standard "D – D U – U D U": the hand never stops, and every hit that
 * falls off the beat is an upstroke (see `isUpstroke`).
 */
export function patternBeats(pattern: StrumPattern, beatsInBar: number): number[] {
  if (pattern === 'folk' && beatsInBar === 4) return [0, 1, 1.5, 2.5, 3, 3.5];
  const step = pattern === 'downs' || pattern === 'folk' ? 1 : 0.5;
  const beats: number[] = [];
  for (let beat = 0; beat < beatsInBar - 1e-9; beat += step) beats.push(beat);
  return beats;
}

/** A hit that lands between beats is the hand coming back up. */
export function isUpstroke(hit: number): boolean {
  return Math.abs(hit - Math.round(hit)) > 1e-6;
}

/** An upstroke brushes only the thin strings; the bass strings are left to ring. */
const UPSTROKE_STRING_COUNT = 4;

/** The strings one stroke picks, in the order the pick meets them. */
export function strokeStrings(strings: readonly number[], hit: number): number[] {
  return isUpstroke(hit) ? strings.slice(-UPSTROKE_STRING_COUNT).reverse() : [...strings];
}

/**
 * Which single string an arpeggio plucks on its nth hit: bass note first,
 * then up and back down the top of the voicing.
 */
function arpeggioString(strings: number[], hit: number): number | undefined {
  const n = strings.length;
  if (n === 0) return undefined;
  const shape = [0, Math.max(0, n - 3), Math.max(0, n - 2), n - 1, Math.max(0, n - 2), Math.max(0, n - 3)];
  return strings[shape[hit % shape.length] ?? 0];
}

/** Beats of lead-in each string of a strum gets, so a chord isn't a block. */
const STRUM_SPREAD_BEATS = 0.02;

/**
 * Turns a chord chart into a playable riff.
 *
 * Doing the conversion here means song playback reuses `createRiffPlayer`
 * whole — including its scheduling, its speed control, and the crash
 * containment around Tone's transport — instead of growing a second,
 * untested audio path.
 */
export function songToRiff(song: Song): Riff {
  if (song.riff !== undefined) return song.riff;
  const chart = song.chart;
  if (chart === undefined) throw new Error(`${song.id}: song has neither a chart nor a riff`);

  const beatsInBar = beatsPerBar(chart.timeSignature);
  const hits = patternBeats(chart.pattern, beatsInBar);
  const events: TabEvent[] = [];

  chartBars(chart).forEach((bar, barIndex) => {
    const shape = chordByName(bar.chordName);
    if (shape === undefined) return;
    const strings = chordStrings(shape);
    const barStart = barIndex * beatsInBar;
    // Which strings each hit of the bar picks, worked out up front so a
    // string's length can be "until it is picked again".
    const picked = hits.map((hit) => strokeStrings(strings, hit));

    hits.forEach((hit, hitIndex) => {
      const nextHit = hits[hitIndex + 1] ?? beatsInBar;
      const span = nextHit - hit;

      if (chart.pattern === 'arpeggio') {
        const stringIndex = arpeggioString(strings, hitIndex);
        const fret = stringIndex === undefined ? undefined : shape.frets[stringIndex];
        if (stringIndex === undefined || fret === null || fret === undefined) return;
        // Arpeggiated notes ring across the next few, which is the whole
        // point of fingerpicking, but never past the end of the song.
        const ring = Math.min(span * 4, beatsInBar - hit);
        events.push({ stringIndex, fret, beat: barStart + hit, duration: ring });
        return;
      }

      (picked[hitIndex] ?? []).forEach((stringIndex, order) => {
        const fret = shape.frets[stringIndex];
        if (fret === null || fret === undefined) return;
        const spread = order * STRUM_SPREAD_BEATS;
        // A string rings until it is picked again, or the bar ends. An
        // upstroke leaves the bass strings alone, so they must carry
        // through it rather than being cut at the next hit.
        const nextPick = picked.findIndex((later, i) => i > hitIndex && later.includes(stringIndex));
        const until = nextPick === -1 ? beatsInBar : (hits[nextPick] ?? beatsInBar);
        events.push({
          stringIndex,
          fret,
          beat: barStart + hit + spread,
          duration: Math.max(0.05, until - hit - spread),
        });
      });
    });
  });

  return {
    id: `song-${song.id}`,
    title: song.title,
    style: song.style,
    level: song.difficulty === 'easy' ? 1 : song.difficulty === 'medium' ? 3 : 5,
    bpm: song.bpm,
    timeSignature: chart.timeSignature,
    bars: chartBars(chart).length,
    source: song.source,
    ...(song.attribution === undefined ? {} : { attribution: song.attribution }),
    tags: [...song.tags],
    events,
  };
}

/** Human-readable problems with a song; an empty array means it is sound. */
export function validateSong(song: Song): string[] {
  const errors: string[] = [];
  const has = (v: unknown) => typeof v === 'string' && v.trim() !== '';

  if (!has(song.id)) errors.push('song has an empty id');
  if (!has(song.title)) errors.push(`${song.id}: title must not be blank`);
  if (!has(song.artist)) errors.push(`${song.id}: artist must not be blank`);
  if (!has(song.about)) errors.push(`${song.id}: about must not be blank`);
  if (!Number.isFinite(song.bpm) || song.bpm < 30 || song.bpm > 300) {
    errors.push(`${song.id}: bpm ${song.bpm} is implausible`);
  }
  // The catalogue's licensing rule, enforced rather than trusted: anything
  // not written for this app has to say where it came from.
  if (song.source === 'public-domain' && !has(song.attribution)) {
    errors.push(`${song.id}: public-domain material needs an attribution`);
  }
  if ((song.chart === undefined) === (song.riff === undefined)) {
    errors.push(`${song.id}: needs exactly one of a chart or a riff`);
    return errors;
  }

  if (song.chart !== undefined) {
    const bars = chartBars(song.chart);
    if (bars.length === 0) errors.push(`${song.id}: chart has no bars`);
    if (bars[0]?.isRepeat === true) errors.push(`${song.id}: chart opens on a hold`);
    for (const bar of bars) {
      if (chordByName(bar.chordName) === undefined) {
        errors.push(`${song.id}: bar ${bar.index + 1} names an unknown chord "${bar.chordName}"`);
      }
    }
  }

  return errors;
}
