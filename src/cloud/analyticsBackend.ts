/**
 * The part of analytics that talks to Google. ./analytics imports it with
 * `import()` only once somebody has said yes (or to switch it off again), so
 * neither the Firebase Analytics SDK nor the native plugin is ever fetched by
 * a person who has not agreed, and neither is in the first download.
 *
 * Two backends behind one set of functions:
 *  - the web, on the Firebase JS SDK's `firebase/analytics` (gtag.js);
 *  - the Android app, on the native Firebase Analytics SDK through
 *    @capacitor-firebase/analytics (Google refuses nothing here, but a WebView
 *    running gtag.js would report a browser, not the app).
 *
 * Whichever it is, advertising is off for good: ad storage, ad user data and
 * ad personalisation are denied, Google signals is off, and no user id is set.
 */
import { Capacitor } from '@capacitor/core';
import type { Analytics } from 'firebase/analytics';
import { cloud } from './config';
import { getFirebaseApp } from './firebase';

type Values = Record<string, string | number>;

/** Consent mode (gtag / Firebase): analytics storage is what was agreed to, everything about ads is not. */
const GRANTED = {
  analytics_storage: 'granted',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
} as const;
const DENIED = {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
} as const;

/**
 * What the web SDK is started with. The page view gtag would send by itself is
 * off (the app is one page; the app reports its own screens), Google signals
 * and ad personalisation are off, and a dev build streams to GA's DebugView.
 */
const GTAG_CONFIG = {
  send_page_view: false,
  allow_google_signals: false,
  allow_ad_personalization_signals: false,
  // The _ga cookies last 13 months instead of gtag's 2 years (the policy says so,
  // and it is the ceiling EU regulators accept for analytics cookies).
  cookie_expires: 13 * 30 * 24 * 60 * 60,
  ...(import.meta.env.DEV ? { debug_mode: true } : {}),
};

// --- Web ----------------------------------------------------------------------

type WebSdk = typeof import('firebase/analytics');
let webSdk: WebSdk | undefined;
let webAnalytics: Analytics | undefined;

/** gtag.js's own off switch: while this window property is true it sends nothing. */
function setGaDisabled(disabled: boolean): void {
  const id = cloud.firebase?.measurementId;
  if (id === undefined || id === '' || typeof window === 'undefined') return;
  (window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = disabled;
}

/** Removes the cookies gtag.js keeps its client id in (`_ga`, `_ga_<id>`), on this host and its parent domains. */
function clearGaCookies(): void {
  try {
    const names = document.cookie
      .split(';')
      .map((cookie) => (cookie.split('=')[0] ?? '').trim())
      .filter((name) => name === '_ga' || name === '_gid' || name.startsWith('_ga_'));
    if (names.length === 0) return;
    const labels = location.hostname.split('.');
    const domains = ['', ...labels.map((_, index) => `.${labels.slice(index).join('.')}`)];
    for (const name of names) {
      for (const domain of domains) {
        document.cookie = `${name}=; Max-Age=0; path=/${domain === '' ? '' : `; domain=${domain}`}`;
      }
    }
  } catch {
    // No cookie access here; nothing to clear.
  }
}

async function enableWeb(): Promise<boolean> {
  const sdk = await import('firebase/analytics');
  // Cookies or IndexedDB unavailable (private window, a browser extension page): no analytics there.
  if (!(await sdk.isSupported())) return false;
  const app = await getFirebaseApp();
  // Before the SDK's first command this sets the consent *default* gtag starts with, so the very
  // first hit already carries "analytics yes, ads no"; afterwards it is an update.
  sdk.setConsent(GRANTED);
  webAnalytics ??= sdk.initializeAnalytics(app, { config: GTAG_CONFIG });
  sdk.setAnalyticsCollectionEnabled(webAnalytics, true);
  setGaDisabled(false);
  webSdk = sdk;
  return true;
}

async function disableWeb(): Promise<void> {
  setGaDisabled(true);
  if (webSdk !== undefined && webAnalytics !== undefined) {
    webSdk.setAnalyticsCollectionEnabled(webAnalytics, false);
    webSdk.setConsent(DENIED);
    try {
      // The Firebase installation id is what gtag.js keys the client on: deleting it ends that client.
      const { getInstallations, deleteInstallations } = await import('firebase/installations');
      await deleteInstallations(getInstallations(webAnalytics.app));
    } catch {
      // Offline or already gone; the next launch starts without it anyway.
    }
  } else if (typeof indexedDB !== 'undefined') {
    // The SDK never started in this visit; a previous visit's installation record is still on disk.
    try {
      indexedDB.deleteDatabase('firebase-installations-database');
    } catch {
      // Same: best effort.
    }
  }
  clearGaCookies();
}

// --- Android (native Firebase Analytics) ----------------------------------------

const loadPlugin = () => import('@capacitor-firebase/analytics');

async function enableNative(): Promise<boolean> {
  try {
    const { FirebaseAnalytics, ConsentType, ConsentStatus } = await loadPlugin();
    await FirebaseAnalytics.setConsent({ type: ConsentType.AnalyticsStorage, status: ConsentStatus.Granted });
    for (const type of [ConsentType.AdStorage, ConsentType.AdUserData, ConsentType.AdPersonalization]) {
      await FirebaseAnalytics.setConsent({ type, status: ConsentStatus.Denied });
    }
    // Collection is off in the manifest until this; the SDK remembers it across launches.
    await FirebaseAnalytics.setEnabled({ enabled: true });
    return true;
  } catch {
    // No google-services.json in this build, or the SDK refused: no analytics, and nothing else affected.
    return false;
  }
}

async function disableNative(): Promise<void> {
  try {
    const { FirebaseAnalytics, ConsentType, ConsentStatus } = await loadPlugin();
    await FirebaseAnalytics.setConsent({ type: ConsentType.AnalyticsStorage, status: ConsentStatus.Denied });
    await FirebaseAnalytics.setEnabled({ enabled: false });
    // Forgets the app instance id, which is what ties earlier events together.
    await FirebaseAnalytics.resetAnalyticsData();
  } catch {
    // Nothing native to switch off.
  }
}

// --- One face --------------------------------------------------------------------

const native = (): boolean => Capacitor.isNativePlatform();

/** Switches analytics on for this consent. Resolves false where the platform cannot do it. Safe to call again. */
export function enable(): Promise<boolean> {
  return native() ? enableNative() : enableWeb();
}

/** Switches analytics off and clears the client id as far as the platform allows. Safe to call when it never started. */
export function disable(): Promise<void> {
  return native() ? disableNative() : disableWeb();
}

export async function logEvent(name: string, params: Values): Promise<void> {
  if (native()) {
    const { FirebaseAnalytics } = await loadPlugin();
    await FirebaseAnalytics.logEvent({ name, params });
    return;
  }
  if (webSdk !== undefined && webAnalytics !== undefined) webSdk.logEvent(webAnalytics, name, params);
}

/** A screen came up. GA4 turns the gaps between these into time per screen. */
export async function screenView(screenName: string, screenClass: string, params: Values): Promise<void> {
  if (native()) {
    const { FirebaseAnalytics } = await loadPlugin();
    await FirebaseAnalytics.logEvent({
      name: 'screen_view',
      params: { screen_name: screenName, screen_class: screenClass, ...params },
    });
    return;
  }
  if (webSdk !== undefined && webAnalytics !== undefined) {
    webSdk.logEvent(webAnalytics, 'screen_view', {
      firebase_screen: screenName,
      firebase_screen_class: screenClass,
      screen_name: screenName,
      ...params,
    });
  }
}

export async function setUserProperties(properties: Values): Promise<void> {
  if (native()) {
    const { FirebaseAnalytics } = await loadPlugin();
    for (const [key, value] of Object.entries(properties)) {
      await FirebaseAnalytics.setUserProperty({ key, value: String(value) });
    }
    return;
  }
  if (webSdk !== undefined && webAnalytics !== undefined) webSdk.setUserProperties(webAnalytics, properties);
}
