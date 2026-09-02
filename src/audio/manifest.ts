import { parseNoteName } from '@/music';
import type { EngineBackend } from './types';

export type SampleManifest = {
  baseUrl: string;
  /** Note name to filename, e.g. { "E2": "E2.mp3" }. */
  samples: Record<string, string>;
};

export const MANIFEST_URL = '/audio/guitar/manifest.json';

export function isSampleManifest(value: unknown): value is SampleManifest {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.baseUrl !== 'string') return false;
  if (typeof candidate.samples !== 'object' || candidate.samples === null) return false;
  return Object.values(candidate.samples as Record<string, unknown>).every(
    (v) => typeof v === 'string',
  );
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

export function selectBackend(manifest: SampleManifest | null): EngineBackend {
  if (manifest === null) return 'synth';
  return Object.keys(manifest.samples).length > 0 ? 'sampled' : 'synth';
}

/** Keeps only entries whose key is a real note name, so one typo cannot break loading. */
export function manifestToSamplerUrls(manifest: SampleManifest): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const [note, file] of Object.entries(manifest.samples)) {
    try {
      parseNoteName(note);
      urls[note] = file;
    } catch {
      continue;
    }
  }
  return urls;
}
