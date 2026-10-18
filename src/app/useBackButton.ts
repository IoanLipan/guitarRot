import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import type { TabId } from './TabBar';

/** What the Android Back button does, given what is on screen. */
export type BackAction =
  | 'close-settings'
  | 'close-lesson'
  | 'close-song'
  | 'go-to-feed'
  | 'minimize';

export type BackState = {
  settingsOpen: boolean;
  tab: TabId;
  /** A lesson is open in the Learn tab (it need not be the tab on screen). */
  lessonOpen: boolean;
  /** A song is open in the Songs tab (it need not be the tab on screen). */
  songOpen: boolean;
};

/**
 * Back peels one layer off the screen you are looking at: the Settings sheet
 * first, then the lesson or song you are inside, then the tab itself (back to
 * the Feed), and only from the Feed does it leave the app. A lesson open in
 * the Learn tab does not count while another tab is showing: closing
 * something you cannot see would look like Back did nothing.
 */
export function backAction({ settingsOpen, tab, lessonOpen, songOpen }: BackState): BackAction {
  if (settingsOpen) return 'close-settings';
  if (tab === 'learn' && lessonOpen) return 'close-lesson';
  if (tab === 'songs' && songOpen) return 'close-song';
  if (tab !== 'feed') return 'go-to-feed';
  return 'minimize';
}

/**
 * Routes the Android hardware / gesture Back button to `onBack`. Without a
 * listener the system just closes the app. Does nothing in a browser.
 */
export function useBackButton(onBack: () => void): void {
  const latest = useRef(onBack);
  latest.current = onBack;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handle: PluginListenerHandle | null = null;
    let removed = false;
    void App.addListener('backButton', () => latest.current()).then((registered) => {
      // Unmounted while the listener was still registering.
      if (removed) void registered.remove();
      else handle = registered;
    });

    return () => {
      removed = true;
      void handle?.remove();
    };
  }, []);
}

/** Leaves the app on screen but out of the way, which is what Back from the first screen should do. */
export function minimizeApp(): void {
  void App.minimizeApp().catch(() => {});
}
