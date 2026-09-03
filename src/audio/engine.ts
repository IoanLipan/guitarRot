import * as Tone from 'tone';
import type { Midi } from '@/music';
import {
  MANIFEST_URL,
  fetchManifest,
  resolveSetName,
  selectBackend,
  type SampleManifest,
} from './manifest';
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
 *
 * Kept short deliberately: a long tail smears consecutive plucks into each
 * other and the result stops sounding like a guitar in a room and starts
 * sounding like a sustained pad.
 */
const REVERB_DECAY = 1.1;

export class GuitarAudioEngine implements AudioEngine {
  private voice: GuitarVoice | null = null;
  /** Loaded sample sets, keyed by manifest set name, so a tone switch is instant the second time. */
  private readonly sampledVoices = new Map<string, GuitarVoice>();
  /**
   * Loads still in flight, keyed the same way. Picking a tone in settings
   * calls setTone twice — once directly, once when the stored setting
   * changes — and without this both calls start their own download of the
   * same set and leave a second sampler connected to the chain.
   */
  private readonly loadingVoices = new Map<string, Promise<GuitarVoice>>();
  private manifest: SampleManifest | null = null;
  private chain: Tone.ToneAudioNode[] = [];
  private currentBackend: EngineBackend = 'uninitialized';
  private isUnlocked = false;
  private profile: ToneProfile = getToneProfile(DEFAULT_TONE_ID);
  private gainNode: Tone.Gain | null = null;
  private filterNode: Tone.Filter | null = null;
  private driveNode: Tone.Distortion | null = null;
  private reverbNode: Tone.Reverb | null = null;
  private bodyNode: Tone.Filter | null = null;
  private activeSet: string | null = null;

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
    if (this.bodyNode !== null) {
      this.bodyNode.frequency.value = profile.amp.bodyHz;
      this.bodyNode.Q.value = profile.amp.bodyQ;
      this.bodyNode.gain.value = profile.amp.bodyGainDb;
    }
    if (this.driveNode !== null) {
      this.driveNode.distortion = profile.amp.drive;
      this.driveNode.wet.value = profile.amp.drive > 0 ? 1 : 0;
    }
    if (this.voice instanceof SynthGuitar) this.voice.setProfile(profile);
    else void this.useSampleSet(profile);
  }

  /**
   * Moves the sampled backend onto the instrument this tone asks for.
   *
   * Loading is async but `setTone` is not, so the current voice keeps
   * playing until the new set is ready — a tone switch never goes silent,
   * and a failed load leaves the working voice in place.
   */
  private async useSampleSet(profile: ToneProfile): Promise<void> {
    const manifest = this.manifest;
    const gain = this.gainNode;
    if (manifest === null || gain === null) return;

    const name = resolveSetName(manifest, profile.sampleSet);
    if (name === null || name === this.activeSet) return;

    let voice = this.sampledVoices.get(name);
    if (voice === undefined) {
      try {
        voice = await this.loadSampleSet(manifest, name, gain);
      } catch (error) {
        console.warn(`Failed to load the "${name}" sample set; keeping the current one.`, error);
        return;
      }
    }

    // The tone may have changed again while this set was loading; the last
    // choice the user made is the one that wins.
    if (resolveSetName(manifest, this.profile.sampleSet) !== name) return;
    this.voice?.stopAll();
    this.voice = voice;
    this.activeSet = name;
  }

  async init(fetchImpl: typeof fetch = globalThis.fetch): Promise<void> {
    const manifest = await fetchManifest(MANIFEST_URL, fetchImpl);
    this.manifest = manifest;
    this.currentBackend = selectBackend(manifest);

    const profile = this.profile;
    const reverb = new Tone.Reverb({ decay: REVERB_DECAY, wet: profile.amp.reverbWet });
    await reverb.ready;
    const filter = new Tone.Filter(profile.amp.filterHz, 'lowpass');
    const drive = new Tone.Distortion({
      distortion: profile.amp.drive,
      wet: profile.amp.drive > 0 ? 1 : 0,
    });
    // Body sits before the drive: on a real instrument the box colours the
    // string, and anything after it would be colouring the amplifier.
    const body = new Tone.Filter({
      type: 'peaking',
      frequency: profile.amp.bodyHz,
      Q: profile.amp.bodyQ,
      gain: profile.amp.bodyGainDb,
    });
    const gain = new Tone.Gain(profile.amp.gain);
    gain.chain(body, drive, filter, reverb, Tone.getDestination());

    this.chain = [gain, body, drive, filter, reverb];
    this.gainNode = gain;
    this.driveNode = drive;
    this.filterNode = filter;
    this.reverbNode = reverb;
    this.bodyNode = body;

    if (this.currentBackend === 'sampled' && manifest !== null) {
      try {
        const sampled = await SampledGuitar.load(manifest, profile.sampleSet);
        this.sampledVoices.set(sampled.setName, sampled);
        this.activeSet = sampled.setName;
        this.voice = sampled;
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

  private loadSampleSet(
    manifest: SampleManifest,
    name: string,
    gain: Tone.Gain,
  ): Promise<GuitarVoice> {
    const inFlight = this.loadingVoices.get(name);
    if (inFlight !== undefined) return inFlight;

    const loading = SampledGuitar.load(manifest, name).then((voice) => {
      voice.connect(gain);
      this.sampledVoices.set(name, voice);
      return voice;
    });
    this.loadingVoices.set(name, loading);
    // A failed load must not poison the slot: dropping it lets the next
    // tone change try again rather than replaying the same rejection.
    loading.catch(() => this.loadingVoices.delete(name));
    return loading;
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
    for (const voice of this.sampledVoices.values()) voice.dispose();
    this.sampledVoices.clear();
    this.loadingVoices.clear();
    // Only dispose the live voice separately when it is the synth; sampled
    // voices were just disposed above and doing it twice throws.
    if (this.voice instanceof SynthGuitar) this.voice.dispose();
    for (const node of this.chain) node.dispose();
    this.activeSet = null;
    this.manifest = null;
    this.voice = null;
    this.chain = [];
    this.gainNode = null;
    this.driveNode = null;
    this.filterNode = null;
    this.reverbNode = null;
    this.bodyNode = null;
    this.currentBackend = 'uninitialized';
  }
}
