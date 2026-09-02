import * as Tone from 'tone';
import { riffTotalBeats, type Riff } from '@/content';
import { STANDARD_TUNING, type Tuning } from '@/music';
import {
  riffLoopEnd,
  riffToScheduledNotes,
  speedToBpm,
  type ScheduledNote,
} from './timing';
import type { AudioEngine } from './types';

export type RiffPlayer = {
  start(): void;
  stop(): void;
  dispose(): void;
  setSpeed(speed: number): void;
  /** 0 to 1 through the loop. Read this from requestAnimationFrame. */
  progress(): number;
  readonly totalBeats: number;
};

/**
 * Loops a riff on the global Tone Transport.
 *
 * The Transport is global, so only one player may run at a time: start()
 * cancels whatever was previously scheduled. Callers that show several
 * riffs at once must guarantee only the visible one is started.
 */
export function createRiffPlayer(
  riff: Riff,
  engine: AudioEngine,
  opts: { tuning?: Tuning; speed?: number } = {},
): RiffPlayer {
  const tuning = opts.tuning ?? STANDARD_TUNING;
  let speed = opts.speed ?? 1;

  const notes = riffToScheduledNotes(riff, tuning);
  const transport = Tone.getTransport();

  const part = new Tone.Part<ScheduledNote>((time, note) => {
    const secondsPerBeat = 60 / transport.bpm.value;
    engine.playNote(note.midi, {
      time,
      duration: note.durationBeats * secondsPerBeat,
      stringIndex: note.stringIndex,
      velocity: 0.85,
    });
  }, notes);

  part.loop = true;
  part.loopStart = 0;
  part.loopEnd = riffLoopEnd(riff);

  return {
    totalBeats: riffTotalBeats(riff),

    start() {
      transport.stop();
      transport.cancel();
      transport.position = 0;
      transport.bpm.value = speedToBpm(riff.bpm, speed);
      transport.loop = true;
      transport.loopStart = 0;
      transport.loopEnd = part.loopEnd;
      part.start(0);
      transport.start();
    },

    stop() {
      part.stop();
      transport.stop();
      transport.position = 0;
      engine.stopAll();
    },

    setSpeed(next: number) {
      speed = next;
      transport.bpm.value = speedToBpm(riff.bpm, next);
    },

    progress() {
      return transport.progress;
    },

    dispose() {
      part.stop();
      part.dispose();
      transport.stop();
      transport.cancel();
    },
  };
}
