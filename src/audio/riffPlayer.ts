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

  /**
   * Tone's transport keeps its own timeline, and stopping a part at the wrong
   * instant can land microscopically past zero — a real crash seen in the
   * feed was `RangeError: Value must be within [0, Infinity], got:
   * -2.6e-13`, thrown out of `dispose()` while React was unmounting a card
   * that had been swiped away. An exception escaping an effect cleanup takes
   * the whole React tree down with it, which showed up as the app going
   * blank after a dozen swipes.
   *
   * Teardown of an audio graph is never worth a blank screen, so these calls
   * are contained: the worst case of a swallowed error here is a voice that
   * rings a moment longer than it should.
   */
  function quietly(what: string, run: () => void): void {
    try {
      run();
    } catch (error) {
      console.warn(`riffPlayer: ${what} failed`, error);
    }
  }

  return {
    totalBeats: riffTotalBeats(riff),

    start() {
      quietly('start', () => {
        transport.stop();
        transport.cancel();
        transport.position = 0;
        transport.bpm.value = speedToBpm(riff.bpm, speed);
        transport.loop = true;
        transport.loopStart = 0;
        transport.loopEnd = part.loopEnd;
        part.start(0);
        transport.start();
      });
    },

    stop() {
      quietly('stop', () => {
        part.stop();
        transport.stop();
        transport.position = 0;
        engine.stopAll();
      });
    },

    setSpeed(next: number) {
      speed = next;
      quietly('setSpeed', () => {
        transport.bpm.value = speedToBpm(riff.bpm, next);
      });
    },

    progress() {
      return transport.progress;
    },

    dispose() {
      // Each step is separately contained: if stopping throws, the part and
      // the transport still have to be released or the leak outlives the card.
      quietly('dispose/part.stop', () => part.stop());
      quietly('dispose/part.dispose', () => part.dispose());
      quietly('dispose/transport.stop', () => transport.stop());
      quietly('dispose/transport.cancel', () => transport.cancel());
    },
  };
}
