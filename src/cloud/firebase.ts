/**
 * The Firebase app and its services, created on first use.
 *
 * Nothing here runs at startup and nothing imports the SDK at the top of the
 * file: each part of the SDK is its own `import()`, so it is a separate chunk
 * that is fetched only when something asks for it, and never in a build with
 * cloud features off. Later phases get their handles from here:
 *
 *     const db = await getFirestoreDb();
 *     const { doc, setDoc } = await loadFirestoreSdk();
 *
 * Every getter is memoised: one app, one Auth, one Firestore for the page.
 */
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { AUTH_EMULATOR, cloud, cloudEnabled, FIRESTORE_EMULATOR } from './config';

/** Something cloud was asked for in a build that has no cloud features. */
export class CloudDisabledError extends Error {
  constructor() {
    super('Cloud features are not enabled in this build.');
    this.name = 'CloudDisabledError';
  }
}

/** Like `once`, but a failure (offline while fetching a chunk) is forgotten so the next call tries again. */
function memo<T>(load: () => Promise<T>): () => Promise<T> {
  let cached: Promise<T> | undefined;
  return () => {
    cached ??= load().catch((error: unknown) => {
      cached = undefined;
      throw error;
    });
    return cached;
  };
}

// The SDK's parts. `import()` of a bare package name is what lets the bundler split them out.
export const loadAppSdk = memo(() => import('firebase/app'));
export const loadAuthSdk = memo(() => import('firebase/auth'));
export const loadFirestoreSdk = memo(() => import('firebase/firestore'));

export const getFirebaseApp = memo(async (): Promise<FirebaseApp> => {
  if (!cloudEnabled || cloud.firebase === null) throw new CloudDisabledError();
  const { getApp, getApps, initializeApp } = await loadAppSdk();
  return getApps().length > 0 ? getApp() : initializeApp(cloud.firebase);
});

export const getFirebaseAuth = memo(async (): Promise<Auth> => {
  const app = await getFirebaseApp();
  const sdk = await loadAuthSdk();
  // The Android WebView keeps the signed-in user in IndexedDB. Spelling that out (rather than
  // letting `getAuth` probe for a popup/redirect resolver it has no use for) is what the
  // Capacitor plugin's own guide asks for. The SDK takes the first of these that works, so a
  // WebView without storage still signs in, for the length of the session. A browser takes the full default.
  const auth = Capacitor.isNativePlatform()
    ? sdk.initializeAuth(app, {
        persistence: [sdk.indexedDBLocalPersistence, sdk.browserLocalPersistence, sdk.inMemoryPersistence],
      })
    : sdk.getAuth(app);
  if (cloud.emulators) {
    sdk.connectAuthEmulator(auth, `http://${AUTH_EMULATOR.host}:${AUTH_EMULATOR.port}`, { disableWarnings: true });
  }
  return auth;
});

export const getFirestoreDb = memo(async (): Promise<Firestore> => {
  const app = await getFirebaseApp();
  const sdk = await loadFirestoreSdk();
  // Reads and writes survive a dropped connection, and the app keeps working on its local copy
  // until it is back. A page open in several tabs shares one cache; the app's WebView is one tab.
  // Where there is no IndexedDB (a test, a private window) the cache lives in memory instead.
  const localCache =
    typeof indexedDB === 'undefined'
      ? sdk.memoryLocalCache()
      : sdk.persistentLocalCache({
          tabManager: Capacitor.isNativePlatform()
            ? sdk.persistentSingleTabManager(undefined)
            : sdk.persistentMultipleTabManager(),
        });
  const db = sdk.initializeFirestore(app, {
    localCache,
    // A WebView or a proxy that breaks Firestore's streaming connection falls back to long polling.
    experimentalAutoDetectLongPolling: true,
  });
  if (cloud.emulators) sdk.connectFirestoreEmulator(db, FIRESTORE_EMULATOR.host, FIRESTORE_EMULATOR.port);
  return db;
});
