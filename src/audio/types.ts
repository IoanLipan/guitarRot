import type * as Tone from 'tone';
import type { Midi } from '@/music';

export type EngineBackend = 'sampled' | 'synth' | 'uninitialized';

export type PlayNoteOptions = {
  /** Seconds the note should ring. Backends may let it decay naturally instead. */
  duration?: number;
  /** 0 to 1. */
  velocity?: number;
  /** Absolute AudioContext time. Omit to play now. */
  time?: number;
  /** Lets a backend pick the voice matching the physical string. */
  stringIndex?: number;
};

export type StrumOptions = {
  direction?: 'down' | 'up';
  spreadMs?: number;
  velocity?: number;
  time?: number;
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
  init(): Promise<void>;
  /** Must be called from inside a real touch or click handler. */
  unlock(): Promise<void>;
  playNote(midi: Midi, opts?: PlayNoteOptions): void;
  strum(midis: Midi[], opts?: StrumOptions): void;
  stopAll(): void;
  dispose(): void;
}
