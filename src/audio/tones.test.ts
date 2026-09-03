import { describe, expect, it } from 'vitest';
import { DEFAULT_TONE_ID, getToneProfile, isToneId, TONE_PROFILES } from './tones';

describe('tone profiles', () => {
  it('ships the four voicings with unique ids', () => {
    expect(TONE_PROFILES.map((p) => p.id)).toEqual(['clean', 'rock', 'blues', 'country']);
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

  it('gives country the brightest, longest-ringing string', () => {
    const country = getToneProfile('country');
    for (const other of TONE_PROFILES.filter((p) => p.id !== 'country')) {
      expect(country.string.dampening).toBeGreaterThan(other.string.dampening);
      expect(country.string.resonance).toBeGreaterThanOrEqual(other.string.resonance);
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
