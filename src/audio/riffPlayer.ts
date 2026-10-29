import * as Tone from 'tone';
import { riffTotalBeats, type Riff } from '@/content';
import { STANDARD_TUNING, type Tuning } from '@/music';
import {
  beatsToTransportTime,
  riffLoopEnd,
  riffToScheduledNotes,
  speedToBpm,
  type ScheduledNote,
} from './timing';
import type { AudioEngine } from './types';

export type RiffPlayer = {
  /**
   * Starts the loop from the top. Checks that the transport really is running
   * afterwards and tries once more if it is not; returns whether it is. A
   * `false` has already been reported with `console.warn`.
   *
   * Clears everything scheduled on the global transport, so anything else that
   * lives there (the metronome's click) has to be put back right after:
   * `metronome.sync()`.
   */
  start(): boolean;
  stop(): void;
  dispose(): void;
  /**
   * True only while sound is really being made: the transport is started
   * *and* the audio context is running. A suspended context freezes the
   * transport's clock yet leaves its state reading "started", which is how a
   * play button used to say Pause over silence.
   */
  isPlaying(): boolean;
  setSpeed(speed: number): void;
  /** 0 to 1 through the loop. Read this from requestAnimationFrame. */
  progress(): number;
  /**
   * Absolute beats elapsed from the start of the riff (bar 0, beat 0),
   * unaffected by `setLoopRange` — unlike `progress()`, which is a fraction
   * of whatever range is currently looping. Use this to place a playhead or
   * highlight a bar while a practice loop is active.
   */
  currentBeat(): number;
  /**
   * Restricts playback to `[startBeat, endBeat)` and jumps there right
   * away — practicing a section means going straight to it, not waiting for
   * the loop to come back around. `null` for both bounds restores the full
   * riff (also jumping back to its start). The range outlives a `stop()`: the
   * next `start()` begins at its start.
   */
  setLoopRange(startBeat: number | null, endBeat: number | null): void;
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
      technique: note.technique,
    });
  }, notes);

  part.loop = true;
  part.loopStart = 0;
  part.loopEnd = riffLoopEnd(riff);

  /**
   * The range being looped, as the strings handed to Tone: reading it back from
   * the part would give seconds, which depend on the tempo at that moment.
   * A restart goes to the start of this range, not to the top of the riff.
   */
  let rangeStart: string | number = 0;
  let rangeEnd: string | number = riffLoopEnd(riff);

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
  function quietly(what: string, run: () => void): boolean {
    try {
      run();
      return true;
    } catch (error) {
      console.warn(`riffPlayer: ${what} failed`, error);
      return false;
    }
  }

  function begin(): void {
    transport.stop();
    transport.cancel();
    transport.bpm.value = speedToBpm(riff.bpm, speed);
    transport.loop = true;
    transport.loopStart = rangeStart;
    transport.loopEnd = rangeEnd;
    transport.position = rangeStart;
    // A Part only starts if its own state timeline does not already say it is
    // started at that tick, and stop() leaves the "started at 0" entry behind
    // (it only adds "stopped at <now>"). Without this the second start(0) is
    // ignored, transport.cancel() above has already removed the notes, and the
    // transport runs on in silence: isPlaying() is true, nothing is heard.
    part.cancel(0);
    // Offset 0, not the part's default of its loop start: the transport was put
    // at the start of the range above, so the part's clock has to be the
    // transport's own, exactly as after setLoopRange() on a running player.
    // The default would shift the notes by the range's start and wrap them at
    // the wrong beat.
    part.start(0, 0);
    transport.start();
  }

  return {
    totalBeats: riffTotalBeats(riff),

    start() {
      // Swallowing a failure here once left a card reading "Pause" over a
      // transport that never ran, so the outcome is checked, not assumed:
      // one retry from a clean slate (begin() resets the part itself), and a
      // loud warning if that fails too.
      if (quietly('start', begin) && transport.state === 'started') return true;

      if (quietly('start (retry)', begin) && transport.state === 'started') return true;

      console.warn(`riffPlayer: the transport did not start for "${riff.id}" (state: ${transport.state})`);
      return false;
    },

    isPlaying() {
      return transport.state === 'started' && Tone.getContext().state === 'running';
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

    currentBeat() {
      const secondsPerBeat = 60 / transport.bpm.value;
      return Tone.Time(transport.position).toSeconds() / secondsPerBeat;
    },

    setLoopRange(startBeat, endBeat) {
      quietly('setLoopRange', () => {
        rangeStart = startBeat === null ? 0 : beatsToTransportTime(startBeat);
        rangeEnd = endBeat === null ? riffLoopEnd(riff) : beatsToTransportTime(endBeat);
        part.loopStart = rangeStart;
        part.loopEnd = rangeEnd;
        transport.loopStart = rangeStart;
        transport.loopEnd = rangeEnd;
        transport.position = rangeStart;
      });
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
