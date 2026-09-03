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

describe('the expanded library', () => {
  it('covers several styles so the feed does not feel like one drill', () => {
    const styles = new Set(RIFFS.map((r) => r.style));
    for (const style of ['Blues', 'Country', 'Solo', 'Rock', 'Fingerstyle']) {
      expect(styles).toContain(style);
    }
  });

  it('ships lead material, not only rhythm exercises', () => {
    expect(RIFFS.filter((r) => r.style === 'Solo').length).toBeGreaterThanOrEqual(2);
  });

  it('spans a range of difficulty', () => {
    const levels = RIFFS.map((r) => r.level);
    expect(Math.min(...levels)).toBeLessThanOrEqual(1);
    expect(Math.max(...levels)).toBeGreaterThanOrEqual(4);
  });

  it('fills every riff to the end of its last bar, so loops have no dead air', () => {
    for (const riff of RIFFS) {
      const end = Math.max(...riff.events.map((e) => e.beat + e.duration));
      expect(end).toBe(riffTotalBeats(riff));
    }
  });
});

/** Pitch classes of a riff's notes, as a set. */
function pitchClassesOf(id: string): Set<number> {
  const riff = getRiff(id);
  if (riff === undefined) throw new Error(`missing riff ${id}`);
  return new Set(
    riff.events.map((e) => midiToPitchClass(fretToMidi(STANDARD_TUNING, e.stringIndex, e.fret))),
  );
}

describe('em-pentatonic-lick', () => {
  it('stays inside E minor pentatonic', () => {
    // E G A B D
    const allowed = new Set([4, 7, 9, 11, 2]);
    for (const pc of pitchClassesOf('em-pentatonic-lick')) expect(allowed.has(pc)).toBe(true);
  });

  it('uses the expressive techniques a solo is meant to teach', () => {
    const riff = getRiff('em-pentatonic-lick');
    const techniques = new Set(riff?.events.map((e) => e.technique).filter(Boolean));
    expect(techniques).toContain('bend');
    expect(techniques).toContain('pull');
  });
});

describe('country-open-cascade', () => {
  it('stays inside G major pentatonic', () => {
    // G A B D E
    const allowed = new Set([7, 9, 11, 2, 4]);
    for (const pc of pitchClassesOf('country-open-cascade')) expect(allowed.has(pc)).toBe(true);
  });

  it('leans on open strings, which is the whole point of the lick', () => {
    const riff = getRiff('country-open-cascade');
    const open = riff?.events.filter((e) => e.fret === 0) ?? [];
    expect(open.length).toBeGreaterThanOrEqual(6);
  });
});

describe('rock-power-run', () => {
  it('stays inside A minor pentatonic', () => {
    // A C D E G
    const allowed = new Set([9, 0, 2, 4, 7]);
    for (const pc of pitchClassesOf('rock-power-run')) expect(allowed.has(pc)).toBe(true);
  });
});

describe('blues-shuffle-e', () => {
  it('moves between the fifth and the sixth over a held root', () => {
    const riff = getRiff('blues-shuffle-e');
    if (riff === undefined) throw new Error('missing riff');
    const roots = riff.events.filter((e) => e.fret === 0);
    const partners = riff.events.filter((e) => e.fret === 2 || e.fret === 4);
    expect(roots.length).toBe(partners.length);
    // Every root has a partner sounding with it.
    for (const root of roots) {
      expect(partners.some((p) => p.beat === root.beat)).toBe(true);
    }
  });
});
