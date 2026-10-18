import * as Tone from 'tone';
import { parseNoteName, type Midi } from '@/music';
import { manifestSets, resolveSetName, type SampleManifest } from './manifest';
import {
  DEFAULT_VELOCITY,
  RingingNotes,
  nearestSample,
  noteEnd,
  noteShape,
  semitonesToRate,
  type RingingNote,
} from './playback';
import type { GuitarVoice, PlayNoteOptions } from './types';

/**
 * How long a stopped note takes to fade out. Long enough that cutting a
 * string never clicks, short enough that a choke still reads as the pick
 * landing on a string rather than as a slow release.
 */
const FADE_OUT_SECONDS = 0.08;

/** Per-note level variation, x0.9 to x1.1. Pitch is never varied: the quizzes depend on it. */
const HUMANISE_LOW = 0.9;
const HUMANISE_SPAN = 0.2;

type PlayingNote = RingingNote & { source: Tone.ToneBufferSource };

/**
 * Real recorded guitar notes, one `ToneBufferSource` per note.
 *
 * `Tone.Sampler` is not used because it models a keyboard: every note is
 * `triggerAttackRelease`d, so each one holds then fades the way a key does,
 * and it cannot say which string a note belongs to. Here a string is
 * monophonic (picking it again stops the last note on it, the other strings
 * keep ringing) and a note with no stated length simply rings out, which is
 * what a plucked string does.
 *
 * There is deliberately no synthetic pick noise: the recordings start on the
 * real pick attack.
 */
export class SampledGuitar implements GuitarVoice {
  private readonly buffers: Tone.ToneAudioBuffers;
  /** Midi numbers of the recordings, ascending. */
  private readonly sampleMidis: readonly Midi[];
  private readonly output = new Tone.Gain(1);
  private readonly ringing = new RingingNotes<PlayingNote>();
  /** Every source not yet ended, so `dispose` reaches the ones already choked and fading. */
  private readonly live = new Set<Tone.ToneBufferSource>();
  readonly setName: string;

  private constructor(buffers: Tone.ToneAudioBuffers, sampleMidis: readonly Midi[], setName: string) {
    this.buffers = buffers;
    this.sampleMidis = sampleMidis;
    this.setName = setName;
  }

  /** Fetches and decodes every recording in the set; rejects if any one fails. */
  static async load(manifest: SampleManifest, wantedSet?: string): Promise<SampledGuitar> {
    const setName = resolveSetName(manifest, wantedSet);
    if (setName === null) throw new Error('manifest lists no usable sample set');

    // Keyed by midi number, so picking the nearest recording is arithmetic
    // and not string parsing on every note.
    const urls: Record<string, string> = {};
    for (const [note, file] of Object.entries(manifestSets(manifest)[setName] ?? {})) {
      urls[String(parseNoteName(note))] = file;
    }
    const sampleMidis = Object.keys(urls)
      .map(Number)
      .sort((a, b) => a - b);
    // ToneAudioBuffers only calls onload when something loaded, so an empty
    // set would wait forever.
    if (sampleMidis.length === 0) throw new Error(`sample set "${setName}" is empty`);

    const buffers = await new Promise<Tone.ToneAudioBuffers>((resolve, reject) => {
      const loading: Tone.ToneAudioBuffers = new Tone.ToneAudioBuffers({
        urls,
        baseUrl: manifest.baseUrl,
        onload: () => resolve(loading),
        onerror: (error) => {
          loading.dispose();
          reject(error);
        },
      });
    });
    return new SampledGuitar(buffers, sampleMidis, setName);
  }

  connect(node: Tone.InputNode): void {
    this.output.connect(node);
  }

  playNote(midi: Midi, opts: PlayNoteOptions = {}): void {
    const pick = nearestSample(midi, this.sampleMidis);
    if (pick === undefined) return;
    const buffer = this.buffers.get(pick.sampleMidi);

    const time = opts.time ?? Tone.now();
    // A bit-identical repeat is what makes a sampler sound like a machine.
    const velocity = (opts.velocity ?? DEFAULT_VELOCITY) * (HUMANISE_LOW + Math.random() * HUMANISE_SPAN);
    const shape = noteShape({ velocity, duration: opts.duration, technique: opts.technique });

    const glide = shape.glide;
    const startRate = semitonesToRate(pick.semitones + (glide?.from ?? 0));
    const targetRate = semitonesToRate(pick.semitones + (glide?.to ?? 0));
    const { end, cutShort } = noteEnd(
      time,
      shape.duration,
      buffer.duration,
      Math.max(startRate, targetRate),
    );

    const source = new Tone.ToneBufferSource({
      url: buffer,
      playbackRate: startRate,
      fadeOut: FADE_OUT_SECONDS,
    }).connect(this.output);

    // The rate is a constant until the glide begins; the explicit
    // setValueAtTime also pins where the ramp starts, since a Web Audio ramp
    // runs from the previous event rather than from "now".
    if (glide !== undefined) {
      source.playbackRate.setValueAtTime(startRate, time + glide.delay);
      source.playbackRate.exponentialRampToValueAtTime(targetRate, time + glide.delay + glide.over);
    }

    source.start(time, 0, undefined, shape.velocity);
    // Only schedule a stop for a note cut short. Stopping one that is
    // already due to end would just move its end later.
    if (cutShort) source.stop(end);

    const note: PlayingNote = { source, end, stop: (at) => source.stop(at) };
    this.live.add(source);
    this.ringing.pick(note, opts.stringIndex, time);
    // Tone disposes a source itself once it has ended, so there is nothing
    // to free here — only the bookkeeping to drop.
    source.onended = () => {
      this.live.delete(source);
      this.ringing.forget(note);
    };
  }

  stopAll(): void {
    this.ringing.stopAll(Tone.now());
  }

  dispose(): void {
    for (const source of this.live) {
      if (!source.disposed) source.dispose();
    }
    this.live.clear();
    this.output.dispose();
    this.buffers.dispose();
  }
}
