import { useState } from 'react';
import { CloseIcon } from '@/ui/icons';
import { Capacitor } from '@capacitor/core';
import { tapHaptic } from './haptics';
import { ANDROID_APP_URL } from './links';
import { LogoMark } from './Logo';

export const APK_BANNER_DISMISSED_KEY = 'guitarrot.apkBanner.dismissed';

/**
 * Only someone reading the website on an Android phone can use the APK: the
 * installed app already is the app, and an iPhone or a desktop can't install
 * one.
 */
export function offersAndroidApp(userAgent: string, isNative: boolean): boolean {
  return !isNative && /Android/i.test(userAgent);
}

// Storage can be missing or throw (private mode, blocked site data); the
// banner then simply shows again next visit, which is the harmless failure.
function wasDismissed(): boolean {
  try {
    return localStorage.getItem(APK_BANNER_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberDismissed(): void {
  try {
    localStorage.setItem(APK_BANNER_DISMISSED_KEY, '1');
  } catch {
    // See wasDismissed.
  }
}

/**
 * "Get the Android app": shown at the top of the website on Android phones
 * until it is dismissed. `floating` lays it over the start screen, which fills
 * the viewport on its own; inside the app it takes its own row instead, so it
 * never covers a tab's header.
 */
export function AndroidAppBanner({ floating = false }: { floating?: boolean }) {
  const [hidden, setHidden] = useState(
    () => !offersAndroidApp(navigator.userAgent, Capacitor.isNativePlatform()) || wasDismissed(),
  );
  if (hidden) return null;

  function dismiss() {
    tapHaptic();
    rememberDismissed();
    setHidden(true);
  }

  return (
    <aside
      aria-label="Get the Android app"
      data-testid="android-app-banner"
      className={`flex items-center gap-3 border-b border-accent/25 bg-surface px-4 py-2.5 pt-[calc(env(safe-area-inset-top)+0.625rem)] ${
        floating ? 'fixed inset-x-0 top-0 z-40 shadow-[0_8px_24px_rgba(0,0,0,0.45)]' : 'shrink-0'
      }`}
    >
      <LogoMark className="h-9 w-auto shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold">Android app</p>
        <p className="truncate text-xs text-ink-dim">Works offline · no ads</p>
      </div>
      <a
        href={ANDROID_APP_URL}
        download
        onClick={() => tapHaptic()}
        className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-extrabold text-ground active:scale-95"
      >
        Download
      </a>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-dim active:scale-90"
      >
        <CloseIcon size={20} />
      </button>
    </aside>
  );
}
