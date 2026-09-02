import { riffTotalBeats, type Riff } from '@/content';
import { STANDARD_TUNING, fretToMidi, type Midi, type Tuning } from '@/music';

export const MIN_SPEED = 0.25;
export const MAX_SPEED = 1.5;

export type ScheduledNote = {
  /** Tone's bars:beats:sixteenths, so tempo changes need no rescheduling. */
  time: string;
  midi: Midi;
  stringIndex: number;
  durationBeats: number;
};

/**
 * Converts quarter-note beats into Tone's bars:beats:sixteenths notation.
 *
 * Always emits bar 0 and folds the entire beat count into the beats
 * component, rather than wrapping into higher bar numbers the way a
 * per-bar-aware conversion would. This is deliberate: Tone's global
 * Transport.timeSignature defaults to 4 (see
 * node_modules/tone/build/esm/core/clock/Transport.js, `timeSignature: 4`
 * in the options default) and nothing in this app ever sets it, so a
 * bars:beats:sixteenths string built against the riff's own (possibly
 * different) beats-per-bar would be misinterpreted by Tone for any time
 * signature other than 4/4.
 *
 * Verified against Tone's own parser
 * (node_modules/tone/build/esm/core/type/TimeBase.js, the "tr" expression):
 *   if (m && m !== "0") total += this._beatsToUnits(this._getTimeSignature() * parseFloat(m));
 *   if (q && q !== "0") total += this._beatsToUnits(parseFloat(q));
 *   if (s && s !== "0") total += this._beatsToUnits(parseFloat(s) / 4);
 * The bars term (m) is only added when it is truthy and not the literal
 * string "0" -- pinning bars at 0 skips that term outright, so
 * Transport.timeSignature is never consulted. The beats term (q) is added
 * via `_beatsToUnits` directly, with no scaling or bound tied to any
 * nominal per-bar count, so a beats value larger than 4 (or than any
 * particular time signature's beat count) still sums correctly.
 */
export function beatsToTransportTime(beat: number): string {
  const beats = Math.floor(beat);
  const sixteenths = Math.round((beat - beats) * 4 * 1000) / 1000;
  return `0:${beats}:${sixteenths}`;
}

export function speedToBpm(baseBpm: number, speed: number): number {
  const clamped = Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed));
  return baseBpm * clamped;
}

export function riffToScheduledNotes(
  riff: Riff,
  tuning: Tuning = STANDARD_TUNING,
): ScheduledNote[] {
  return riff.events.map((event) => ({
    time: beatsToTransportTime(event.beat),
    midi: fretToMidi(tuning, event.stringIndex, event.fret),
    stringIndex: event.stringIndex,
    durationBeats: event.duration,
  }));
}

export function riffLoopEnd(riff: Riff): string {
  return beatsToTransportTime(riffTotalBeats(riff));
}
