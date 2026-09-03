import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SET,
  fetchManifest,
  isSampleManifest,
  manifestSets,
  manifestToSamplerUrls,
  resolveSetName,
  sampleSetToSamplerUrls,
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

  it('rejects a manifest with neither samples nor sets', () => {
    expect(isSampleManifest({ baseUrl: '/x/' })).toBe(false);
  });

  it('accepts a manifest that carries named sets instead of one set', () => {
    expect(
      isSampleManifest({ baseUrl: '/x/', sets: { acoustic: { E2: 'acoustic/E2.mp3' } } }),
    ).toBe(true);
  });

  it('rejects sets whose entries are not strings', () => {
    expect(isSampleManifest({ baseUrl: '/x/', sets: { acoustic: { E2: 7 } } })).toBe(false);
    expect(isSampleManifest({ baseUrl: '/x/', sets: { acoustic: 'nope' } })).toBe(false);
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

const twoSets: SampleManifest = {
  baseUrl: '/audio/guitar/',
  sets: {
    acoustic: { E2: 'acoustic/E2.mp3', A2: 'acoustic/A2.mp3' },
    electric: { E2: 'electric/E2.mp3' },
  },
};

describe('manifestSets', () => {
  it('names an unnamed samples block the default set', () => {
    expect(manifestSets(good)).toEqual({ [DEFAULT_SET]: good.samples });
  });

  it('keeps named sets apart', () => {
    expect(Object.keys(manifestSets(twoSets))).toEqual(['acoustic', 'electric']);
  });

  it('drops a set that lost every entry to a typo, rather than loading silence', () => {
    const broken: SampleManifest = {
      baseUrl: '/x/',
      sets: { good: { E2: 'E2.mp3' }, bad: { 'not-a-note': 'x.mp3' } },
    };
    expect(Object.keys(manifestSets(broken))).toEqual(['good']);
  });
});

describe('resolveSetName', () => {
  it('gives a tone the set it asked for', () => {
    expect(resolveSetName(twoSets, 'electric')).toBe('electric');
  });

  it('falls back rather than going silent when the named set is missing', () => {
    // No 'nylon' set: the manifest has no default either, so any real set wins.
    expect(resolveSetName(twoSets, 'nylon')).toBe('acoustic');
  });

  it('prefers the default set when one exists', () => {
    const mixed: SampleManifest = { ...good, sets: { electric: { E2: 'electric/E2.mp3' } } };
    expect(resolveSetName(mixed, 'nylon')).toBe(DEFAULT_SET);
  });

  it('returns null when there is nothing to play', () => {
    expect(resolveSetName({ baseUrl: '/x/', samples: {} })).toBeNull();
  });
});

describe('selectBackend with named sets', () => {
  it('uses samples when any set has entries', () => {
    expect(selectBackend(twoSets)).toBe('sampled');
  });

  it('falls back to the synth when every set is empty', () => {
    expect(selectBackend({ baseUrl: '/x/', sets: { acoustic: {} } })).toBe('synth');
  });
});

describe('sampleSetToSamplerUrls', () => {
  it('keeps flat and sharp spellings, which is how sample files are named', () => {
    expect(sampleSetToSamplerUrls({ Bb2: 'Bb2.mp3', 'A#2': 'x.mp3', Db3: 'Db3.mp3' })).toEqual({
      Bb2: 'Bb2.mp3',
      'A#2': 'x.mp3',
      Db3: 'Db3.mp3',
    });
  });
});
