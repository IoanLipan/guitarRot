import * as Tone from 'tone';

/** True on the first beat of a bar, given how many beats it has. */
export function isDownbeat(beatIndex: number, beatsPerBar: number): boolean {
  return beatIndex % Math.max(1, Math.round(beatsPerBar)) === 0;
}

export type Metronome = {
  /** Starts ticking, quantized to the next quarter note so it lands on the beat grid. */
  start(): void;
  stop(): void;
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

  let beatIndex = 0;
  const loop = new Tone.Loop((time) => {
    const accent = isDownbeat(beatIndex, beatsPerBar);
    synth.triggerAttackRelease(accent ? 'C6' : 'G5', 0.03, time, accent ? 0.9 : 0.55);
    beatIndex += 1;
  }, '4n');

  return {
    start() {
      beatIndex = 0;
      // Quantized to the next quarter note: whether the transport just
      // reset to 0 or is already mid-playback, the click lands on the beat.
      loop.start('@4n');
    },

    stop() {
      loop.stop();
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
