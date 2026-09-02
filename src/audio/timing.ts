import { beatsPerBar, riffTotalBeats, type Riff } from '@/content';
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

/** Converts quarter-note beats into Tone's bars:beats:sixteenths notation. */
export function beatsToTransportTime(beat: number, perBar: number): string {
  const bars = Math.floor(beat / perBar);
  const withinBar = beat - bars * perBar;
  const beats = Math.floor(withinBar);
  const sixteenths = Math.round((withinBar - beats) * 4 * 1000) / 1000;
  return `${bars}:${beats}:${sixteenths}`;
}

export function speedToBpm(baseBpm: number, speed: number): number {
  const clamped = Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed));
  return baseBpm * clamped;
}

export function riffToScheduledNotes(
  riff: Riff,
  tuning: Tuning = STANDARD_TUNING,
): ScheduledNote[] {
  const perBar = beatsPerBar(riff.timeSignature);
  return riff.events.map((event) => ({
    time: beatsToTransportTime(event.beat, perBar),
    midi: fretToMidi(tuning, event.stringIndex, event.fret),
    stringIndex: event.stringIndex,
    durationBeats: event.duration,
  }));
}

export function riffLoopEnd(riff: Riff): string {
  return beatsToTransportTime(riffTotalBeats(riff), beatsPerBar(riff.timeSignature));
}
