import * as Tone from 'tone';
import type { Midi } from '@/music';
import { MANIFEST_URL, fetchManifest, selectBackend } from './manifest';
import { SampledGuitar } from './SampledGuitar';
import { SynthGuitar } from './SynthGuitar';
import { strumOffsets } from './strum';
import type {
  AudioEngine,
  EngineBackend,
  GuitarVoice,
  PlayNoteOptions,
  StrumOptions,
} from './types';

const DEFAULT_SPREAD_MS = 28;

export class GuitarAudioEngine implements AudioEngine {
  private voice: GuitarVoice | null = null;
  private chain: Tone.ToneAudioNode[] = [];
  private currentBackend: EngineBackend = 'uninitialized';
  private isUnlocked = false;

  get backend(): EngineBackend {
    return this.currentBackend;
  }

  get unlocked(): boolean {
    return this.isUnlocked;
  }

  async init(fetchImpl: typeof fetch = globalThis.fetch): Promise<void> {
    const manifest = await fetchManifest(MANIFEST_URL, fetchImpl);
    this.currentBackend = selectBackend(manifest);

    const reverb = new Tone.Reverb({ decay: 1.4, wet: 0.12 });
    await reverb.ready;
    const filter = new Tone.Filter(6500, 'lowpass');
    const gain = new Tone.Gain(0.9);
    gain.chain(filter, reverb, Tone.getDestination());

    this.chain = [gain, filter, reverb];

    this.voice =
      this.currentBackend === 'sampled' && manifest !== null
        ? await SampledGuitar.load(manifest)
        : new SynthGuitar();
    this.voice.connect(gain);
  }

  /** Web audio stays suspended until a user gesture. Call this from a tap handler. */
  async unlock(): Promise<void> {
    await Tone.start();
    this.isUnlocked = true;
  }

  playNote(midi: Midi, opts?: PlayNoteOptions): void {
    this.voice?.playNote(midi, opts);
  }

  strum(midis: Midi[], opts: StrumOptions = {}): void {
    const start = opts.time ?? Tone.now();
    const offsets = strumOffsets(
      midis.length,
      opts.spreadMs ?? DEFAULT_SPREAD_MS,
      opts.direction ?? 'down',
    );
    midis.forEach((midi, i) => {
      const offset = offsets[i] ?? 0;
      this.voice?.playNote(midi, { time: start + offset, velocity: opts.velocity });
    });
  }

  stopAll(): void {
    this.voice?.stopAll();
  }

  dispose(): void {
    this.voice?.dispose();
    for (const node of this.chain) node.dispose();
    this.voice = null;
    this.chain = [];
    this.currentBackend = 'uninitialized';
  }
}
