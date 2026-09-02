import { MAX_FRET, STRING_COUNT } from '@/music';

export type Technique = 'hammer' | 'pull' | 'slide' | 'bend' | 'palmMute';

export type TimeSignature = readonly [number, number];

export type TabEvent = {
  stringIndex: number;
  fret: number;
  /** Quarter-note units from the start of the riff. */
  beat: number;
  /** Length in quarter-note units. */
  duration: number;
  technique?: Technique;
};

export type Riff = {
  id: string;
  title: string;
  style: string;
  level: 1 | 2 | 3 | 4 | 5;
  bpm: number;
  timeSignature: TimeSignature;
  bars: number;
  events: TabEvent[];
  tags: string[];
  source: 'original' | 'public-domain';
  attribution?: string;
};

const EPSILON = 1e-6;

/** Length of one bar in quarter-note units. 6/8 is three quarter notes. */
export function beatsPerBar(timeSignature: TimeSignature): number {
  const [numerator, denominator] = timeSignature;
  return (numerator * 4) / denominator;
}

export function riffTotalBeats(riff: Riff): number {
  return riff.bars * beatsPerBar(riff.timeSignature);
}

/**
 * Returns human-readable problems with a riff; an empty array means it is
 * sound. Riff data is hand-authored, so this is the net that stops a typo
 * producing a note that plays outside its own loop.
 */
/** Denominators that correspond to a real note value (whole through 16th). */
const VALID_TIME_SIGNATURE_DENOMINATORS = new Set([1, 2, 4, 8, 16]);

export function validateRiff(riff: Riff): string[] {
  const errors: string[] = [];

  if (riff.id.trim() === '') errors.push('riff has an empty id');
  if (riff.title.trim() === '') errors.push(`${riff.id}: title must not be blank`);
  if (riff.style.trim() === '') errors.push(`${riff.id}: style must not be blank`);
  if (!Number.isInteger(riff.bars) || riff.bars < 1) {
    errors.push(`${riff.id}: bars must be a positive integer`);
  }
  if (riff.bpm < 30 || riff.bpm > 300) errors.push(`${riff.id}: bpm ${riff.bpm} is implausible`);
  if (riff.source === 'public-domain' && (riff.attribution ?? '').trim() === '') {
    errors.push(`${riff.id}: public-domain material needs an attribution`);
  }

  // A malformed time signature (zero/negative numerator, a denominator that
  // isn't a real note value) makes riffTotalBeats produce a nonsense total
  // (Infinity, NaN, or negative) that would silently defeat every beat-range
  // check below. Catch it here and bail before any of that math runs.
  const [numerator, denominator] = riff.timeSignature;
  if (
    !Number.isInteger(numerator) ||
    numerator <= 0 ||
    !VALID_TIME_SIGNATURE_DENOMINATORS.has(denominator)
  ) {
    errors.push(`${riff.id}: time signature ${numerator}/${denominator} is not valid`);
    return errors;
  }

  if (riff.events.length === 0) {
    errors.push(`${riff.id}: has no events`);
    return errors;
  }

  const total = riffTotalBeats(riff);
  const seen = new Set<string>();

  for (const event of riff.events) {
    const where = `${riff.id}: note on string ${event.stringIndex} at beat ${event.beat}`;

    if (!Number.isInteger(event.stringIndex) || event.stringIndex < 0 || event.stringIndex >= STRING_COUNT) {
      errors.push(`${where} has an out-of-range string index`);
      continue;
    }
    if (!Number.isInteger(event.fret) || event.fret < 0 || event.fret > MAX_FRET) {
      errors.push(`${where} has an out-of-range fret (${event.fret})`);
    }

    if (!Number.isFinite(event.beat)) {
      errors.push(`${where} has a non-finite beat`);
    } else if (event.beat < 0 || event.beat >= total) {
      errors.push(`${where} starts at ${event.beat}, outside the riff's ${total} beats`);
    }

    if (!Number.isFinite(event.duration)) {
      errors.push(`${where} has a non-finite duration`);
    } else if (event.duration <= 0) {
      errors.push(`${where} has a non-positive duration`);
    } else if (Number.isFinite(event.beat) && event.beat + event.duration > total + EPSILON) {
      errors.push(`${where} rings past the end of the riff`);
    }

    // Collision detection is intentionally narrow, and deliberately so:
    // 1. It only flags two events that share both a string and an exact
    //    beat value. It does NOT catch two notes on the same string that
    //    overlap without sharing a start beat (e.g. beat 0 duration 2 vs
    //    beat 1 duration 1) -- that needs a technique-aware model, since
    //    legato phrasing legitimately overlaps, and is deferred to later
    //    content work.
    // 2. The key is a plain string built from `beat`, so it could in
    //    principle treat two floating-point-distinct-but-musically-equal
    //    beats (e.g. from triplets) as different notes. Not reachable with
    //    the current data, so not generalized speculatively.
    const key = `${event.stringIndex}@${event.beat}`;
    if (seen.has(key)) {
      errors.push(`${where} collides with another note on the same string at the same beat`);
    }
    seen.add(key);
  }

  return errors;
}
