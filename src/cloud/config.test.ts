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
    expect(readCloudConfig({})).toEqual({ enabled: false, emulators: false, firebase: null });
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

  it('is true with the emulator switch alone', async () => {
    vi.stubEnv('VITE_FIREBASE_EMULATORS', '1');
    const { cloudEnabled, cloud } = await freshConfig();
    expect(cloudEnabled).toBe(true);
    expect(cloud.emulators).toBe(true);
  });
});
