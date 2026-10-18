import { App } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';

export type AppStateHandlers = {
  /** The app left the screen: another app, the home screen, a locked phone. */
  onBackground?: () => void;
  /** The app is back on screen. */
  onForeground?: () => void;
};

/**
 * Tells you when the app goes to the background and comes back. Returns the
 * function that stops listening.
 *
 * `visibilitychange` covers a browser tab and (usually) the Android WebView;
 * Capacitor's `pause` / `resume` cover the native activity, which is the
 * reliable signal on a phone. On a phone both can fire for one trip to the
 * home screen, so handlers must be safe to run twice.
 */
export function subscribeAppState({ onBackground, onForeground }: AppStateHandlers): () => void {
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') onBackground?.();
    else onForeground?.();
  };
  document.addEventListener('visibilitychange', onVisibility);

  const native: Promise<PluginListenerHandle>[] = [];
  if (Capacitor.isNativePlatform()) {
    native.push(App.addListener('pause', () => onBackground?.()));
    native.push(App.addListener('resume', () => onForeground?.()));
  }

  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    for (const pending of native) {
      // The listener may still be registering; remove it as soon as it exists.
      void pending.then((handle) => handle.remove()).catch(() => {});
    }
  };
}
