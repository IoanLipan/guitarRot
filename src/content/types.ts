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
export function validateRiff(riff: Riff): string[] {
  const errors: string[] = [];

  if (riff.id.trim() === '') errors.push('riff has an empty id');
  if (riff.bars < 1) errors.push(`${riff.id}: bars must be at least 1`);
  if (riff.bpm < 30 || riff.bpm > 300) errors.push(`${riff.id}: bpm ${riff.bpm} is implausible`);
  if (riff.source === 'public-domain' && (riff.attribution ?? '').trim() === '') {
    errors.push(`${riff.id}: public-domain material needs an attribution`);
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
    if (event.beat < 0 || event.beat >= total) {
      errors.push(`${where} starts at ${event.beat}, outside the riff's ${total} beats`);
    }
    if (event.duration <= 0) {
      errors.push(`${where} has a non-positive duration`);
    } else if (event.beat + event.duration > total + EPSILON) {
      errors.push(`${where} rings past the end of the riff`);
    }

    const key = `${event.stringIndex}@${event.beat}`;
    if (seen.has(key)) {
      errors.push(`${where} collides with another note on the same string at the same beat`);
    }
    seen.add(key);
  }

  return errors;
}
