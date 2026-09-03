import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { emptyProgressState, migrate, type ProgressState } from './types';

export const STORAGE_KEY = 'guitarrot.progress.v1';

export interface ProgressRepo {
  load(): Promise<ProgressState>;
  save(state: ProgressState): Promise<void>;
  exportJson(): Promise<string>;
  importJson(json: string): Promise<void>;
}

/**
 * Native implementation, backed by `@capacitor/preferences` (UserDefaults on
 * iOS, SharedPreferences on Android). Same JSON-blob shape as the web repo,
 * so export/import round-trips between a browser and a device build.
 */
export class NativeProgressRepo implements ProgressRepo {
  async load(): Promise<ProgressState> {
    try {
      const { value } = await Preferences.get({ key: STORAGE_KEY });
      if (value === null) return emptyProgressState();
      return migrate(JSON.parse(value));
    } catch {
      return emptyProgressState();
    }
  }

  async save(state: ProgressState): Promise<void> {
    await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(state) });
  }

  async exportJson(): Promise<string> {
    return JSON.stringify(await this.load(), null, 2);
  }

  async importJson(json: string): Promise<void> {
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('That file is not a guitarRot progress export.');
    }
    await this.save(migrate(parsed));
  }
}

/** Browser implementation, used in `npm run dev` and in tests. */
export class WebProgressRepo implements ProgressRepo {
  async load(): Promise<ProgressState> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return emptyProgressState();
      return migrate(JSON.parse(raw));
    } catch {
      // Covers a corrupt/unparseable blob AND localStorage access itself
      // throwing (e.g. Safari's SecurityError with site data blocked, or
      // some private-browsing configurations) -- either way, launch must
      // never crash.
      return emptyProgressState();
    }
  }

  async save(state: ProgressState): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  async exportJson(): Promise<string> {
    return JSON.stringify(await this.load(), null, 2);
  }

  async importJson(json: string): Promise<void> {
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('That file is not a guitarRot progress export.');
    }
    await this.save(migrate(parsed));
  }
}

/** Native builds get device-native storage; the browser keeps using localStorage. */
export function createProgressRepo(): ProgressRepo {
  return Capacitor.isNativePlatform() ? new NativeProgressRepo() : new WebProgressRepo();
}

/** Coalesces a burst of state changes into one write. */
export function createDebouncedSaver(
  repo: ProgressRepo,
  ms = 500,
  onError?: (error: unknown) => void,
): { save(state: ProgressState): void; flush(): Promise<void> } {
  let pending: ProgressState | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const handleError = onError ?? ((): void => {});

  async function write(): Promise<void> {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    const state = pending;
    pending = null;
    if (state !== null) await repo.save(state);
  }

  return {
    save(state) {
      pending = state;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        write().catch(handleError);
      }, ms);
    },
    flush: () => write().catch(handleError),
  };
}
