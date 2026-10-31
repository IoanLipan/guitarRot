/**
 * Voicing presets for the guitar sound.
 *
 * Two halves: `string` shapes the Karplus-Strong model itself (how hard the
 * pick hits, how fast the highs die, how long the string rings), and `amp`
 * shapes the signal chain after it (drive, tone control, room). The sampled
 * backend ignores `string` and still gets the amp half, so switching tones
 * does something audible either way.
 */
export type ToneProfile = {
  id: ToneId;
  name: string;
  /** One line, shown under the name in settings. */
  blurb: string;
  /**
   * Which instrument this voicing is for. Settings lists the tones of the
   * instrument being played (see `toneProfilesFor`), so a ukulele voicing is
   * never offered as a guitar tone, nor a guitar one for the ukulele.
   */
  instrument: ToneInstrument;
  /**
   * Which recorded instrument this tone plays, by name in the sample
   * manifest. Ignored by the synth backend, which has no samples to pick
   * from, and falls back to whatever set exists if the named one is absent.
   */
  sampleSet: 'acoustic' | 'nylon' | 'electric' | 'ukulele';
  string: {
    /** Pick attack noisiness. Higher is scratchier and more aggressive. */
    attackNoise: number;
    /** Lowpass inside the string's feedback loop, in Hz. Higher is brighter. */
    dampening: number;
    /** String feedback, 0-1. Higher rings longer. */
    resonance: number;
  };
  amp: {
    /** Tone.Distortion amount, 0-1. 0 disables the node's wet signal. */
    drive: number;
    /** Post-distortion lowpass, in Hz. */
    filterHz: number;
    /** Reverb wet, 0-1. */
    reverbWet: number;
    /**
     * Body resonance: a peaking EQ standing in for the air cavity and top
     * of an acoustic instrument. Electrics leave this at 0 dB, which makes
     * the node transparent — a solid body has nothing to resonate.
     *
     * Only the synth uses it (see `liveBodyGainDb`): a recording already
     * carries the body of the guitar it was made on, and boosting it again
     * puts a boom in every note.
     */
    bodyHz: number;
    bodyQ: number;
    bodyGainDb: number;
    /**
     * Output trim, linear gain. Set by measuring each preset's rendered RMS
     * and levelling them: darker presets carry far more low-frequency energy
     * for the same nominal gain, and without this, switching tone sounds
     * like a volume change rather than a tone change.
     */
    gain: number;
  };
};

export type ToneInstrument = 'guitar' | 'ukulele';

export type ToneId = 'acoustic' | 'classical' | 'clean' | 'rock' | 'blues' | 'country' | 'ukulele';

export const TONE_PROFILES: readonly ToneProfile[] = [
  {
    id: 'acoustic',
    name: 'Acoustic',
    blurb: 'Steel strings over a wooden box. Woody, open, rings on.',
    instrument: 'guitar',
    sampleSet: 'acoustic',
    // Soft pick, long ring, and plenty of top: an acoustic's brightness
    // comes from the strings and the top resonating, not from a bright amp.
    string: { attackNoise: 0.75, dampening: 5200, resonance: 0.975 },
    // For the synth, the body stage is what makes this read as acoustic
    // rather than as a clean electric: a broad lift around the ~110Hz air
    // resonance every dreadnought has, which is exactly what a solid body
    // lacks. The recordings already have it, so samples skip the boost.
    amp: { drive: 0, filterHz: 7000, reverbWet: 0.16, gain: 0.6, bodyHz: 110, bodyQ: 0.9, bodyGainDb: 7 },
  },
  {
    id: 'classical',
    name: 'Classical',
    blurb: 'Nylon strings and fingertips. Warm, round, soft attack.',
    instrument: 'guitar',
    sampleSet: 'nylon',
    // Synth half, which only plays when no recordings load: the acoustic's
    // string, darker and softer — nylon has far less top end than steel and
    // no pick to snap it.
    string: { attackNoise: 0.45, dampening: 3400, resonance: 0.97 },
    // The recording supplies the warmth, so the amp stays out of the way:
    // no drive, a gently closed top, and a little room.
    amp: { drive: 0, filterHz: 5000, reverbWet: 0.18, gain: 0.6, bodyHz: 100, bodyQ: 0.9, bodyGainDb: 5 },
  },
  {
    id: 'clean',
    name: 'Clean',
    blurb: 'Bare strings, no colour. Every note exactly as it is.',
    instrument: 'guitar',
    sampleSet: 'electric',
    string: { attackNoise: 0.9, dampening: 3600, resonance: 0.965 },
    amp: { drive: 0, filterHz: 6000, reverbWet: 0.1, gain: 0.79, bodyHz: 200, bodyQ: 1, bodyGainDb: 0 },
  },
  {
    id: 'rock',
    name: 'Rock',
    blurb: 'Driven and tight. Power chords bite, notes stop when you do.',
    instrument: 'guitar',
    sampleSet: 'electric',
    // Drive needs top end to read as crunch: the old filterHz of 4200 muffled
    // this preset's own distortion, which is how Country ended up sounding
    // more aggressive than Rock. Resonance sits lowest of the four so notes
    // stop tight, but still high enough to sustain — see stringVoicing.ts on
    // why that ceiling is so unforgiving.
    string: { attackNoise: 1.7, dampening: 4800, resonance: 0.95 },
    amp: { drive: 0.5, filterHz: 5800, reverbWet: 0.05, gain: 0.25, bodyHz: 200, bodyQ: 1, bodyGainDb: 0 },
  },
  {
    id: 'blues',
    name: 'Blues',
    blurb: 'Warm, mid-heavy, just breaking up. Bends sing.',
    instrument: 'guitar',
    sampleSet: 'electric',
    string: { attackNoise: 1.2, dampening: 3200, resonance: 0.972 },
    amp: { drive: 0.18, filterHz: 3400, reverbWet: 0.18, gain: 0.33, bodyHz: 200, bodyQ: 1, bodyGainDb: 0 },
  },
  {
    id: 'country',
    name: 'Country',
    blurb: 'Bright twang with a spring-tank shimmer. Snappy and clean.',
    instrument: 'guitar',
    sampleSet: 'electric',
    // Twang is a bright attack over a clean, ringing string. The old 0.985
    // sat on the edge of runaway feedback and built into a harsh sustain that
    // read as edgier than the actually-distorted Rock preset — backwards.
    // Still bright, still rings, but no drive and no squeal.
    string: { attackNoise: 0.55, dampening: 6200, resonance: 0.958 },
    amp: { drive: 0, filterHz: 7600, reverbWet: 0.24, gain: 1.1, bodyHz: 200, bodyQ: 1, bodyGainDb: 0 },
  },
  {
    id: 'ukulele',
    name: 'Ukulele',
    blurb: 'Four nylon strings on a small box. Bright, and quick to fade.',
    instrument: 'ukulele',
    sampleSet: 'ukulele',
    // Synth half, only heard when no recordings load: a nylon string that is
    // brighter than the classical (a short scale and a small top give it far
    // less warmth) and lets go sooner. Resonance stays inside the 0.93+ band
    // the string voicing needs to read as a note at all.
    string: { attackNoise: 0.4, dampening: 5200, resonance: 0.95 },
    // The recording is already a bright, short-lived tenor, so the amp only
    // opens the top a little past the classical's, adds the smallest room
    // (a ukulele sounds close and dry), and trims level to match the nylon
    // set. The air resonance of a small body sits near 250Hz, which is only
    // the synth's business: recordings skip the boost.
    amp: { drive: 0, filterHz: 8200, reverbWet: 0.1, gain: 0.6, bodyHz: 250, bodyQ: 1, bodyGainDb: 4 },
  },
];

export const DEFAULT_TONE_ID: ToneId = 'acoustic';

export function getToneProfile(id: string | undefined): ToneProfile {
  return (
    TONE_PROFILES.find((profile) => profile.id === id) ??
    // The list is never empty; the fallback keeps this total for bad stored ids.
    TONE_PROFILES.find((profile) => profile.id === DEFAULT_TONE_ID) ??
    (TONE_PROFILES[0] as ToneProfile)
  );
}

/** The voicings for one instrument, in display order. */
export function toneProfilesFor(instrument: ToneInstrument): readonly ToneProfile[] {
  return TONE_PROFILES.filter((profile) => profile.instrument === instrument);
}

/**
 * The body-EQ boost that actually applies. Recorded notes already carry the
 * resonance of the box they were played on, so the boost is for the synth
 * alone; on samples the stage stays flat.
 */
export function liveBodyGainDb(profile: ToneProfile, voiceIsSynth: boolean): number {
  return voiceIsSynth ? profile.amp.bodyGainDb : 0;
}

export function isToneId(value: unknown): value is ToneId {
  return typeof value === 'string' && TONE_PROFILES.some((profile) => profile.id === value);
}
