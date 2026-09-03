export const PROGRESS_VERSION = 1;

export type SrsItem = {
  id: string;
  /** Epoch milliseconds. */
  dueAt: number;
  intervalDays: number;
  /** SM-2 ease factor. Starts at 2.5 and floors at 1.3. */
  ease: number;
  reps: number;
  lapses: number;
};

export type Settings = {
  leftHanded: boolean;
  preferFlats: boolean;
  /** Feed riff playback speed, 0.25 to 1.5. */
  defaultSpeed: number;
  /** Guitar voicing id from `audio/tones.ts`. */
  toneId: string;
};

export type DailyStat = {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  answered: number;
  correct: number;
};

export type ProgressState = {
  version: number;
  srs: Record<string, SrsItem>;
  /** Ring buffer of recently shown content ids; newest last. */
  seenContent: string[];
  streak: { current: number; longest: number; lastActiveDate: string | null };
  daily: Record<string, DailyStat>;
  settings: Settings;
};

export const DEFAULT_SETTINGS: Settings = {
  leftHanded: false,
  preferFlats: false,
  defaultSpeed: 1,
  toneId: 'clean',
};

export const SEEN_LIMIT = 200;
export const DAILY_KEEP_DAYS = 365;

export function emptyProgressState(): ProgressState {
  return {
    version: PROGRESS_VERSION,
    srs: {},
    seenContent: [],
    streak: { current: 0, longest: 0, lastActiveDate: null },
    daily: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSrsItem(value: unknown): value is SrsItem {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.dueAt === 'number' &&
    typeof value.intervalDays === 'number' &&
    typeof value.ease === 'number' &&
    typeof value.reps === 'number' &&
    typeof value.lapses === 'number'
  );
}

function isDailyStat(value: unknown): value is DailyStat {
  if (!isRecord(value)) return false;
  return (
    typeof value.date === 'string' &&
    typeof value.answered === 'number' &&
    typeof value.correct === 'number'
  );
}

/**
 * Turns whatever came out of storage into a usable state. Anything
 * unrecognised is discarded rather than trusted: a corrupt blob must not be
 * able to crash the app on launch, and a lost streak beats a broken app.
 */
export function migrate(raw: unknown): ProgressState {
  if (!isRecord(raw) || raw.version !== PROGRESS_VERSION) return emptyProgressState();

  const base = emptyProgressState();

  const srs: Record<string, SrsItem> = {};
  if (isRecord(raw.srs)) {
    for (const [key, value] of Object.entries(raw.srs)) {
      if (isSrsItem(value)) srs[key] = value;
    }
  }

  const daily: Record<string, DailyStat> = {};
  if (isRecord(raw.daily)) {
    for (const [key, value] of Object.entries(raw.daily)) {
      if (isDailyStat(value)) daily[key] = value;
    }
  }

  const seenContent = Array.isArray(raw.seenContent)
    ? raw.seenContent.filter((id): id is string => typeof id === 'string')
    : [];

  const streak = isRecord(raw.streak)
    ? {
        current: typeof raw.streak.current === 'number' ? raw.streak.current : 0,
        longest: typeof raw.streak.longest === 'number' ? raw.streak.longest : 0,
        lastActiveDate:
          typeof raw.streak.lastActiveDate === 'string' ? raw.streak.lastActiveDate : null,
      }
    : base.streak;

  const settings = isRecord(raw.settings)
    ? {
        leftHanded:
          typeof raw.settings.leftHanded === 'boolean'
            ? raw.settings.leftHanded
            : DEFAULT_SETTINGS.leftHanded,
        preferFlats:
          typeof raw.settings.preferFlats === 'boolean'
            ? raw.settings.preferFlats
            : DEFAULT_SETTINGS.preferFlats,
        defaultSpeed:
          typeof raw.settings.defaultSpeed === 'number'
            ? raw.settings.defaultSpeed
            : DEFAULT_SETTINGS.defaultSpeed,
        toneId:
          typeof raw.settings.toneId === 'string'
            ? raw.settings.toneId
            : DEFAULT_SETTINGS.toneId,
      }
    : { ...DEFAULT_SETTINGS };

  return { version: PROGRESS_VERSION, srs, seenContent, streak, daily, settings };
}

/** Appends an id, moving a repeat to the end and trimming to the limit. */
export function pushSeen(seen: string[], id: string, limit: number = SEEN_LIMIT): string[] {
  const without = seen.filter((existing) => existing !== id);
  without.push(id);
  return without.length > limit ? without.slice(without.length - limit) : without;
}

export function pruneDaily(
  daily: Record<string, DailyStat>,
  keepDays: number,
  today: string,
): Record<string, DailyStat> {
  const cutoff = new Date(`${today}T00:00:00Z`).getTime() - keepDays * 24 * 60 * 60 * 1000;
  const kept: Record<string, DailyStat> = {};
  for (const [date, stat] of Object.entries(daily)) {
    if (new Date(`${date}T00:00:00Z`).getTime() >= cutoff) kept[date] = stat;
  }
  return kept;
}
