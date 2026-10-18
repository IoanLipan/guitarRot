import { describe, expect, it } from 'vitest';
import { createPitchSmoother, detectPitch, nearestNote } from './pitch';

const SAMPLE_RATE = 44100;
/** What `Tone.Analyser('waveform', 4096)` hands back each poll. */
const FRAME = 4096;

/** The six open strings of a standard-tuned guitar, low to high, in Hz. */
const OPEN_STRINGS = [
  { name: 'E2', hz: 82.41, midi: 40 },
  { name: 'A2', hz: 110, midi: 45 },
  { name: 'D3', hz: 146.83, midi: 50 },
  { name: 'G3', hz: 196, midi: 55 },
  { name: 'B3', hz: 246.94, midi: 59 },
  { name: 'E4', hz: 329.63, midi: 64 },
] as const;

/** Deterministic noise: a test that fails one run in a hundred is worse than none. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sine(hz: number, amplitude = 0.5, sampleRate = SAMPLE_RATE, length = FRAME): Float32Array {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    out[i] = amplitude * Math.sin((2 * Math.PI * hz * i) / sampleRate);
  }
  return out;
}

/**
 * A plucked-string stand-in: six partials that each die away (higher ones
 * faster), with the 2nd harmonic the loudest. A detector that locks onto the
 * strongest partial instead of the period reads this an octave high, which is
 * the classic guitar-tuner failure.
 */
function pluck(hz: number, sampleRate = SAMPLE_RATE, length = FRAME): Float32Array {
  const partialAmps = [0.6, 1.0, 0.55, 0.35, 0.2, 0.1];
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    let sample = 0;
    partialAmps.forEach((amp, index) => {
      const k = index + 1;
      sample += amp * Math.exp(-t * (3 + 2 * k)) * Math.sin(2 * Math.PI * hz * k * t);
    });
    out[i] = sample * 0.3;
  }
  return out;
}

function centsBetween(measuredHz: number, trueHz: number): number {
  return 1200 * Math.log2(measuredHz / trueHz);
}

describe('detectPitch', () => {
  it.each(OPEN_STRINGS)('hears a pure $name sine within 3 cents', ({ hz }) => {
    const result = detectPitch(sine(hz), SAMPLE_RATE);
    expect(result).not.toBeNull();
    expect(Math.abs(centsBetween(result!.hz, hz))).toBeLessThanOrEqual(3);
  });

  it.each([OPEN_STRINGS[0], OPEN_STRINGS[3]])(
    'hears a harmonic-rich $name pluck at the fundamental, not the loud 2nd harmonic',
    ({ hz, midi }) => {
      const result = detectPitch(pluck(hz), SAMPLE_RATE);
      expect(result).not.toBeNull();
      expect(Math.abs(centsBetween(result!.hz, hz))).toBeLessThanOrEqual(3);
      expect(nearestNote(result!.hz).midi).toBe(midi);
    },
  );

  it('reports a clean tone as highly periodic', () => {
    const result = detectPitch(sine(110), SAMPLE_RATE);
    expect(result!.clarity).toBeGreaterThan(0.95);
    expect(result!.clarity).toBeLessThanOrEqual(1);
  });

  it('honours the sample rate it is given', () => {
    // The same 110 Hz tone at 48 kHz is a different number of samples per cycle.
    const result = detectPitch(sine(110, 0.5, 48000), 48000);
    expect(result).not.toBeNull();
    expect(Math.abs(centsBetween(result!.hz, 110))).toBeLessThanOrEqual(3);
  });

  it('follows a string that is pulled sharp and flat', () => {
    for (const offsetCents of [-35, -12, 8, 40]) {
      const hz = 110 * 2 ** (offsetCents / 1200);
      const result = detectPitch(sine(hz), SAMPLE_RATE);
      expect(result).not.toBeNull();
      const note = nearestNote(result!.hz);
      expect(note.midi).toBe(45);
      expect(Math.abs(note.cents - offsetCents)).toBeLessThanOrEqual(3);
    }
  });

  it('covers the guitar range from low E up past the 12th fret of the top string', () => {
    // E2 (midi 40) .. E5 (midi 76); the 1100 Hz ceiling is just above C6.
    for (let midi = 40; midi <= 76; midi += 1) {
      const hz = 440 * 2 ** ((midi - 69) / 12);
      const result = detectPitch(sine(hz), SAMPLE_RATE);
      expect(result, `midi ${midi}`).not.toBeNull();
      expect(Math.abs(centsBetween(result!.hz, hz)), `midi ${midi}`).toBeLessThanOrEqual(3);
    }
  });

  it('ignores a DC offset, which cheap microphones add', () => {
    const buffer = sine(196);
    for (let i = 0; i < buffer.length; i += 1) buffer[i] = (buffer[i] ?? 0) + 0.2;
    const result = detectPitch(buffer, SAMPLE_RATE);
    expect(result).not.toBeNull();
    expect(Math.abs(centsBetween(result!.hz, 196))).toBeLessThanOrEqual(3);
  });

  it('still finds the note under a little room noise', () => {
    const random = mulberry32(7);
    const buffer = sine(146.83, 0.4);
    for (let i = 0; i < buffer.length; i += 1) buffer[i] = (buffer[i] ?? 0) + (random() - 0.5) * 0.06;
    const result = detectPitch(buffer, SAMPLE_RATE);
    expect(result).not.toBeNull();
    expect(Math.abs(centsBetween(result!.hz, 146.83))).toBeLessThanOrEqual(5);
  });

  it('returns null for silence', () => {
    expect(detectPitch(new Float32Array(FRAME), SAMPLE_RATE)).toBeNull();
  });

  it('returns null for a signal too quiet to be a played note', () => {
    expect(detectPitch(sine(110, 0.004), SAMPLE_RATE)).toBeNull();
  });

  it('returns null for white noise', () => {
    const random = mulberry32(42);
    const noise = new Float32Array(FRAME);
    for (let i = 0; i < noise.length; i += 1) noise[i] = (random() - 0.5) * 0.8;
    expect(detectPitch(noise, SAMPLE_RATE)).toBeNull();
  });

  it('returns null for an empty or too-short buffer instead of throwing', () => {
    expect(detectPitch(new Float32Array(0), SAMPLE_RATE)).toBeNull();
    expect(detectPitch(sine(110, 0.5, SAMPLE_RATE, 64), SAMPLE_RATE)).toBeNull();
  });

  it('does not modify the buffer it is given', () => {
    const buffer = sine(110);
    const copy = Float32Array.from(buffer);
    detectPitch(buffer, SAMPLE_RATE);
    expect(buffer).toEqual(copy);
  });
});

describe('nearestNote', () => {
  it('maps concert A to midi 69 dead on pitch', () => {
    const note = nearestNote(440);
    expect(note.midi).toBe(69);
    expect(note.cents).toBeCloseTo(0, 6);
  });

  it('maps every open string to its midi note', () => {
    for (const { hz, midi } of OPEN_STRINGS) {
      const note = nearestNote(hz);
      expect(note.midi).toBe(midi);
      expect(Math.abs(note.cents)).toBeLessThan(1);
    }
  });

  it('reports flat as negative and sharp as positive cents', () => {
    expect(nearestNote(440 * 2 ** (-20 / 1200)).cents).toBeCloseTo(-20, 6);
    expect(nearestNote(440 * 2 ** (20 / 1200)).cents).toBeCloseTo(20, 6);
  });

  it('rounds to the closer neighbour past the half-way point', () => {
    const note = nearestNote(440 * 2 ** (60 / 1200));
    expect(note.midi).toBe(70);
    expect(note.cents).toBeCloseTo(-40, 6);
  });

  it('keeps cents within -50 to +50', () => {
    for (let hz = 70; hz < 1100; hz += 3.7) {
      const { cents } = nearestNote(hz);
      expect(cents).toBeGreaterThanOrEqual(-50);
      expect(cents).toBeLessThanOrEqual(50);
    }
  });

  it('rejects a frequency that is not a positive number', () => {
    expect(() => nearestNote(0)).toThrow();
    expect(() => nearestNote(-5)).toThrow();
    expect(() => nearestNote(Number.NaN)).toThrow();
    expect(() => nearestNote(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe('createPitchSmoother', () => {
  it('returns nothing until it has heard something', () => {
    expect(createPitchSmoother().push(null)).toBeNull();
  });

  it('shows the first detection straight away', () => {
    expect(createPitchSmoother().push(110)).toBe(110);
  });

  it('takes the median of the last three, so one wild reading never shows', () => {
    const smoother = createPitchSmoother();
    smoother.push(110);
    smoother.push(111);
    // An octave error between two good readings.
    expect(smoother.push(220)).toBe(111);
    expect(smoother.push(110.5)).toBe(111);
  });

  it('bridges a single dropped frame', () => {
    const smoother = createPitchSmoother();
    smoother.push(110);
    smoother.push(110);
    expect(smoother.push(null)).toBe(110);
  });

  it('goes quiet once most of the window is silence', () => {
    const smoother = createPitchSmoother();
    smoother.push(110);
    smoother.push(null);
    expect(smoother.push(null)).toBeNull();
  });

  it('forgets everything on reset', () => {
    const smoother = createPitchSmoother();
    smoother.push(110);
    smoother.push(110);
    smoother.reset();
    expect(smoother.push(220)).toBe(220);
  });
});
