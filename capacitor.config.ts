import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.guitarrot.app',
  appName: 'guitarRot',
  webDir: 'dist',
  backgroundColor: '#0b0b0f',
  plugins: {
    SplashScreen: {
      backgroundColor: '#0b0b0f',
      // Hidden manually once the audio-unlock gate has rendered, so the
      // splash never drops the user onto a flash of unstyled content.
      launchAutoHide: false,
    },
  },
};

export default config;
