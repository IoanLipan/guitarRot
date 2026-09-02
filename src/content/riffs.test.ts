import { describe, expect, it } from 'vitest';
import { RIFFS, getRiff } from './riffs';
import { riffTotalBeats, validateRiff } from './types';
import { STANDARD_TUNING, fretToMidi, midiToPitchClass } from '@/music';

describe('the riff library', () => {
  it('ships at least three riffs', () => {
    expect(RIFFS.length).toBeGreaterThanOrEqual(3);
  });

  it('has a unique id for every riff', () => {
    expect(new Set(RIFFS.map((r) => r.id)).size).toBe(RIFFS.length);
  });

  it('contains only material written for this app', () => {
    for (const riff of RIFFS) {
      expect(riff.source).toBe('original');
    }
  });

  it('passes validation for every riff', () => {
    const problems = RIFFS.flatMap((riff) => validateRiff(riff));
    expect(problems).toEqual([]);
  });

  it('starts every riff on beat 0 so a loop has no dead air at the front', () => {
    for (const riff of RIFFS) {
      expect(Math.min(...riff.events.map((e) => e.beat))).toBe(0);
    }
  });

  it('finds a riff by id', () => {
    expect(getRiff('chromatic-warmup')?.title).toBe('Chromatic warm-up');
  });

  it('returns undefined for an unknown id', () => {
    expect(getRiff('does-not-exist')).toBeUndefined();
  });
});

describe('em-pentatonic-box1', () => {
  it('uses only notes from the E minor pentatonic scale', () => {
    const riff = getRiff('em-pentatonic-box1');
    expect(riff).toBeDefined();
    if (riff === undefined) return;

    // E minor pentatonic: E G A B D -> pitch classes 4, 7, 9, 11, 2
    const allowed = new Set([4, 7, 9, 11, 2]);
    for (const event of riff.events) {
      const pc = midiToPitchClass(fretToMidi(STANDARD_TUNING, event.stringIndex, event.fret));
      expect(allowed.has(pc)).toBe(true);
    }
  });

  it('rings to the end of its final bar', () => {
    const riff = getRiff('em-pentatonic-box1');
    expect(riff).toBeDefined();
    if (riff === undefined) return;
    const last = riff.events.reduce((a, b) => (b.beat > a.beat ? b : a));
    expect(last.beat + last.duration).toBe(riffTotalBeats(riff));
  });
});

describe('power-chord-drive', () => {
  it('sounds only roots and fifths', () => {
    const riff = getRiff('power-chord-drive');
    expect(riff).toBeDefined();
    if (riff === undefined) return;

    const byBeat = new Map<number, number[]>();
    for (const event of riff.events) {
      const midi = fretToMidi(STANDARD_TUNING, event.stringIndex, event.fret);
      byBeat.set(event.beat, [...(byBeat.get(event.beat) ?? []), midi]);
    }
    for (const [, midis] of byBeat) {
      expect(midis).toHaveLength(2);
      const sorted = [...midis].sort((a, b) => a - b);
      const low = sorted[0];
      const high = sorted[1];
      expect(low).toBeDefined();
      expect(high).toBeDefined();
      if (low === undefined || high === undefined) return;
      expect(high - low).toBe(7);
    }
  });
});
