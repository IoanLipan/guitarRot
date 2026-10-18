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
  },
};

export default config;
