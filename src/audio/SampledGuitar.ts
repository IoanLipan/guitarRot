import * as Tone from 'tone';
import { STRING_COUNT, type Midi } from '@/music';
import { manifestSets, resolveSetName, type SampleManifest } from './manifest';
import { pickParams } from './stringVoicing';
import { DEFAULT_TONE_ID, getToneProfile, type ToneProfile } from './tones';
import type { GuitarVoice, PlayNoteOptions } from './types';

/** Which string a note without an explicit one is assumed plucked on. */
const FALLBACK_STRING = 3;

/**
 * Real recorded guitar notes, pitch-shifted by Tone.Sampler to fill the
 * gaps, plus the same per-string pick-noise transient `SynthGuitar` uses.
 *
 * Measured attack time on these samples is 10-40ms to peak with almost no
 * broadband energy in the first 15ms — a soft, rounded onset. A real pick
 * strike is closer to instant and throws a broadband click ahead of the
 * string's tone; without it, several of these stacked into a chord read as
 * a keyboard patch rather than six strummed strings.
 */
export class SampledGuitar implements GuitarVoice {
  private readonly sampler: Tone.Sampler;
  private readonly picks: Tone.NoiseSynth[];
  private readonly pickGains: Tone.Gain[];
  readonly setName: string;

  private constructor(sampler: Tone.Sampler, setName: string, profile: ToneProfile) {
    this.sampler = sampler;
    this.setName = setName;

    this.pickGains = [];
    this.picks = Array.from({ length: STRING_COUNT }, (_, stringIndex) => {
      const pick = pickParams(profile.string, stringIndex);
      const gain = new Tone.Gain(pick.level);
      const filter = new Tone.Filter({ type: 'bandpass', frequency: pick.bandHz, Q: 1.1 }).connect(
        gain,
      );
      this.pickGains.push(gain);
      return new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: pick.decay, sustain: 0, release: 0.01 },
      }).connect(filter);
    });
  }

  static async load(
    manifest: SampleManifest,
    wantedSet?: string,
    profile: ToneProfile = getToneProfile(DEFAULT_TONE_ID),
  ): Promise<SampledGuitar> {
    const setName = resolveSetName(manifest, wantedSet);
    if (setName === null) throw new Error('manifest lists no usable sample set');
    const urls = manifestSets(manifest)[setName] ?? {};

    const sampler = new Tone.Sampler({
      urls,
      baseUrl: manifest.baseUrl,
      // Long enough that a released note fades rather than clicks, short
      // enough that a fast riff does not pile voices on top of each other.
      release: 0.6,
    });
    await Tone.loaded();
    return new SampledGuitar(sampler, setName, profile);
  }

  /** Reshapes the pick transient in place; the sampler itself never changes tone. */
  setProfile(profile: ToneProfile): void {
    this.picks.forEach((pick, stringIndex) => {
      const next = pickParams(profile.string, stringIndex);
      pick.set({ envelope: { decay: next.decay } });
      const gain = this.pickGains[stringIndex];
      if (gain !== undefined) gain.gain.value = next.level;
    });
  }

  connect(node: Tone.InputNode): void {
    this.sampler.connect(node);
    for (const gain of this.pickGains) gain.connect(node);
  }

  playNote(midi: Midi, opts: PlayNoteOptions = {}): void {
    // Recorded notes already carry their own decay, so the only humanising
    // worth doing is velocity: a bit-identical repeat is exactly what makes
    // a sampler sound like a machine.
    const velocity = Math.min(1, (opts.velocity ?? 0.8) * (0.88 + Math.random() * 0.24));
    this.sampler.triggerAttackRelease(
      Tone.Frequency(midi, 'midi').toNote(),
      opts.duration ?? 1.4,
      opts.time,
      velocity,
    );

    const index =
      opts.stringIndex !== undefined && opts.stringIndex >= 0 && opts.stringIndex < STRING_COUNT
        ? opts.stringIndex
        : FALLBACK_STRING;
    this.picks[index]?.triggerAttack(opts.time, velocity);
  }

  stopAll(): void {
    this.sampler.releaseAll(Tone.now());
  }

  dispose(): void {
    this.sampler.dispose();
    for (const pick of this.picks) pick.dispose();
    for (const gain of this.pickGains) gain.dispose();
  }
}
