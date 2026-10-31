import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TONE_ID,
  getToneProfile,
  isToneId,
  liveBodyGainDb,
  TONE_PROFILES,
  toneProfilesFor,
} from './tones';

describe('tone profiles', () => {
  it('ships the voicings with unique ids, acoustic first', () => {
    expect(TONE_PROFILES.map((p) => p.id)).toEqual([
      'acoustic',
      'classical',
      'clean',
      'rock',
      'blues',
      'country',
      'ukulele',
    ]);
  });

  // The settings list is built per instrument, so the ukulele's voicing must
  // never turn up among a guitar's tones, nor a guitar's among the ukulele's.
  it('says which instrument each voicing is for, and lists them apart', () => {
    expect(toneProfilesFor('guitar').map((p) => p.id)).toEqual([
      'acoustic',
      'classical',
      'clean',
      'rock',
      'blues',
      'country',
    ]);
    expect(toneProfilesFor('ukulele').map((p) => p.id)).toEqual(['ukulele']);
    for (const profile of TONE_PROFILES) {
      expect(['guitar', 'ukulele'], profile.id).toContain(profile.instrument);
    }
  });

  // Only an instrument with a box resonates: the electrics leave the body
  // stage at 0 dB, which makes the filter transparent.
  it('gives the hollow-bodied instruments a body resonance and the electrics none', () => {
    for (const id of ['acoustic', 'classical']) {
      const hollow = getToneProfile(id);
      expect(hollow.amp.bodyGainDb, id).toBeGreaterThan(0);
      expect(hollow.amp.bodyHz, id).toBeLessThan(200);
    }
    // A small box resonates higher than a guitar's: a ukulele's air sits well
    // above a dreadnought's ~110Hz, though still below its own lowest note.
    const ukulele = getToneProfile('ukulele');
    expect(ukulele.amp.bodyGainDb).toBeGreaterThan(0);
    expect(ukulele.amp.bodyHz).toBeGreaterThan(getToneProfile('classical').amp.bodyHz);
    expect(ukulele.amp.bodyHz).toBeLessThan(262);
    for (const electric of TONE_PROFILES.filter(
      (p) => !['acoustic', 'classical', 'ukulele'].includes(p.id),
    )) {
      expect(electric.amp.bodyGainDb).toBe(0);
    }
  });

  // The boost was tuned for the synth. A recording already carries the body
  // of the guitar it was made on, and boosting it again is a boom on every note.
  it('applies the body boost to the synth and leaves recordings flat', () => {
    const acoustic = getToneProfile('acoustic');
    expect(liveBodyGainDb(acoustic, true)).toBe(acoustic.amp.bodyGainDb);
    expect(liveBodyGainDb(acoustic, false)).toBe(0);
    expect(liveBodyGainDb(getToneProfile('rock'), true)).toBe(0);
  });

  it('gives each tone the recorded instrument it is named for', () => {
    expect(getToneProfile('acoustic').sampleSet).toBe('acoustic');
    expect(getToneProfile('classical').sampleSet).toBe('nylon');
    for (const id of ['clean', 'rock', 'blues', 'country']) {
      expect(getToneProfile(id).sampleSet, id).toBe('electric');
    }
    expect(getToneProfile('ukulele').sampleSet).toBe('ukulele');
  });

  // A bright, short-lived nylon string through a clean chain: more open than the
  // classical, a smaller room, no drive, and a ring that lets go sooner.
  it('keeps the ukulele clean, bright and dry next to the classical', () => {
    const ukulele = getToneProfile('ukulele');
    const classical = getToneProfile('classical');
    expect(ukulele.name).toBe('Ukulele');
    expect(ukulele.amp.drive).toBe(0);
    expect(ukulele.amp.filterHz).toBeGreaterThan(classical.amp.filterHz);
    expect(ukulele.amp.reverbWet).toBeLessThan(classical.amp.reverbWet);
    expect(ukulele.string.dampening).toBeGreaterThan(classical.string.dampening);
    expect(ukulele.string.resonance).toBeLessThan(classical.string.resonance);
  });

  it('keeps the classical tone clean, soft and darker than the acoustic', () => {
    const classical = getToneProfile('classical');
    const acoustic = getToneProfile('acoustic');
    expect(classical.name).toBe('Classical');
    expect(classical.amp.drive).toBe(0);
    expect(classical.amp.filterHz).toBe(5000);
    expect(classical.amp.reverbWet).toBeCloseTo(0.18);
    expect(classical.amp.gain).toBe(0.6);
    expect(classical.string.dampening).toBeLessThan(acoustic.string.dampening);
    expect(classical.string.attackNoise).toBeLessThan(acoustic.string.attackNoise);
  });

  it('keeps every parameter inside what the audio nodes accept', () => {
    for (const profile of TONE_PROFILES) {
      expect(profile.string.resonance).toBeGreaterThan(0);
      expect(profile.string.resonance).toBeLessThan(1);
      expect(profile.string.dampening).toBeGreaterThanOrEqual(20);
      expect(profile.amp.drive).toBeGreaterThanOrEqual(0);
      expect(profile.amp.drive).toBeLessThanOrEqual(1);
      expect(profile.amp.reverbWet).toBeGreaterThanOrEqual(0);
      expect(profile.amp.reverbWet).toBeLessThanOrEqual(1);
      expect(profile.amp.gain).toBeGreaterThan(0);
    }
  });

  it('actually differs between voicings rather than just renaming them', () => {
    const fingerprints = TONE_PROFILES.map((p) =>
      [p.string.attackNoise, p.string.dampening, p.amp.drive, p.amp.filterHz].join(':'),
    );
    expect(new Set(fingerprints).size).toBe(TONE_PROFILES.length);
  });

  it('drives rock harder and brighter than blues', () => {
    const rock = getToneProfile('rock');
    const blues = getToneProfile('blues');
    expect(rock.amp.drive).toBeGreaterThan(blues.amp.drive);
    expect(rock.string.dampening).toBeGreaterThan(blues.string.dampening);
  });

  it('gives country the brightest string', () => {
    const country = getToneProfile('country');
    for (const other of TONE_PROFILES.filter((p) => p.id !== 'country')) {
      expect(country.string.dampening).toBeGreaterThan(other.string.dampening);
    }
  });

  // Regression: country used to ring at resonance 0.985 — on the edge of
  // runaway feedback — which built into a harsh sustain that read as more
  // aggressive than the actually-distorted rock preset. Twang is a bright
  // attack that decays, so country must stay clean and must let go.
  it('keeps country clean, and never edgier than rock', () => {
    const country = getToneProfile('country');
    const rock = getToneProfile('rock');
    expect(country.amp.drive).toBe(0);
    expect(country.amp.drive).toBeLessThan(rock.amp.drive);
    expect(country.string.resonance).toBeLessThan(rock.string.resonance + 0.03);
  });

  // Distortion needs top end to read as crunch rather than mud: rock's
  // post-drive filter used to sit below its own harmonics.
  it('leaves rock enough top end for its drive to be audible', () => {
    const rock = getToneProfile('rock');
    expect(rock.amp.filterHz).toBeGreaterThan(5000);
    expect(rock.amp.drive).toBeGreaterThan(0.3);
  });

  // Both ends matter: below ~0.93 a note dies in a quarter second and reads
  // as a plink rather than a string, and at 1.0 it never decays at all.
  it('keeps every string in the range that sustains without ringing forever', () => {
    for (const profile of TONE_PROFILES) {
      expect(profile.string.resonance).toBeGreaterThanOrEqual(0.93);
      expect(profile.string.resonance).toBeLessThan(0.99);
    }
  });

  it('falls back to the default for an unknown or missing stored id', () => {
    expect(getToneProfile('nonsense').id).toBe(DEFAULT_TONE_ID);
    expect(getToneProfile(undefined).id).toBe(DEFAULT_TONE_ID);
  });

  it('recognises its own ids', () => {
    expect(isToneId('rock')).toBe(true);
    expect(isToneId('jazz')).toBe(false);
    expect(isToneId(7)).toBe(false);
  });
});

describe('the default tone', () => {
  it('matches the one a fresh install saves', async () => {
    // Two defaults that disagree make a new install load one sample set,
    // then immediately load another to land somewhere else.
    const { DEFAULT_SETTINGS } = await import('@/progress');
    expect(DEFAULT_SETTINGS.toneId).toBe(DEFAULT_TONE_ID);
  });
});
