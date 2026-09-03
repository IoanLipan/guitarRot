import * as Tone from 'tone';
import type { Midi } from '@/music';
import { manifestSets, resolveSetName, type SampleManifest } from './manifest';
import type { GuitarVoice, PlayNoteOptions } from './types';

/** Real recorded guitar notes, pitch-shifted by Tone.Sampler to fill the gaps. */
export class SampledGuitar implements GuitarVoice {
  private readonly sampler: Tone.Sampler;
  readonly setName: string;

  private constructor(sampler: Tone.Sampler, setName: string) {
    this.sampler = sampler;
    this.setName = setName;
  }

  static async load(manifest: SampleManifest, wantedSet?: string): Promise<SampledGuitar> {
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
    return new SampledGuitar(sampler, setName);
  }

  connect(node: Tone.InputNode): void {
    this.sampler.connect(node);
  }

  playNote(midi: Midi, opts: PlayNoteOptions = {}): void {
    // Recorded notes already carry their own attack and decay, so the only
    // humanising worth doing is velocity: a bit-identical repeat is exactly
    // what makes a sampler sound like a machine.
    const velocity = (opts.velocity ?? 0.8) * (0.88 + Math.random() * 0.24);
    this.sampler.triggerAttackRelease(
      Tone.Frequency(midi, 'midi').toNote(),
      opts.duration ?? 1.4,
      opts.time,
      Math.min(1, velocity),
    );
  }

  stopAll(): void {
    this.sampler.releaseAll(Tone.now());
  }

  dispose(): void {
    this.sampler.dispose();
  }
}
