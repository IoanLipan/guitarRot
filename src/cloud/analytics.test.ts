import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// A stand-in for the build (cloud on or off, with or without a measurement id), the SDKs, and the platform.
const world = vi.hoisted(() => ({
  cloud: { enabled: true, emulators: false, firebase: { measurementId: 'G-TEST123' } as { measurementId?: string } | null },
  native: false,
  /** How many times a mocked SDK module was imported at all. */
  imports: 0,
  supported: true,
}));

vi.mock('./config', () => ({
  get cloud() {
    return world.cloud;
  },
  get cloudEnabled() {
    return world.cloud.enabled;
  },
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => world.native } }));

const app = { name: 'app' };
vi.mock('./firebase', () => ({ getFirebaseApp: vi.fn(async () => app) }));

const web = vi.hoisted(() => ({
  analytics: { app: { name: 'app' } },
  isSupported: vi.fn(),
  initializeAnalytics: vi.fn(),
  setConsent: vi.fn(),
  setAnalyticsCollectionEnabled: vi.fn(),
  logEvent: vi.fn(),
  setUserProperties: vi.fn(),
  setUserId: vi.fn(),
  getInstallations: vi.fn(() => ({ installations: true })),
  deleteInstallations: vi.fn(async () => undefined),
}));
vi.mock('firebase/analytics', () => {
  world.imports += 1;
  return {
    isSupported: web.isSupported,
    initializeAnalytics: web.initializeAnalytics,
    setConsent: web.setConsent,
    setAnalyticsCollectionEnabled: web.setAnalyticsCollectionEnabled,
    logEvent: web.logEvent,
    setUserProperties: web.setUserProperties,
    setUserId: web.setUserId,
  };
});
vi.mock('firebase/installations', () => ({
  getInstallations: web.getInstallations,
  deleteInstallations: web.deleteInstallations,
}));

const plugin = vi.hoisted(() => {
  const call = () => vi.fn(async (_options?: unknown): Promise<void> => undefined);
  return {
    setConsent: call(),
    setEnabled: call(),
    logEvent: call(),
    setUserProperty: call(),
    setUserId: call(),
    resetAnalyticsData: call(),
  };
});
vi.mock('@capacitor-firebase/analytics', () => {
  world.imports += 1;
  return {
    FirebaseAnalytics: plugin,
    ConsentType: {
      AdPersonalization: 'AD_PERSONALIZATION',
      AdStorage: 'AD_STORAGE',
      AdUserData: 'AD_USER_DATA',
      AnalyticsStorage: 'ANALYTICS_STORAGE',
    },
    ConsentStatus: { Granted: 'GRANTED', Denied: 'DENIED' },
  };
});

type Analytics = typeof import('./analytics');

/** A fresh copy of the module, as if the page had just loaded. */
async function load(): Promise<Analytics> {
  vi.resetModules();
  return import('./analytics');
}

/** Lets the queue and the dynamic imports behind it run to the end. */
async function settle() {
  // The SDK arrives through dynamic imports, which a loaded machine can take
  // longer than a fixed number of ticks to resolve; wait for them explicitly.
  for (let round = 0; round < 3; round += 1) {
    await vi.dynamicImportSettled();
    for (let i = 0; i < 20; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

const KEY = 'guitarrot.analytics-consent.v1';

beforeEach(() => {
  world.cloud = { enabled: true, emulators: false, firebase: { measurementId: 'G-TEST123' } };
  world.native = false;
  world.imports = 0;
  world.supported = true;
  localStorage.clear();
  for (const mock of [...Object.values(web), ...Object.values(plugin)]) {
    if (vi.isMockFunction(mock)) mock.mockClear();
  }
  web.isSupported.mockResolvedValue(true);
  web.initializeAnalytics.mockReturnValue(web.analytics);
  // Anything the web SDK would have left behind.
  document.cookie = '_ga=GA1.1.123; path=/';
  document.cookie = '_ga_TEST123=GS1.1.1; path=/';
  document.cookie = 'unrelated=1; path=/';
});

afterEach(() => {
  for (const name of ['_ga', '_ga_TEST123', 'unrelated']) document.cookie = `${name}=; Max-Age=0; path=/`;
});

describe('analytics in a build without it', () => {
  it('does nothing at all without cloud features', async () => {
    world.cloud = { enabled: false, emulators: false, firebase: null };
    const analytics = await load();
    const listener = vi.fn();
    analytics.subscribeAnalyticsConsent(listener);

    analytics.setAnalyticsConsent(true);
    analytics.track('lesson_start', { lesson_id: 'l1', instrument: 'guitar' });
    analytics.trackScreen('feed');
    analytics.setAnalyticsUserProperties({ instrument: 'guitar' });
    await settle();

    expect(analytics.analyticsAvailable()).toBe(false);
    expect(analytics.analyticsConsent()).toBe('unset');
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(listener).not.toHaveBeenCalled();
    expect(world.imports).toBe(0);
  });

  it('does nothing when the project has no measurement id', async () => {
    world.cloud = { enabled: true, emulators: false, firebase: {} };
    const analytics = await load();
    analytics.setAnalyticsConsent(true);
    analytics.trackScreen('feed');
    await settle();
    expect(analytics.analyticsAvailable()).toBe(false);
    expect(world.imports).toBe(0);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('does nothing on the emulators', async () => {
    world.cloud = { enabled: true, emulators: true, firebase: { measurementId: 'G-TEST123' } };
    const analytics = await load();
    expect(analytics.analyticsAvailable()).toBe(false);
    analytics.setAnalyticsConsent(true);
    analytics.track('level_up', { level: 2 });
    await settle();
    expect(world.imports).toBe(0);
  });
});

describe('before the person has answered', () => {
  it('reports unset, and neither loads nor sends anything', async () => {
    const analytics = await load();
    expect(analytics.analyticsAvailable()).toBe(true);
    expect(analytics.analyticsConsent()).toBe('unset');

    analytics.track('lesson_start', { lesson_id: 'l1', instrument: 'guitar' });
    analytics.trackScreen('feed');
    analytics.setAnalyticsUserProperties({ instrument: 'guitar' });
    await settle();

    expect(world.imports).toBe(0);
    expect(web.logEvent).not.toHaveBeenCalled();
  });

  it('treats unreadable storage as not asked', async () => {
    const analytics = await load();
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(analytics.analyticsConsent()).toBe('unset');
    spy.mockRestore();
  });
});

describe('saying no', () => {
  it('is remembered and sends and loads nothing', async () => {
    const analytics = await load();
    const listener = vi.fn();
    analytics.subscribeAnalyticsConsent(listener);

    analytics.setAnalyticsConsent(false);
    analytics.track('level_up', { level: 2 });
    analytics.trackScreen('feed');
    await settle();

    expect(analytics.analyticsConsent()).toBe('denied');
    expect(localStorage.getItem(KEY)).toBe('denied');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(world.imports).toBe(0);
    expect(web.initializeAnalytics).not.toHaveBeenCalled();
    expect(web.deleteInstallations).not.toHaveBeenCalled();
  });

  it('is still honoured after a reload', async () => {
    localStorage.setItem(KEY, 'denied');
    const analytics = await load();
    analytics.trackScreen('feed');
    await settle();
    expect(analytics.analyticsConsent()).toBe('denied');
    expect(world.imports).toBe(0);
  });
});

describe('on the web, after yes', () => {
  it('starts the SDK with consent mode set and advertising off', async () => {
    const analytics = await load();
    analytics.setAnalyticsConsent(true);
    await settle();

    expect(analytics.analyticsConsent()).toBe('granted');
    expect(localStorage.getItem(KEY)).toBe('granted');
    expect(web.isSupported).toHaveBeenCalled();
    expect(web.setConsent).toHaveBeenCalledWith({
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    expect(web.initializeAnalytics).toHaveBeenCalledWith(
      app,
      expect.objectContaining({
        config: expect.objectContaining({
          send_page_view: false,
          allow_google_signals: false,
          allow_ad_personalization_signals: false,
        }),
      }),
    );
    // The consent default has to be in place before the SDK's first command.
    expect(web.setConsent.mock.invocationCallOrder[0]!).toBeLessThan(web.initializeAnalytics.mock.invocationCallOrder[0]!);
    expect(web.setAnalyticsCollectionEnabled).toHaveBeenCalledWith(web.analytics, true);
  });

  it('starts only once, however many events follow', async () => {
    const analytics = await load();
    analytics.setAnalyticsConsent(true);
    analytics.track('lesson_start', { lesson_id: 'l1', instrument: 'guitar' });
    analytics.trackScreen('feed');
    analytics.track('level_up', { level: 2 });
    await settle();
    expect(web.initializeAnalytics).toHaveBeenCalledTimes(1);
    expect(web.logEvent).toHaveBeenCalledTimes(3);
  });

  it('sends events in the order they were made, with their parameters', async () => {
    const analytics = await load();
    analytics.setAnalyticsConsent(true);
    analytics.track('lesson_step', { lesson_id: 'l1', step_index: 2, step_kind: 'explain' });
    analytics.track('quiz_run_finish', { difficulty: 'hard', score: 120, stars: 2 });
    analytics.track('tuner_open');
    await settle();

    expect(web.logEvent.mock.calls).toEqual([
      [web.analytics, 'lesson_step', { lesson_id: 'l1', step_index: 2, step_kind: 'explain' }],
      [web.analytics, 'quiz_run_finish', { difficulty: 'hard', score: 120, stars: 2 }],
      [web.analytics, 'tuner_open', {}],
    ]);
  });

  it('reports screens as screen_view with the screen name, class and what identifies it', async () => {
    const analytics = await load();
    analytics.setAnalyticsConsent(true);
    analytics.trackScreen('song', 'songs', { song_id: 'ode-to-joy' });
    analytics.trackScreen('feed');
    await settle();

    expect(web.logEvent.mock.calls[0]).toEqual([
      web.analytics,
      'screen_view',
      { firebase_screen: 'song', firebase_screen_class: 'songs', screen_name: 'song', song_id: 'ode-to-joy' },
    ]);
    expect(web.logEvent.mock.calls[1]?.[2]).toMatchObject({ screen_name: 'feed', firebase_screen_class: 'feed' });
  });

  it('sets the two user properties and never a user id', async () => {
    const analytics = await load();
    analytics.setAnalyticsConsent(true);
    analytics.setAnalyticsUserProperties({ instrument: 'ukulele', level_bucket: '3-5' });
    await settle();
    expect(web.setUserProperties).toHaveBeenCalledWith(web.analytics, { instrument: 'ukulele', level_bucket: '3-5' });
    expect(web.setUserId).not.toHaveBeenCalled();
  });

  it('keeps parameters to numbers and short strings', async () => {
    const analytics = await load();
    analytics.setAnalyticsConsent(true);
    analytics.track('song_play', {
      song_id: 'x'.repeat(300),
      instrument: undefined as unknown as string,
    });
    analytics.track('quiz_run_finish', { difficulty: 'easy', score: Number.NaN, stars: 3 });
    await settle();

    const first = web.logEvent.mock.calls[0]?.[2] as Record<string, unknown>;
    expect(first.song_id).toHaveLength(100);
    expect('instrument' in first).toBe(false);
    expect(web.logEvent.mock.calls[1]?.[2]).toEqual({ difficulty: 'easy', stars: 3 });
  });

  it('starts again on its own at the next launch when the answer was yes', async () => {
    localStorage.setItem(KEY, 'granted');
    const analytics = await load();
    expect(web.initializeAnalytics).not.toHaveBeenCalled();

    analytics.trackScreen('feed');
    await settle();
    expect(web.initializeAnalytics).toHaveBeenCalledTimes(1);
    expect(web.logEvent).toHaveBeenCalledTimes(1);
  });

  it('sends nothing where the browser cannot run analytics', async () => {
    web.isSupported.mockResolvedValue(false);
    const analytics = await load();
    analytics.setAnalyticsConsent(true);
    analytics.trackScreen('feed');
    await settle();
    expect(web.initializeAnalytics).not.toHaveBeenCalled();
    expect(web.logEvent).not.toHaveBeenCalled();
  });

  it('survives an SDK that throws', async () => {
    web.logEvent.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const analytics = await load();
    analytics.setAnalyticsConsent(true);
    expect(() => analytics.trackScreen('feed')).not.toThrow();
    analytics.trackScreen('songs');
    await settle();
    expect(web.logEvent).toHaveBeenCalledTimes(2);
  });
});

describe('switching it off again', () => {
  it('stops the SDK, clears the client id and the cookies, and drops later events', async () => {
    const analytics = await load();
    analytics.setAnalyticsConsent(true);
    analytics.trackScreen('feed');
    await settle();
    web.logEvent.mockClear();

    analytics.setAnalyticsConsent(false);
    analytics.track('level_up', { level: 3 });
    await settle();

    expect(analytics.analyticsConsent()).toBe('denied');
    expect(web.setAnalyticsCollectionEnabled).toHaveBeenLastCalledWith(web.analytics, false);
    expect(web.setConsent).toHaveBeenLastCalledWith({
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    expect(web.deleteInstallations).toHaveBeenCalledTimes(1);
    expect(document.cookie).not.toMatch(/_ga/);
    expect(document.cookie).toMatch(/unrelated=1/);
    expect((window as unknown as Record<string, unknown>)['ga-disable-G-TEST123']).toBe(true);
    expect(web.logEvent).not.toHaveBeenCalled();
  });

  it('drops events that were still waiting when the person said no', async () => {
    const analytics = await load();
    analytics.setAnalyticsConsent(true);
    analytics.track('level_up', { level: 2 });
    analytics.setAnalyticsConsent(false);
    await settle();
    // The yes never got as far as starting the SDK, so there is nothing to stop and nothing was sent.
    expect(web.logEvent).not.toHaveBeenCalled();
    expect(web.initializeAnalytics).not.toHaveBeenCalled();
    expect(document.cookie).not.toMatch(/_ga/);
  });

  it('works from a fresh launch too, where the SDK never started in this visit', async () => {
    localStorage.setItem(KEY, 'granted');
    const analytics = await load();
    analytics.setAnalyticsConsent(false);
    await settle();
    expect(web.initializeAnalytics).not.toHaveBeenCalled();
    expect(document.cookie).not.toMatch(/_ga/);
    expect(localStorage.getItem(KEY)).toBe('denied');
  });

  it('can be turned on again, and starts cleanly', async () => {
    const analytics = await load();
    analytics.setAnalyticsConsent(true);
    await settle();
    analytics.setAnalyticsConsent(false);
    await settle();
    web.logEvent.mockClear();

    analytics.setAnalyticsConsent(true);
    analytics.trackScreen('learn');
    await settle();
    expect(web.setAnalyticsCollectionEnabled).toHaveBeenLastCalledWith(web.analytics, true);
    expect((window as unknown as Record<string, unknown>)['ga-disable-G-TEST123']).toBe(false);
    expect(web.logEvent).toHaveBeenCalledTimes(1);
    // One SDK instance for the page, however often it is switched.
    expect(web.initializeAnalytics).toHaveBeenCalledTimes(1);
  });
});

describe('subscribers', () => {
  it('hear about a change, and stop hearing once they unsubscribe', async () => {
    const analytics = await load();
    const listener = vi.fn();
    const stop = analytics.subscribeAnalyticsConsent(listener);
    analytics.setAnalyticsConsent(true);
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
    analytics.setAnalyticsConsent(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('follow an answer given in another tab', async () => {
    const analytics = await load();
    const listener = vi.fn();
    analytics.subscribeAnalyticsConsent(listener);
    expect(analytics.analyticsConsent()).toBe('unset');

    localStorage.setItem(KEY, 'granted');
    window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: 'granted' }));
    expect(analytics.analyticsConsent()).toBe('granted');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('in the Android app', () => {
  beforeEach(() => {
    world.native = true;
  });

  it('turns the native SDK on with ads denied, and never loads the web SDK', async () => {
    const analytics = await load();
    analytics.setAnalyticsConsent(true);
    await settle();

    expect(plugin.setConsent.mock.calls.map(([call]) => call)).toEqual([
      { type: 'ANALYTICS_STORAGE', status: 'GRANTED' },
      { type: 'AD_STORAGE', status: 'DENIED' },
      { type: 'AD_USER_DATA', status: 'DENIED' },
      { type: 'AD_PERSONALIZATION', status: 'DENIED' },
    ]);
    expect(plugin.setEnabled).toHaveBeenCalledWith({ enabled: true });
    expect(web.initializeAnalytics).not.toHaveBeenCalled();
  });

  it('logs events and screens through the plugin', async () => {
    const analytics = await load();
    analytics.setAnalyticsConsent(true);
    analytics.track('song_play', { song_id: 'ode-to-joy', instrument: 'guitar' });
    analytics.trackScreen('lesson', 'learn', { lesson_id: 'l-3' });
    analytics.setAnalyticsUserProperties({ instrument: 'guitar', level_bucket: '1-2' });
    await settle();

    expect(plugin.logEvent.mock.calls.map(([call]) => call)).toEqual([
      { name: 'song_play', params: { song_id: 'ode-to-joy', instrument: 'guitar' } },
      { name: 'screen_view', params: { screen_name: 'lesson', screen_class: 'learn', lesson_id: 'l-3' } },
    ]);
    expect(plugin.setUserProperty.mock.calls.map(([call]) => call)).toEqual([
      { key: 'instrument', value: 'guitar' },
      { key: 'level_bucket', value: '1-2' },
    ]);
    expect(plugin.setUserId).not.toHaveBeenCalled();
  });

  it('turns the native SDK off and forgets the app instance id on withdrawal', async () => {
    const analytics = await load();
    analytics.setAnalyticsConsent(true);
    await settle();
    plugin.setConsent.mockClear();

    analytics.setAnalyticsConsent(false);
    await settle();
    expect(plugin.setConsent).toHaveBeenCalledWith({ type: 'ANALYTICS_STORAGE', status: 'DENIED' });
    expect(plugin.setEnabled).toHaveBeenLastCalledWith({ enabled: false });
    expect(plugin.resetAnalyticsData).toHaveBeenCalledTimes(1);
  });

  it('carries on without analytics if the native SDK is not there (a build without google-services.json)', async () => {
    plugin.setEnabled.mockRejectedValueOnce(new Error('no firebase app'));
    const analytics = await load();
    analytics.setAnalyticsConsent(true);
    analytics.trackScreen('feed');
    await settle();
    expect(plugin.logEvent).not.toHaveBeenCalled();
  });
});
