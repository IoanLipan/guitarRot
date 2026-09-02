import * as Tone from 'tone';
import type { Midi } from '@/music';
import { manifestToSamplerUrls, type SampleManifest } from './manifest';
import type { GuitarVoice, PlayNoteOptions } from './types';

/** Real recorded guitar notes, pitch-shifted by Tone.Sampler to fill the gaps. */
export class SampledGuitar implements GuitarVoice {
  private readonly sampler: Tone.Sampler;

  private constructor(sampler: Tone.Sampler) {
    this.sampler = sampler;
  }

  static async load(manifest: SampleManifest): Promise<SampledGuitar> {
    const sampler = new Tone.Sampler({
      urls: manifestToSamplerUrls(manifest),
      baseUrl: manifest.baseUrl,
      release: 1,
    });
    await Tone.loaded();
    return new SampledGuitar(sampler);
  }

  connect(node: Tone.InputNode): void {
    this.sampler.connect(node);
  }

  playNote(midi: Midi, opts: PlayNoteOptions = {}): void {
    this.sampler.triggerAttackRelease(
      Tone.Frequency(midi, 'midi').toNote(),
      opts.duration ?? 1.4,
      opts.time,
      opts.velocity ?? 0.8,
    );
  }

  stopAll(): void {
    this.sampler.releaseAll(Tone.now());
  }

  dispose(): void {
    this.sampler.dispose();
  }
}
