import { describe, expect, it, vi } from 'vitest';
import {
  fetchManifest,
  isSampleManifest,
  manifestToSamplerUrls,
  selectBackend,
  type SampleManifest,
} from './manifest';

const good: SampleManifest = {
  baseUrl: '/audio/guitar/',
  samples: { E2: 'E2.mp3', A2: 'A2.mp3', E4: 'E4.mp3' },
};

function stubFetch(response: unknown, ok = true): typeof fetch {
  return vi.fn(async () =>
    ({ ok, json: async () => response }) as unknown as Response,
  ) as unknown as typeof fetch;
}

describe('isSampleManifest', () => {
  it('accepts a well-formed manifest', () => {
    expect(isSampleManifest(good)).toBe(true);
  });

  it('rejects null', () => {
    expect(isSampleManifest(null)).toBe(false);
  });

  it('rejects a manifest with no samples object', () => {
    expect(isSampleManifest({ baseUrl: '/x/' })).toBe(false);
  });

  it('rejects a manifest whose sample values are not strings', () => {
    expect(isSampleManifest({ baseUrl: '/x/', samples: { E2: 7 } })).toBe(false);
  });
});

describe('selectBackend', () => {
  it('falls back to the synth when there is no manifest', () => {
    expect(selectBackend(null)).toBe('synth');
  });

  it('falls back to the synth when the manifest lists no samples', () => {
    expect(selectBackend({ baseUrl: '/audio/guitar/', samples: {} })).toBe('synth');
  });

  it('uses samples when the manifest lists them', () => {
    expect(selectBackend(good)).toBe('sampled');
  });
});

describe('fetchManifest', () => {
  it('returns the manifest when the request succeeds', async () => {
    await expect(fetchManifest('/m.json', stubFetch(good))).resolves.toEqual(good);
  });

  it('returns null on a 404', async () => {
    await expect(fetchManifest('/m.json', stubFetch(good, false))).resolves.toBeNull();
  });

  it('returns null when the body is not a manifest', async () => {
    await expect(fetchManifest('/m.json', stubFetch({ nope: true }))).resolves.toBeNull();
  });

  it('returns null when the request throws', async () => {
    const throwing = vi.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    await expect(fetchManifest('/m.json', throwing)).resolves.toBeNull();
  });
});

describe('manifestToSamplerUrls', () => {
  it('passes through every parseable note name', () => {
    expect(manifestToSamplerUrls(good)).toEqual(good.samples);
  });

  it('drops keys that are not note names, so one typo cannot break loading', () => {
    const messy: SampleManifest = {
      baseUrl: '/audio/guitar/',
      samples: { E2: 'E2.mp3', 'not-a-note': 'x.mp3' },
    };
    expect(manifestToSamplerUrls(messy)).toEqual({ E2: 'E2.mp3' });
  });
});
