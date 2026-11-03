/** Play requires the policy to be reachable from inside the app, not only from the store listing. */
export const PRIVACY_URL = 'https://guitar-rot.vercel.app/privacy.html';

/** Apple's reviewers and Play both ask for terms that people accept when they make an account, reachable from inside the app. */
export const TERMS_URL = 'https://guitar-rot.vercel.app/terms.html';

/** Where reports and questions go; also in the privacy policy and the terms. */
export const CONTACT_EMAIL = 'guitar.rot@proton.me';

/** The sideloadable build: GitHub always serves the newest release's APK at this address. */
export const ANDROID_APP_URL =
  'https://github.com/IoanLipan/guitarRot/releases/latest/download/guitarRot.apk';
