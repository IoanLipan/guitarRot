/// <reference types="@capacitor-firebase/authentication" />

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.guitarrot.app',
  appName: 'guitarRot',
  webDir: 'dist',
  backgroundColor: '#0b0b0f',
  android: {
    // Tailwind v4 needs Chrome 111 (cascade layers, @property, color-mix), so a
    // phone whose Android System WebView is older gets the plain page named in
    // server.errorPath below instead of an app that renders unstyled.
    minWebViewVersion: 111,
  },
  server: {
    // Served from webDir (public/webview-update.html), so it works offline and
    // carries no JS or framework: it has to render on the very WebView that
    // was too old for the app.
    errorPath: 'webview-update.html',
  },
  plugins: {
    SplashScreen: {
      backgroundColor: '#0b0b0f',
      // Hidden manually once the audio-unlock gate has rendered, so the
      // splash never drops the user onto a flash of unstyled content.
      launchAutoHide: false,
    },
    SystemBars: {
      // The system bars sit on our dark ground, so their icons must be light.
      // DARK is the name for "light icons, for a dark background". The default
      // follows the phone's light/dark setting, which on a light-mode phone
      // would paint dark icons onto the dark strip.
      style: 'DARK',
    },
    FirebaseAuthentication: {
      // Google refuses OAuth inside a WebView, so on Android the sign-in is the
      // native Google dialog. The plugin only fetches the Google ID token; the
      // JS SDK signs in with it (src/cloud/auth.ts), so there is one auth state
      // for the whole app and the plugin never keeps a second, native user.
      // Apple is Firebase's browser flow, run by the same plugin. Its Apple handler
      // ignores skipNativeAuth and signs a native user in too, so the app takes the
      // ID token and raw nonce from the result and signs that native user out again.
      // The Apple button itself shows only with VITE_AUTH_APPLE=1 (docs/ACCOUNTS.md).
      skipNativeAuth: true,
      providers: ['google.com', 'apple.com'],
    },
  },
};

export default config;
