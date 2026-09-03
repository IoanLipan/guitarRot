import { parseNoteName } from '@/music';
import type { EngineBackend } from './types';

/** Note name to filename, e.g. `{ "E2": "acoustic/E2.mp3" }`. */
export type SampleSet = Record<string, string>;

export type SampleManifest = {
  baseUrl: string;
  /** A single unnamed set — the simplest shape, documented in the README. */
  samples?: SampleSet;
  /** Named sets, so different tones can play different instruments. */
  sets?: Record<string, SampleSet>;
};

export const MANIFEST_URL = '/audio/guitar/manifest.json';

/** Name given to a manifest's unnamed `samples` set. */
export const DEFAULT_SET = 'default';

function isSampleSet(value: unknown): value is SampleSet {
  if (typeof value !== 'object' || value === null) return false;
  return Object.values(value as Record<string, unknown>).every((v) => typeof v === 'string');
}

export function isSampleManifest(value: unknown): value is SampleManifest {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.baseUrl !== 'string') return false;

  const hasSamples = candidate.samples !== undefined;
  const hasSets = candidate.sets !== undefined;
  if (!hasSamples && !hasSets) return false;
  if (hasSamples && !isSampleSet(candidate.samples)) return false;
  if (hasSets) {
    if (typeof candidate.sets !== 'object' || candidate.sets === null) return false;
    if (!Object.values(candidate.sets as Record<string, unknown>).every(isSampleSet)) return false;
  }
  return true;
}

/** Returns null for any failure at all: the app falls back to the synth. */
export async function fetchManifest(
  url: string = MANIFEST_URL,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<SampleManifest | null> {
  try {
    const response = await fetchImpl(url);
    if (!response.ok) return null;
    const body: unknown = await response.json();
    return isSampleManifest(body) ? body : null;
  } catch {
    return null;
  }
}

/**
 * Every set in a manifest, keyed by name, with unusable entries dropped.
 * An unnamed `samples` block becomes the `default` set, so both manifest
 * shapes are handled by one code path from here on.
 */
export function manifestSets(manifest: SampleManifest): Record<string, SampleSet> {
  const sets: Record<string, SampleSet> = {};
  if (manifest.samples !== undefined) sets[DEFAULT_SET] = sampleSetToSamplerUrls(manifest.samples);
  for (const [name, set] of Object.entries(manifest.sets ?? {})) {
    sets[name] = sampleSetToSamplerUrls(set);
  }
  // A set that lost every entry to a typo would load nothing and leave the
  // app silent, so it does not count as a set at all.
  return Object.fromEntries(Object.entries(sets).filter(([, set]) => Object.keys(set).length > 0));
}

/**
 * Picks the set a tone asked for, falling back rather than going silent:
 * the named set, else the default set, else whichever set exists.
 */
export function resolveSetName(manifest: SampleManifest, wanted?: string): string | null {
  const names = Object.keys(manifestSets(manifest));
  if (names.length === 0) return null;
  if (wanted !== undefined && names.includes(wanted)) return wanted;
  if (names.includes(DEFAULT_SET)) return DEFAULT_SET;
  return names[0] ?? null;
}

export function selectBackend(manifest: SampleManifest | null): EngineBackend {
  if (manifest === null) return 'synth';
  return Object.keys(manifestSets(manifest)).length > 0 ? 'sampled' : 'synth';
}

/** Keeps only entries whose key is a real note name, so one typo cannot break loading. */
export function sampleSetToSamplerUrls(set: SampleSet): SampleSet {
  const urls: SampleSet = {};
  for (const [note, file] of Object.entries(set)) {
    try {
      parseNoteName(note);
      urls[note] = file;
    } catch {
      continue;
    }
  }
  return urls;
}

/** The sampler urls for a manifest's default set. */
export function manifestToSamplerUrls(manifest: SampleManifest): SampleSet {
  return manifestSets(manifest)[DEFAULT_SET] ?? {};
}
