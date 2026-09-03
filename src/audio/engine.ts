import * as Tone from 'tone';
import type { Midi } from '@/music';
import { MANIFEST_URL, fetchManifest, selectBackend } from './manifest';
import { SampledGuitar } from './SampledGuitar';
import { SynthGuitar } from './SynthGuitar';
import { strumOffsets } from './strum';
import { DEFAULT_TONE_ID, getToneProfile, type ToneProfile } from './tones';
import type {
  AudioEngine,
  EngineBackend,
  GuitarVoice,
  PlayNoteOptions,
  StrumOptions,
} from './types';

const DEFAULT_SPREAD_MS = 28;
/**
 * Reverb decay is fixed because changing it forces Tone to re-render the
 * impulse response asynchronously; tone profiles vary the wet mix instead,
 * which is instant and does the audible work.
 */
const REVERB_DECAY = 1.6;

export class GuitarAudioEngine implements AudioEngine {
  private voice: GuitarVoice | null = null;
  private chain: Tone.ToneAudioNode[] = [];
  private currentBackend: EngineBackend = 'uninitialized';
  private isUnlocked = false;
  private profile: ToneProfile = getToneProfile(DEFAULT_TONE_ID);
  private gainNode: Tone.Gain | null = null;
  private filterNode: Tone.Filter | null = null;
  private driveNode: Tone.Distortion | null = null;
  private reverbNode: Tone.Reverb | null = null;

  get backend(): EngineBackend {
    return this.currentBackend;
  }

  get unlocked(): boolean {
    return this.isUnlocked;
  }

  get tone(): ToneProfile {
    return this.profile;
  }

  /** Swaps the voicing live — no reload, no dropped notes. */
  setTone(profile: ToneProfile): void {
    this.profile = profile;
    if (this.gainNode !== null) this.gainNode.gain.value = profile.amp.gain;
    if (this.filterNode !== null) this.filterNode.frequency.value = profile.amp.filterHz;
    if (this.reverbNode !== null) this.reverbNode.wet.value = profile.amp.reverbWet;
    if (this.driveNode !== null) {
      this.driveNode.distortion = profile.amp.drive;
      this.driveNode.wet.value = profile.amp.drive > 0 ? 1 : 0;
    }
    if (this.voice instanceof SynthGuitar) this.voice.setProfile(profile);
  }

  async init(fetchImpl: typeof fetch = globalThis.fetch): Promise<void> {
    const manifest = await fetchManifest(MANIFEST_URL, fetchImpl);
    this.currentBackend = selectBackend(manifest);

    const profile = this.profile;
    const reverb = new Tone.Reverb({ decay: REVERB_DECAY, wet: profile.amp.reverbWet });
    await reverb.ready;
    const filter = new Tone.Filter(profile.amp.filterHz, 'lowpass');
    const drive = new Tone.Distortion({
      distortion: profile.amp.drive,
      wet: profile.amp.drive > 0 ? 1 : 0,
    });
    const gain = new Tone.Gain(profile.amp.gain);
    gain.chain(drive, filter, reverb, Tone.getDestination());

    this.chain = [gain, drive, filter, reverb];
    this.gainNode = gain;
    this.driveNode = drive;
    this.filterNode = filter;
    this.reverbNode = reverb;

    if (this.currentBackend === 'sampled' && manifest !== null) {
      try {
        this.voice = await SampledGuitar.load(manifest);
      } catch (error) {
        // A listed sample can 404 or be unreachable even when the manifest
        // itself parsed fine (Tone.loaded() rejects in that case). Fail
        // exactly as gracefully as the "no manifest at all" path already
        // does, rather than leaving voice null and the app silently mute.
        console.warn('Failed to load sampled guitar backend; falling back to synth.', error);
        this.currentBackend = 'synth';
        this.voice = new SynthGuitar(profile);
      }
    } else {
      this.voice = new SynthGuitar(profile);
    }
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
    this.gainNode = null;
    this.driveNode = null;
    this.filterNode = null;
    this.reverbNode = null;
    this.currentBackend = 'uninitialized';
  }
}
