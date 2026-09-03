import * as Tone from 'tone';
import { STRING_COUNT, type Midi } from '@/music';
import { pickParams, stringParams } from './stringVoicing';
import { DEFAULT_TONE_ID, getToneProfile, type ToneProfile } from './tones';
import type { GuitarVoice, PlayNoteOptions } from './types';

/**
 * Plucked-string guitar, one voice per string. Needs no audio assets, so
 * the app is fully playable before any samples are installed. Pitch is
 * exact, which is what the quizzes depend on.
 *
 * Each voice is two layers:
 *
 * 1. A Karplus-Strong string (`PluckSynth`), voiced per string — see
 *    `stringVoicing.ts`. Six identical voices is what makes bare KS read as
 *    an electric piano; a real instrument's strings differ from each other.
 * 2. A short filtered noise burst at the moment of the pluck: the pick or
 *    fingertip hitting the string. KS models the string ringing but not the
 *    thing that set it moving, and that missing transient is most of what
 *    the ear uses to tell "plucked" from "struck key".
 */
export class SynthGuitar implements GuitarVoice {
  private readonly voices: Tone.PluckSynth[];
  private readonly volumes: Tone.Volume[];
  private readonly picks: Tone.NoiseSynth[];
  private readonly pickGains: Tone.Gain[];
  private readonly pickFilters: Tone.Filter[];
  /** Unvaried pick levels, so humanise() has something to vary around. */
  private pickBaseLevels: number[] = [];
  private nextVoice = 0;

  constructor(profile: ToneProfile = getToneProfile(DEFAULT_TONE_ID)) {
    this.volumes = Array.from({ length: STRING_COUNT }, () => new Tone.Volume(0));

    this.voices = this.volumes.map((volume, stringIndex) =>
      new Tone.PluckSynth(stringParams(profile.string, stringIndex)).connect(volume),
    );

    // The pick layer runs into the same per-string volume node, so it tracks
    // note velocity with the tone rather than sitting at a fixed level.
    this.pickFilters = [];
    this.pickGains = [];
    this.picks = this.volumes.map((volume, stringIndex) => {
      const pick = pickParams(profile.string, stringIndex);
      const gain = new Tone.Gain(pick.level).connect(volume);
      const filter = new Tone.Filter({ type: 'bandpass', frequency: pick.bandHz, Q: 1.1 }).connect(
        gain,
      );
      this.pickGains.push(gain);
      this.pickFilters.push(filter);
      this.pickBaseLevels.push(pick.level);
      return new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: pick.decay, sustain: 0, release: 0.01 },
      }).connect(filter);
    });
  }

  /** Reshapes the string model in place; playing notes keep their tails. */
  setProfile(profile: ToneProfile): void {
    this.voices.forEach((voice, stringIndex) => {
      voice.set(stringParams(profile.string, stringIndex));
    });
    this.picks.forEach((pick, stringIndex) => {
      const next = pickParams(profile.string, stringIndex);
      pick.set({ envelope: { decay: next.decay } });
      const gain = this.pickGains[stringIndex];
      const filter = this.pickFilters[stringIndex];
      if (gain !== undefined) gain.gain.value = next.level;
      if (filter !== undefined) filter.frequency.value = next.bandHz;
      this.pickBaseLevels[stringIndex] = next.level;
    });
  }

  connect(node: Tone.InputNode): void {
    for (const volume of this.volumes) volume.connect(node);
  }

  /**
   * Small per-note variation. A player never strikes a string exactly the
   * same way twice, and identical repeats are a large part of what reads as
   * robotic on a fast riff. Pitch is deliberately untouched: the quizzes
   * depend on it being exact.
   */
  private humanise(stringIndex: number): number {
    const pick = this.pickBaseLevels[stringIndex];
    const gain = this.pickGains[stringIndex];
    if (pick !== undefined && gain !== undefined) {
      gain.gain.value = pick * (0.8 + Math.random() * 0.4);
    }
    return 0.94 + Math.random() * 0.12;
  }

  playNote(midi: Midi, opts: PlayNoteOptions = {}): void {
    const index =
      opts.stringIndex !== undefined && opts.stringIndex >= 0 && opts.stringIndex < STRING_COUNT
        ? opts.stringIndex
        : this.nextVoice++ % STRING_COUNT;

    const voice = this.voices[index];
    const volume = this.volumes[index];
    if (voice === undefined || volume === undefined) return;

    volume.volume.value = Tone.gainToDb((opts.velocity ?? 0.8) * this.humanise(index));
    voice.triggerAttack(Tone.Frequency(midi, 'midi').toFrequency(), opts.time);
    this.picks[index]?.triggerAttack(opts.time);
  }

  stopAll(): void {
    const now = Tone.now();
    for (const voice of this.voices) voice.triggerRelease(now);
  }

  dispose(): void {
    for (const voice of this.voices) voice.dispose();
    for (const pick of this.picks) pick.dispose();
    for (const filter of this.pickFilters) filter.dispose();
    for (const gain of this.pickGains) gain.dispose();
    for (const volume of this.volumes) volume.dispose();
  }
}
