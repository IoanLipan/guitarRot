import { STRING_COUNT, type Midi } from '@/music';
import type { Technique } from '@/content';

/**
 * The decisions behind a sampled note, kept free of Web Audio so they can be
 * tested without a context: which recording to stretch, what a technique does
 * to the level and length, and which notes a new pick silences. The only
 * thing `SampledGuitar` adds on top is wiring these answers to Tone nodes.
 */

/** Level for a note whose caller gave none. */
export const DEFAULT_VELOCITY = 0.8;

/** A recording and how far it has to be pitched to hit the wanted note. */
export type SamplePick = { sampleMidi: Midi; semitones: number };

/**
 * The recorded note closest to `midi`. Ties go to the higher recording, i.e.
 * the note is pitched down — the same tie-break `Tone.Sampler` uses, so the
 * character of a stretched note stays what it was before the rewrite.
 */
export function nearestSample(midi: Midi, sampleMidis: readonly Midi[]): SamplePick | undefined {
  let best: SamplePick | undefined;
  for (const sampleMidi of sampleMidis) {
    const semitones = midi - sampleMidi;
    if (best === undefined) {
      best = { sampleMidi, semitones };
      continue;
    }
    const distance = Math.abs(semitones);
    const bestDistance = Math.abs(best.semitones);
    if (distance < bestDistance || (distance === bestDistance && sampleMidi > best.sampleMidi)) {
      best = { sampleMidi, semitones };
    }
  }
  return best;
}

/** Playback rate that moves a recording by this many semitones. */
export function semitonesToRate(semitones: number): number {
  return 2 ** (semitones / 12);
}

/** A pitch gesture across the start of a note, in semitones from the target. */
export type Glide = {
  from: number;
  to: number;
  /** Seconds after the note starts before the pitch begins to move. */
  delay: number;
  /** Seconds the move takes. */
  over: number;
};

export type NoteShape = {
  /** Linear gain the note starts at, 0 to 1. */
  velocity: number;
  /** Seconds before the note is cut off; undefined lets the recording decay on its own. */
  duration: number | undefined;
  glide: Glide | undefined;
};

/** Hammer-ons and pull-offs are sounded by the fretting hand alone, with no pick. */
export const LEGATO_VELOCITY = 0.6;
/** A palm-muted note is dull as well as short. */
export const PALM_MUTE_VELOCITY = 0.8;
export const PALM_MUTE_SECONDS = 0.12;
/** A slide arrives from this far below its target... */
export const SLIDE_FROM_SEMITONES = -2;
export const SLIDE_SECONDS = 0.07;
/** ...and a bend pushes this far above the fretted note, a whole step. */
export const BEND_SEMITONES = 2;
export const BEND_DELAY_SECONDS = 0.03;
export const BEND_MAX_SECONDS = 0.18;
/** Share of a note's length the bend may take, so a short note is not bent into nothing. */
export const BEND_SHARE_OF_NOTE = 0.3;
/** A ramp shorter than this is a step; keep it a ramp. */
const MIN_GLIDE_SECONDS = 0.01;

function clampGain(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * What a technique does to one note. Tab convention here: a `bend` event's
 * fret is where you fret, and the note is bent up a whole step from there; a
 * `slide` event is the note you arrive on.
 */
export function noteShape(opts: {
  velocity: number;
  duration?: number | undefined;
  technique?: Technique | undefined;
}): NoteShape {
  const { velocity, duration, technique } = opts;
  switch (technique) {
    case 'hammer':
    case 'pull':
      return { velocity: clampGain(velocity * LEGATO_VELOCITY), duration, glide: undefined };
    case 'palmMute':
      return {
        velocity: clampGain(velocity * PALM_MUTE_VELOCITY),
        duration: duration === undefined ? PALM_MUTE_SECONDS : Math.min(duration, PALM_MUTE_SECONDS),
        glide: undefined,
      };
    case 'slide':
      return {
        velocity: clampGain(velocity),
        duration,
        glide: { from: SLIDE_FROM_SEMITONES, to: 0, delay: 0, over: SLIDE_SECONDS },
      };
    case 'bend':
      return {
        velocity: clampGain(velocity),
        duration,
        glide: {
          from: 0,
          to: BEND_SEMITONES,
          delay: BEND_DELAY_SECONDS,
          over: Math.max(
            MIN_GLIDE_SECONDS,
            Math.min(BEND_MAX_SECONDS, BEND_SHARE_OF_NOTE * (duration ?? Infinity)),
          ),
        },
      };
    default:
      return { velocity: clampGain(velocity), duration, glide: undefined };
  }
}

/**
 * When a note stops sounding, and whether that needs a scheduled stop.
 *
 * `peakRate` is the fastest the buffer plays back, which makes the natural end
 * the earliest it can be. Underestimating is the safe error: the choke below
 * trusts this number to mean "still ringing", and a stop sent to a source
 * that already ended would be sent to a disposed node.
 */
export function noteEnd(
  start: number,
  duration: number | undefined,
  bufferSeconds: number,
  peakRate: number,
): { end: number; cutShort: boolean } {
  const natural = start + bufferSeconds / peakRate;
  if (duration === undefined || start + duration >= natural) return { end: natural, cutShort: false };
  return { end: start + duration, cutShort: true };
}

/**
 * Whether a note ringing until `ringingEnd` has to be stopped for a new one
 * starting at `nextStart`.
 *
 * `OneShotSource.stop` cancels any stop already scheduled, so stopping a note
 * that was due to end before `nextStart` anyway would move its end *later*,
 * to `nextStart`, and stretch it.
 */
export function shouldChoke(ringingEnd: number, nextStart: number): boolean {
  return ringingEnd > nextStart;
}

export type RingingNote = {
  /** Context time the note stops on its own. */
  end: number;
  stop(time: number): void;
};

function isStringIndex(value: number | undefined): value is number {
  return value !== undefined && Number.isInteger(value) && value >= 0 && value < STRING_COUNT;
}

/**
 * What is ringing, string by string. A guitar string makes one note at a
 * time: picking it again stops the last one, and the other five carry on.
 * Notes with no string go in a loose pile that never chokes anything.
 */
export class RingingNotes<T extends RingingNote> {
  private readonly strings = new Map<number, T>();
  private readonly loose = new Set<T>();

  /** Registers `note`, starting at `time`, stopping whatever its string was still ringing. */
  pick(note: T, stringIndex: number | undefined, time: number): void {
    if (!isStringIndex(stringIndex)) {
      this.loose.add(note);
      return;
    }
    const previous = this.strings.get(stringIndex);
    if (previous !== undefined && shouldChoke(previous.end, time)) previous.stop(time);
    this.strings.set(stringIndex, note);
  }

  /** A note ended; stop remembering it so a later pick cannot try to stop it. */
  forget(note: T): void {
    this.loose.delete(note);
    for (const [stringIndex, ringing] of this.strings) {
      if (ringing === note) this.strings.delete(stringIndex);
    }
  }

  /** Stops every note still ringing at `time` and forgets them all. */
  stopAll(time: number): void {
    for (const note of [...this.strings.values(), ...this.loose]) {
      if (shouldChoke(note.end, time)) note.stop(time);
    }
    this.strings.clear();
    this.loose.clear();
  }
}
