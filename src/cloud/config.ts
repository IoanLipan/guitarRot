/**
 * Whether the cloud features (accounts, and later sync, leaderboard and
 * analytics) exist in this build, and the Firebase settings they use.
 *
 * Everything cloud is OFF unless the build is given a complete Firebase web
 * config (VITE_FIREBASE_*) or asked to use the local emulators. Without either
 * the app is the offline app it always was: no account UI, no network, and no
 * Firebase code even downloaded.
 */

import { Capacitor } from '@capacitor/core';

/** The web-app config of a Firebase project (Project settings, "Your apps"). */
export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  messagingSenderId: string;
  /** Google Analytics only; usage analytics (./analytics) exists only where this is set. */
  measurementId?: string;
};

export type CloudConfig = {
  /** Cloud features exist in this build. */
  enabled: boolean;
  /** Auth and Firestore talk to the local Emulator Suite instead of Google. */
  emulators: boolean;
  /** What to initialise the Firebase app with; null while disabled. */
  firebase: FirebaseWebConfig | null;
  /**
   * Show "Continue with Apple". Off until the project has Apple's sign-in set up (a paid Apple Developer
   * account, a Services ID and a key: docs/ACCOUNTS.md), because a button that cannot work is worse than none.
   */
  appleSignIn: boolean;
};

/** The only project the emulators ever see. The `demo-` prefix keeps them offline by design. */
export const EMULATOR_PROJECT_ID = 'demo-guitarrot';
export const AUTH_EMULATOR = { host: '127.0.0.1', port: 9099 } as const;
export const FIRESTORE_EMULATOR = { host: '127.0.0.1', port: 8080 } as const;

/** Stands in for a real config when the emulators are on: they check none of it. */
const EMULATOR_CONFIG: FirebaseWebConfig = {
  apiKey: 'demo-api-key',
  authDomain: `${EMULATOR_PROJECT_ID}.firebaseapp.com`,
  projectId: EMULATOR_PROJECT_ID,
  appId: '1:000000000000:web:0000000000000000000000',
  messagingSenderId: '000000000000',
};

/** The settings as the build hands them over (a subset of `import.meta.env`). */
export type CloudEnv = Readonly<{
  VITE_FIREBASE_API_KEY?: string;
  VITE_FIREBASE_AUTH_DOMAIN?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
  VITE_FIREBASE_APP_ID?: string;
  VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  VITE_FIREBASE_MEASUREMENT_ID?: string;
  VITE_FIREBASE_EMULATORS?: string;
  VITE_AUTH_APPLE?: string;
}>;

function present(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== '';
}

/**
 * Turns the build's settings into a config. The emulators win over any real
 * config in the same environment, so a developer with both can never write to
 * the real project by running against the emulators.
 */
export function readCloudConfig(env: CloudEnv): CloudConfig {
  const appleSignIn = env.VITE_AUTH_APPLE === '1';
  if (env.VITE_FIREBASE_EMULATORS === '1') {
    return { enabled: true, emulators: true, firebase: EMULATOR_CONFIG, appleSignIn };
  }
  const { VITE_FIREBASE_API_KEY: apiKey, VITE_FIREBASE_AUTH_DOMAIN: authDomain } = env;
  const { VITE_FIREBASE_PROJECT_ID: projectId, VITE_FIREBASE_APP_ID: appId } = env;
  const { VITE_FIREBASE_MESSAGING_SENDER_ID: messagingSenderId } = env;
  if (
    !present(apiKey) ||
    !present(authDomain) ||
    !present(projectId) ||
    !present(appId) ||
    !present(messagingSenderId)
  ) {
    return { enabled: false, emulators: false, firebase: null, appleSignIn: false };
  }
  const measurementId = env.VITE_FIREBASE_MEASUREMENT_ID;
  return {
    enabled: true,
    emulators: false,
    appleSignIn,
    firebase: {
      apiKey,
      authDomain,
      projectId,
      appId,
      messagingSenderId,
      ...(present(measurementId) ? { measurementId } : {}),
    },
  };
}

// Each variable is read by name, the form Vite replaces with the value at build
// time. (The Firebase SDK stays out of the initial bundle by being loaded with
// `import()`, not by this: a build without a config still contains the chunks,
// but nothing ever asks for them.)
export const cloud: CloudConfig = readCloudConfig({
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_MEASUREMENT_ID: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  VITE_FIREBASE_EMULATORS: import.meta.env.VITE_FIREBASE_EMULATORS,
  VITE_AUTH_APPLE: import.meta.env.VITE_AUTH_APPLE,
});

/** True when this build has cloud features. */
export const cloudEnabled: boolean = cloud.enabled;

/**
 * True when the Apple button should be shown: cloud features on, and either Apple's sign-in switched on
 * for the build or this is the iOS app. On iOS it is not optional: App Store rule 4.8 says an app that
 * offers Google sign-in must offer Sign in with Apple too, and there it is the system's own sheet (the
 * app's Apple ID and the App ID's capability), not the Services ID the web and Android flow need.
 * Web and Android are unchanged.
 */
export function appleSignInAvailable(): boolean {
  return cloud.enabled && (cloud.appleSignIn || Capacitor.getPlatform() === 'ios');
}
