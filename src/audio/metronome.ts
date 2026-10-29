import * as Tone from 'tone';

/** True on the first beat of a bar, given how many beats it has. */
export function isDownbeat(beatIndex: number, beatsPerBar: number): boolean {
  return beatIndex % Math.max(1, Math.round(beatsPerBar)) === 0;
}

export type Metronome = {
  /**
   * Puts the click on the transport's beat grid, from tick 0. The riff player
   * clears the whole transport every time it starts, which takes the click with
   * it, so call this straight after every `RiffPlayer.start()` — whether the
   * click is on or not: `setOn` only mutes and un-mutes what is scheduled here.
   */
  sync(): void;
  /** Turns the click on or off from the next beat. Never restarts or reschedules anything. */
  setOn(on: boolean): void;
  /** Plays a lead-in bar of clicks and resolves once it's finished. */
  playCountIn(bpm: number, beatsPerBar: number): Promise<void>;
  dispose(): void;
};

/**
 * A click track, independent of the guitar voice: it runs on its own synth
 * connected straight to the output, never through the tone/amp chain, so
 * switching guitar tone or drive never changes the click.
 */
export function createMetronome(beatsPerBar: number): Metronome {
  const synth = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.02 },
  }).toDestination();
  synth.volume.value = -6;

  const transport = Tone.getTransport();

  // The accent is read off the transport, not counted: a counter drifts the
  // moment the transport wraps at the end of a loop, jumps to a practice range
  // or restarts, whereas the transport's own position is the grid the riff is
  // played on.
  const loop = new Tone.Loop((time) => {
    const beat = Math.round(transport.getTicksAtTime(time) / transport.PPQ);
    const accent = isDownbeat(beat, beatsPerBar);
    synth.triggerAttackRelease(accent ? 'C6' : 'G5', 0.03, time, accent ? 0.9 : 0.55);
  }, '4n');

  // Scheduled from tick 0 and switched on and off by muting, never started or
  // stopped mid-playback: the click then always sits on the transport's own beat
  // grid, and turning it on needs no scheduling that could go wrong while the
  // riff is playing.
  loop.mute = true;

  return {
    sync() {
      // The riff player's transport.cancel() removed the Loop's events but not
      // its record of having been started, and a Loop that thinks it is started
      // ignores start(). cancel(0) forgets that record (and any events left).
      loop.cancel(0);
      loop.start(0);
    },

    setOn(on) {
      loop.mute = !on;
    },

    playCountIn(bpm, beatsPerBarForCountIn) {
      const secondsPerBeat = 60 / bpm;
      const startAt = Tone.now() + 0.05;
      for (let i = 0; i < beatsPerBarForCountIn; i += 1) {
        const accent = i === 0;
        synth.triggerAttackRelease(
          accent ? 'C6' : 'G5',
          0.03,
          startAt + i * secondsPerBeat,
          accent ? 0.9 : 0.55,
        );
      }
      const totalMs = beatsPerBarForCountIn * secondsPerBeat * 1000;
      return new Promise((resolve) => setTimeout(resolve, totalMs));
    },

    dispose() {
      loop.dispose();
      synth.dispose();
    },
  };
}
