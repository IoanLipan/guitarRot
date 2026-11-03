import { afterEach, describe, expect, it, vi } from 'vitest';
import { EMULATOR_PROJECT_ID, readCloudConfig } from './config';

const COMPLETE = {
  VITE_FIREBASE_API_KEY: 'AIza-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'guitarrot.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'guitarrot',
  VITE_FIREBASE_APP_ID: '1:123:web:abc',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123',
};

describe('readCloudConfig', () => {
  it('is off with nothing configured', () => {
    expect(readCloudConfig({})).toEqual({ enabled: false, emulators: false, firebase: null, appleSignIn: false });
  });

  it('is on with a complete web config, and keeps the measurement id only when given', () => {
    const config = readCloudConfig(COMPLETE);
    expect(config).toMatchObject({ enabled: true, emulators: false });
    expect(config.firebase).toEqual({
      apiKey: 'AIza-key',
      authDomain: 'guitarrot.firebaseapp.com',
      projectId: 'guitarrot',
      appId: '1:123:web:abc',
      messagingSenderId: '123',
    });
    expect(readCloudConfig({ ...COMPLETE, VITE_FIREBASE_MEASUREMENT_ID: 'G-XYZ' }).firebase?.measurementId).toBe('G-XYZ');
  });

  it.each(Object.keys(COMPLETE))('stays off when %s is missing or blank', (name) => {
    expect(readCloudConfig({ ...COMPLETE, [name]: undefined }).enabled).toBe(false);
    expect(readCloudConfig({ ...COMPLETE, [name]: '   ' }).enabled).toBe(false);
  });

  it('does not need the measurement id, which only analytics reads', () => {
    expect(readCloudConfig({ ...COMPLETE, VITE_FIREBASE_MEASUREMENT_ID: '' }).enabled).toBe(true);
  });

  it('is on with the emulators, with no config at all, on the demo project', () => {
    const config = readCloudConfig({ VITE_FIREBASE_EMULATORS: '1' });
    expect(config).toMatchObject({ enabled: true, emulators: true });
    expect(config.firebase?.projectId).toBe(EMULATOR_PROJECT_ID);
    expect(EMULATOR_PROJECT_ID.startsWith('demo-')).toBe(true);
  });

  it('never points the emulators at a real project, even when one is configured', () => {
    const config = readCloudConfig({ ...COMPLETE, VITE_FIREBASE_EMULATORS: '1' });
    expect(config.emulators).toBe(true);
    expect(config.firebase?.projectId).toBe(EMULATOR_PROJECT_ID);
    expect(config.firebase?.apiKey).not.toBe('AIza-key');
  });

  it('shows the Apple button only for a literal 1, and only where there are cloud features', () => {
    expect(readCloudConfig(COMPLETE).appleSignIn).toBe(false);
    expect(readCloudConfig({ ...COMPLETE, VITE_AUTH_APPLE: '1' }).appleSignIn).toBe(true);
    expect(readCloudConfig({ VITE_FIREBASE_EMULATORS: '1', VITE_AUTH_APPLE: '1' }).appleSignIn).toBe(true);
    for (const value of ['0', 'true', '', 'yes', ' 1']) {
      expect(readCloudConfig({ ...COMPLETE, VITE_AUTH_APPLE: value }).appleSignIn, value).toBe(false);
    }
    // Without a Firebase config there is no account UI at all, whatever the flag says.
    expect(readCloudConfig({ VITE_AUTH_APPLE: '1' })).toEqual({ enabled: false, emulators: false, firebase: null, appleSignIn: false });
  });

  it('only a literal 1 switches the emulators on', () => {
    for (const value of ['0', 'true', '', 'yes']) {
      expect(readCloudConfig({ VITE_FIREBASE_EMULATORS: value }).enabled).toBe(false);
    }
  });
});

describe('cloudEnabled, as the build reads it from the environment', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function freshConfig() {
    vi.resetModules();
    return import('./config');
  }

  it('is false when the build has no Firebase variables', async () => {
    vi.stubEnv('VITE_FIREBASE_EMULATORS', '');
    const { cloudEnabled, cloud } = await freshConfig();
    expect(cloudEnabled).toBe(false);
    expect(cloud.firebase).toBeNull();
  });

  it('is true when the five required variables are set', async () => {
    for (const [name, value] of Object.entries(COMPLETE)) vi.stubEnv(name, value);
    const { cloudEnabled, cloud } = await freshConfig();
    expect(cloudEnabled).toBe(true);
    expect(cloud.firebase?.projectId).toBe('guitarrot');
  });

  it('reads the Apple switch from the environment, off by default', async () => {
    vi.stubEnv('VITE_FIREBASE_EMULATORS', '1');
    expect((await freshConfig()).appleSignInAvailable()).toBe(false);
    vi.stubEnv('VITE_AUTH_APPLE', '1');
    expect((await freshConfig()).appleSignInAvailable()).toBe(true);
  });

  describe('Continue with Apple, by platform', () => {
    // Capacitor is read when the button decides, so each platform is a fresh import with that platform stubbed.
    async function appleOn(platform: 'web' | 'android' | 'ios', env: Record<string, string>) {
      vi.resetModules();
      vi.unstubAllEnvs();
      vi.doMock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => platform } }));
      for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
      return (await import('./config')).appleSignInAvailable();
    }

    afterEach(() => {
      vi.doUnmock('@capacitor/core');
    });

    it('stays behind VITE_AUTH_APPLE on the web and on Android', async () => {
      for (const platform of ['web', 'android'] as const) {
        expect(await appleOn(platform, { ...COMPLETE }), platform).toBe(false);
        expect(await appleOn(platform, { ...COMPLETE, VITE_AUTH_APPLE: '1' }), platform).toBe(true);
      }
    });

    it('is always there on iOS, because App Store rule 4.8 asks for it beside Google', async () => {
      expect(await appleOn('ios', { ...COMPLETE })).toBe(true);
      expect(await appleOn('ios', { ...COMPLETE, VITE_AUTH_APPLE: '0' })).toBe(true);
      expect(await appleOn('ios', { ...COMPLETE, VITE_AUTH_APPLE: '1' })).toBe(true);
    });

    it('is still off on iOS in a build with no cloud features, which has no account screen at all', async () => {
      expect(await appleOn('ios', { VITE_FIREBASE_EMULATORS: '' })).toBe(false);
    });
  });

  it('is true with the emulator switch alone', async () => {
    vi.stubEnv('VITE_FIREBASE_EMULATORS', '1');
    const { cloudEnabled, cloud } = await freshConfig();
    expect(cloudEnabled).toBe(true);
    expect(cloud.emulators).toBe(true);
  });
});
