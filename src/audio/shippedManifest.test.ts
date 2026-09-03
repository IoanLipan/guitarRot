import { describe, expect, it } from 'vitest';
import { isSampleManifest, manifestSets, resolveSetName, selectBackend } from './manifest';
import { TONE_PROFILES } from './tones';

// Read through Vite rather than node:fs: the app tsconfig deliberately
// carries no node types, and this is exactly the resolution the browser
// will do anyway.
const SAMPLE_ROOT = '../../public/audio/guitar/';

const raw: unknown = Object.values(
  import.meta.glob('../../public/audio/guitar/manifest.json', { eager: true, import: 'default' }),
)[0];

const shipped = new Set(
  Object.keys(import.meta.glob('../../public/audio/guitar/*/*.mp3')).map((path) =>
    path.slice(SAMPLE_ROOT.length),
  ),
);

function manifest() {
  if (!isSampleManifest(raw)) throw new Error('public/audio/guitar/manifest.json is not a manifest');
  return raw;
}

describe('the manifest that actually ships', () => {
  it('is a valid manifest', () => {
    expect(isSampleManifest(raw)).toBe(true);
  });

  it('puts the app on the sampled backend', () => {
    expect(selectBackend(manifest())).toBe('sampled');
  });

  it('has a real file behind every entry', () => {
    // A manifest naming a missing file fails at load time, in the browser,
    // as silence. Catch it here instead.
    for (const [name, set] of Object.entries(manifestSets(manifest()))) {
      for (const file of Object.values(set)) {
        expect(shipped.has(file), `${name} names a missing file: ${file}`).toBe(true);
      }
    }
  });

  it('ships no sample the manifest never mentions', () => {
    const named = new Set(
      Object.values(manifestSets(manifest())).flatMap((set) => Object.values(set)),
    );
    for (const file of shipped) {
      expect(named.has(file), `${file} ships but is never loaded`).toBe(true);
    }
  });

  it('carries the sample set every tone profile asks for', () => {
    for (const profile of TONE_PROFILES) {
      expect(resolveSetName(manifest(), profile.sampleSet), profile.id).toBe(profile.sampleSet);
    }
  });

  it('covers the guitar range without leaving a gap wider than three semitones', () => {
    // Stretch a recording further than this and it starts sounding like a
    // synth again, which is the whole point of having samples.
    for (const [name, set] of Object.entries(manifestSets(manifest()))) {
      const midis = Object.keys(set)
        .map(noteToMidi)
        .sort((a, b) => a - b);

      expect(midis[0], `${name} misses the open low E`).toBeLessThanOrEqual(40);
      expect(midis[midis.length - 1], `${name} misses the top of the neck`).toBeGreaterThanOrEqual(88);
      for (let i = 1; i < midis.length; i += 1) {
        expect(midis[i]! - midis[i - 1]!, `${name} gap after midi ${midis[i - 1]}`).toBeLessThanOrEqual(3);
      }
    }
  });
});

const LETTERS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function noteToMidi(note: string): number {
  const match = /^([A-G])([#b]?)(-?\d+)$/.exec(note);
  if (match === null) throw new Error(`bad note ${note}`);
  const [, letter = '', accidental = '', octave = '4'] = match;
  const offset = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  return (Number(octave) + 1) * 12 + (LETTERS[letter] ?? 0) + offset;
}
