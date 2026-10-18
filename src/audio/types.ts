import type * as Tone from 'tone';
import type { Technique } from '@/content';
import type { Midi } from '@/music';
import type { ToneProfile } from './tones';

export type EngineBackend = 'sampled' | 'synth' | 'uninitialized';

export type PlayNoteOptions = {
  /**
   * Seconds until the note is cut off. Leave it out to let the note decay on
   * its own, which is what a plucked string does.
   */
  duration?: number;
  /** 0 to 1. */
  velocity?: number;
  /** Absolute AudioContext time. Omit to play now. */
  time?: number;
  /**
   * The physical string, 0 = low E. A string sounds one note at a time, so a
   * new note here stops the last one on it and leaves the other strings
   * ringing. Without it the note is not tied to any string and never chokes.
   */
  stringIndex?: number;
  /** How the note is played; the sampled backend changes its level, length or pitch to match. */
  technique?: Technique;
};

export type StrumOptions = {
  direction?: 'down' | 'up';
  spreadMs?: number;
  velocity?: number;
  time?: number;
  /** The string of each midi note, same order — see `PlayNoteOptions.stringIndex`. */
  strings?: number[];
};

/** A thing that can make guitar notes. Implemented by both backends. */
export interface GuitarVoice {
  playNote(midi: Midi, opts?: PlayNoteOptions): void;
  stopAll(): void;
  dispose(): void;
  connect(node: Tone.InputNode): void;
}

export interface AudioEngine {
  readonly backend: EngineBackend;
  readonly unlocked: boolean;
  /** The voicing currently shaping the sound. */
  readonly tone: ToneProfile;
  /** Swaps the voicing live. */
  setTone(profile: ToneProfile): void;
  init(): Promise<void>;
  /** Must be called from inside a real touch or click handler. */
  unlock(): Promise<void>;
  playNote(midi: Midi, opts?: PlayNoteOptions): void;
  strum(midis: Midi[], opts?: StrumOptions): void;
  stopAll(): void;
  dispose(): void;
}
