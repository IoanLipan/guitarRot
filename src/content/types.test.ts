import { describe, expect, it } from 'vitest';
import { beatsPerBar, riffTotalBeats, validateRiff, type Riff } from './types';

const valid: Riff = {
  id: 'test-riff',
  title: 'Test',
  style: 'exercise',
  level: 1,
  bpm: 90,
  timeSignature: [4, 4],
  bars: 1,
  source: 'original',
  tags: [],
  events: [
    { stringIndex: 0, fret: 0, beat: 0, duration: 1 },
    { stringIndex: 0, fret: 2, beat: 1, duration: 1 },
    { stringIndex: 0, fret: 3, beat: 2, duration: 2 },
  ],
};

describe('beatsPerBar', () => {
  it('counts four quarter notes in 4/4', () => {
    expect(beatsPerBar([4, 4])).toBe(4);
  });

  it('counts three quarter notes in 3/4', () => {
    expect(beatsPerBar([3, 4])).toBe(3);
  });

  it('counts six eighth notes as three quarter notes in 6/8', () => {
    expect(beatsPerBar([6, 8])).toBe(3);
  });
});

describe('riffTotalBeats', () => {
  it('multiplies bars by beats per bar', () => {
    expect(riffTotalBeats({ ...valid, bars: 4 })).toBe(16);
  });
});

describe('validateRiff', () => {
  it('accepts a well-formed riff', () => {
    expect(validateRiff(valid)).toEqual([]);
  });

  it('rejects an empty riff', () => {
    expect(validateRiff({ ...valid, events: [] }).join(' ')).toContain('no events');
  });

  it('rejects a string index outside the instrument', () => {
    const bad = { ...valid, events: [{ stringIndex: 6, fret: 0, beat: 0, duration: 1 }] };
    expect(validateRiff(bad).join(' ')).toContain('string index');
  });

  it('rejects a fret above the neck', () => {
    const bad = { ...valid, events: [{ stringIndex: 0, fret: 30, beat: 0, duration: 1 }] };
    expect(validateRiff(bad).join(' ')).toContain('fret');
  });

  it('rejects a note starting before the riff', () => {
    const bad = { ...valid, events: [{ stringIndex: 0, fret: 0, beat: -1, duration: 1 }] };
    expect(validateRiff(bad).join(' ')).toContain('starts at');
  });

  it('rejects a note starting after the last bar ends', () => {
    const bad = { ...valid, events: [{ stringIndex: 0, fret: 0, beat: 4, duration: 1 }] };
    expect(validateRiff(bad).join(' ')).toContain('starts at');
  });

  it('rejects a note that rings past the last bar', () => {
    const bad = { ...valid, events: [{ stringIndex: 0, fret: 0, beat: 3, duration: 2 }] };
    expect(validateRiff(bad).join(' ')).toContain('past the end');
  });

  it('rejects a zero-length note', () => {
    const bad = { ...valid, events: [{ stringIndex: 0, fret: 0, beat: 0, duration: 0 }] };
    expect(validateRiff(bad).join(' ')).toContain('duration');
  });

  it('rejects an implausible tempo', () => {
    expect(validateRiff({ ...valid, bpm: 5 }).join(' ')).toContain('bpm');
  });

  it('requires attribution on public-domain material', () => {
    const bad: Riff = { ...valid, source: 'public-domain' };
    expect(validateRiff(bad).join(' ')).toContain('attribution');
  });

  it('accepts public-domain material that carries attribution', () => {
    const ok: Riff = { ...valid, source: 'public-domain', attribution: 'Traditional' };
    expect(validateRiff(ok)).toEqual([]);
  });

  it('rejects two notes on the same string at the same moment', () => {
    const bad = {
      ...valid,
      events: [
        { stringIndex: 0, fret: 0, beat: 0, duration: 1 },
        { stringIndex: 0, fret: 3, beat: 0, duration: 1 },
      ],
    };
    expect(validateRiff(bad).join(' ')).toContain('same string');
  });
});
