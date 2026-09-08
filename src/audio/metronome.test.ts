import { describe, expect, it } from 'vitest';
import { isDownbeat } from './metronome';

describe('isDownbeat', () => {
  it('is true on beat zero of every bar', () => {
    expect(isDownbeat(0, 4)).toBe(true);
    expect(isDownbeat(4, 4)).toBe(true);
    expect(isDownbeat(8, 4)).toBe(true);
  });

  it('is false on the other beats of the bar', () => {
    expect(isDownbeat(1, 4)).toBe(false);
    expect(isDownbeat(2, 4)).toBe(false);
    expect(isDownbeat(3, 4)).toBe(false);
  });

  it('respects a non-4/4 bar length', () => {
    expect(isDownbeat(3, 3)).toBe(true);
    expect(isDownbeat(2, 3)).toBe(false);
  });
});
