/**
 * Usage analytics: which screens and features people use, and for how long.
 *
 * This file is the one API the rest of the app calls (`track`, `trackScreen`,
 * `setAnalyticsConsent`, `analyticsConsent`), and it is deliberately small:
 * the app imports it statically, so it holds only the consent choice and a
 * queue. Everything that talks to Google (the Firebase JS SDK on the web, the
 * native plugin on Android) lives in ./analyticsBackend, a separate chunk that
 * is fetched only after somebody has said yes.
 *
 * The rules, all enforced here and nowhere else:
 *  - Nothing happens in a build without cloud features, or without a GA
 *    measurement id (VITE_FIREBASE_MEASUREMENT_ID), or on the emulators: every
 *    function is a no-op and `analyticsAvailable()` is false, so the app shows
 *    no consent prompt and no setting.
 *  - Nothing is collected, loaded or even queued before consent is granted.
 *    The choice is opt-in (the EU is a home market) and lives in its own
 *    localStorage key rather than in the progress blob: it is a decision about
 *    this device, so it must never ride along with progress sync to another phone.
 *  - Saying no (or later switching it off) stops collection, and clears the
 *    analytics client id where the platform lets us.
 *  - No account id, no email and no free text is ever sent: events carry content
 *    ids and small numbers only (see AnalyticsEvents).
 */
import { cloud, cloudEnabled } from './config';

/** The device's choice: asked and said yes, asked and said no, or not asked yet. */
export type Consent = 'granted' | 'denied' | 'unset';

/** Where the choice is kept. The `.v1` leaves room to ask again if what is collected ever changes. */
export const CONSENT_KEY = 'guitarrot.analytics-consent.v1';

/** Every event the app sends, with the parameters it carries. A typo here is a compile error, not a hole in a report. */
export type AnalyticsEvents = {
  /** A lesson was opened. */
  lesson_start: { lesson_id: string; instrument: string };
  /** A step of a lesson was reached (the first step included). */
  lesson_step: { lesson_id: string; step_index: number; step_kind: string };
  /** A lesson was finished for the first time. */
  lesson_complete: { lesson_id: string; instrument: string };
  /** A song was listened to for long enough to count as played. */
  song_play: { song_id: string; instrument: string };
  quiz_run_start: { difficulty: string };
  quiz_run_finish: { difficulty: string; score: number; stars: number };
  achievement_unlock: { achievement_id: string };
  level_up: { level: number };
  instrument_switch: { to: string };
  tuner_open: Record<string, never>;
  /** A feed card was on screen for a moment. `level` is the riff's or chord's own difficulty; quiz cards have none. */
  feed_card_view: { kind: string; level?: number };
  /** GA4 recommended events. */
  sign_up: { method: 'google' | 'apple' | 'password' };
  login: { method: 'google' | 'apple' | 'password' };
  /** A username was claimed or changed. Never the name itself. */
  username_set: Record<string, never>;
  leaderboard_view: Record<string, never>;
};

export type AnalyticsEventName = keyof AnalyticsEvents;

/** What a user property or screen parameter may hold: a short string or a number. */
export type AnalyticsValue = string | number;

/** The two things we know about a player as a group, never as a person. */
export type AnalyticsUserProperties = { instrument?: string; level_bucket?: string };

/** GA4's own limits: 40 characters for a name, 100 for a value. Anything longer is cut, not dropped. */
const MAX_VALUE_LENGTH = 100;

function clean(params: object | undefined): Record<string, AnalyticsValue> {
  const out: Record<string, AnalyticsValue> = {};
  for (const [name, value] of Object.entries(params ?? {})) {
    if (typeof value === 'number' && Number.isFinite(value)) out[name] = value;
    else if (typeof value === 'string') out[name] = value.slice(0, MAX_VALUE_LENGTH);
  }
  return out;
}

// --- Is there analytics in this build? ---------------------------------------

/**
 * True when this build can send analytics at all: cloud features are on, it is
 * not the emulator build, and the Firebase project has Google Analytics
 * (a measurement id). Where it is false the app asks nothing and says nothing.
 * (A function, not a constant, so a test can change the build under it.)
 */
export function analyticsAvailable(): boolean {
  const measurementId = cloud.firebase?.measurementId;
  return cloudEnabled && !cloud.emulators && measurementId !== undefined && measurementId !== '';
}

// --- The choice --------------------------------------------------------------

let current: Consent | undefined;
const listeners = new Set<() => void>();

function readStored(): Consent {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    return stored === 'granted' || stored === 'denied' ? stored : 'unset';
  } catch {
    // Storage blocked (private window, site data off): the safe reading is "not asked", and nothing is collected.
    return 'unset';
  }
}

/** The device's choice. `unset` for ever where the build has no analytics. */
export function analyticsConsent(): Consent {
  if (!analyticsAvailable()) return 'unset';
  current ??= readStored();
  return current;
}

/** Calls `listener` whenever the choice changes, here or in another tab. Returns the way to stop. */
export function subscribeAnalyticsConsent(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

function notify(): void {
  for (const listener of [...listeners]) listener();
}

/** Another tab answered the question (or took the answer back): this one follows. */
function onStorage(event: StorageEvent): void {
  if (event.key !== CONSENT_KEY && event.key !== null) return;
  const next = readStored();
  if (next === current) return;
  current = next;
  notify();
}

// --- The backend, loaded on demand and driven through one queue ---------------

type Backend = typeof import('./analyticsBackend');

let loading: Promise<Backend> | undefined;
function loadBackend(): Promise<Backend> {
  loading ??= import('./analyticsBackend').catch((error: unknown) => {
    loading = undefined;
    throw error;
  });
  return loading;
}

/** The backend once it has been switched on for this consent, or null if the platform cannot do analytics. */
let started: Promise<Backend | null> | undefined;

function ensureStarted(): Promise<Backend | null> {
  started ??= loadBackend()
    .then(async (backend) => ((await backend.enable()) ? backend : null))
    .catch((error: unknown) => {
      started = undefined;
      throw error;
    });
  return started;
}

/**
 * Every call to the backend goes down one line, in the order it was made, so
 * "switch on, log, log, switch off" can never run as "log, switch off, switch
 * on". A failure (offline while fetching the chunk, an ad blocker) is swallowed:
 * analytics must never be the reason anything in the app breaks.
 */
let line: Promise<unknown> = Promise.resolve();
function enqueue(job: () => Promise<void>): void {
  line = line.then(job).catch(() => undefined);
}

/** Runs `op` on the backend if, at the moment it runs, the person has said yes. */
function run(op: (backend: Backend) => Promise<void> | void): void {
  if (analyticsConsent() !== 'granted') return;
  enqueue(async () => {
    // The choice may have changed while this waited its turn.
    if (analyticsConsent() !== 'granted') return;
    const backend = await ensureStarted();
    if (backend === null || analyticsConsent() !== 'granted') return;
    await op(backend);
  });
}

function stop(): void {
  enqueue(async () => {
    started = undefined;
    await (await loadBackend()).disable();
  });
}

// --- The API -----------------------------------------------------------------

/**
 * Records the answer to "Share usage statistics?". Yes starts analytics (the
 * SDK is fetched now); no, after a yes, stops it and clears the client id.
 */
export function setAnalyticsConsent(granted: boolean): void {
  if (!analyticsAvailable()) return;
  const before = analyticsConsent();
  const next: Consent = granted ? 'granted' : 'denied';
  current = next;
  try {
    localStorage.setItem(CONSENT_KEY, next);
  } catch {
    // Could not be remembered; it holds for this visit.
  }
  notify();
  if (granted) run(() => undefined);
  else if (before === 'granted') stop();
}

/** Logs one event. Does nothing unless analytics exists in this build and the person said yes. */
export function track<E extends AnalyticsEventName>(event: E, params?: AnalyticsEvents[E]): void {
  const values = clean(params);
  run((backend) => backend.logEvent(event, values));
}

/**
 * Logs that a screen is now showing. GA4 measures how long people stay on each
 * from the gap to the next one, so it is called once per change, from one place.
 * `params` carries what identifies the thing on screen (`song_id`, `lesson_id`).
 */
export function trackScreen(screenName: string, screenClass?: string, params?: Record<string, AnalyticsValue>): void {
  const values = clean(params);
  run((backend) => backend.screenView(screenName, screenClass ?? screenName, values));
}

/** Tells Google the groups this player falls in (the instrument, a band of levels), never who they are. */
export function setAnalyticsUserProperties(properties: AnalyticsUserProperties): void {
  const values = clean(properties);
  run((backend) => backend.setUserProperties(values));
}
