import * as Tone from 'tone';
import type { Midi } from '@/music';
import { DEFAULT_TONE_ID, getToneProfile, type ToneProfile } from './tones';
import type { GuitarVoice, PlayNoteOptions } from './types';

const VOICE_COUNT = 6;

/**
 * Karplus-Strong plucked string, one voice per guitar string. Needs no
 * audio assets, so the app is fully playable before any samples are
 * installed. Pitch is exact, which is what the quizzes depend on.
 */
export class SynthGuitar implements GuitarVoice {
  private readonly voices: Tone.PluckSynth[];
  private readonly volumes: Tone.Volume[];
  private nextVoice = 0;

  constructor(profile: ToneProfile = getToneProfile(DEFAULT_TONE_ID)) {
    this.volumes = Array.from({ length: VOICE_COUNT }, () => new Tone.Volume(0));
    this.voices = this.volumes.map((volume) =>
      new Tone.PluckSynth({ ...profile.string }).connect(volume),
    );
  }

  /** Reshapes the string model in place; playing notes keep their tails. */
  setProfile(profile: ToneProfile): void {
    for (const voice of this.voices) voice.set({ ...profile.string });
  }

  connect(node: Tone.InputNode): void {
    for (const volume of this.volumes) volume.connect(node);
  }

  playNote(midi: Midi, opts: PlayNoteOptions = {}): void {
    const index =
      opts.stringIndex !== undefined && opts.stringIndex >= 0 && opts.stringIndex < VOICE_COUNT
        ? opts.stringIndex
        : this.nextVoice++ % VOICE_COUNT;

    const voice = this.voices[index];
    const volume = this.volumes[index];
    if (voice === undefined || volume === undefined) return;

    volume.volume.value = Tone.gainToDb(opts.velocity ?? 0.8);
    voice.triggerAttack(Tone.Frequency(midi, 'midi').toFrequency(), opts.time);
  }

  stopAll(): void {
    const now = Tone.now();
    for (const voice of this.voices) voice.triggerRelease(now);
  }

  dispose(): void {
    for (const voice of this.voices) voice.dispose();
    for (const volume of this.volumes) volume.dispose();
  }
}
