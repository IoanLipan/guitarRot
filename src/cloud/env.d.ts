/**
 * The build-time settings of the cloud features (see .env.example). Every one
 * is optional: a build without them is the offline app, with no account UI.
 */
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  /** "1" points Auth and Firestore at the local Firebase Emulator Suite. */
  readonly VITE_FIREBASE_EMULATORS?: string;
}
