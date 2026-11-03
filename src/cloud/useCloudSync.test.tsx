import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { emptyProgressState, type ProgressState } from '@/progress';
import { AccountContext } from './AccountProvider';
import { runBeforeDeleteHooks } from './deleteHooks';
import type { SyncSession, SyncStatus } from './sync';
import type { AccountApi, AccountUser } from './types';
import { useCloudSync, type SyncableProgress } from './useCloudSync';

const world = vi.hoisted(() => ({
  cloudEnabled: true,
  connectSync: vi.fn(),
  deleteCloudProgress: vi.fn(),
}));

vi.mock('./config', () => ({
  get cloudEnabled() {
    return world.cloudEnabled;
  },
}));
vi.mock('./sync', () => ({
  connectSync: world.connectSync,
  deleteCloudProgress: world.deleteCloudProgress,
}));

type ConnectOptions = {
  uid: string;
  local: { get: () => ProgressState; merge: (remote: ProgressState) => ProgressState };
  onStatus: (status: SyncStatus) => void;
};

function user(uid: string): AccountUser {
  return { uid, email: `${uid}@example.com`, displayName: uid, providers: ['password'], emailVerified: true };
}

function accountWrapper(account: Partial<AccountApi>) {
  const value = { status: 'signed-out', user: null, ...account } as AccountApi;
  return function Wrapper({ children }: { children: ReactNode }) {
    return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
  };
}

const signedIn = (uid = 'ada') => ({ status: 'signed-in' as const, user: user(uid) });

function progressStub(patch: Partial<SyncableProgress> = {}): SyncableProgress {
  const state = emptyProgressState();
  return { state, loaded: true, getState: () => state, mergeRemote: (remote) => remote, ...patch };
}

type FakeSession = { [K in keyof SyncSession]: ReturnType<typeof vi.fn> };
function fakeSession(): FakeSession {
  return {
    localChanged: vi.fn(),
    flush: vi.fn(() => Promise.resolve()),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
  };
}

/** What each `connectSync` call was given, and the session it handed back. */
let sessions: FakeSession[];
let connects: ConnectOptions[];

beforeEach(() => {
  world.cloudEnabled = true;
  sessions = [];
  connects = [];
  world.connectSync.mockReset();
  world.connectSync.mockImplementation((options: ConnectOptions) => {
    connects.push(options);
    const session = fakeSession();
    sessions.push(session);
    return Promise.resolve(session);
  });
  world.deleteCloudProgress.mockReset();
  world.deleteCloudProgress.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

/** Lets the dynamic import and the connect settle. */
async function settle() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('useCloudSync: when there is nothing to sync', () => {
  it('does nothing in a build without cloud features, even with an account in the context', async () => {
    world.cloudEnabled = false;
    const { result } = renderHook(() => useCloudSync(progressStub()), { wrapper: accountWrapper(signedIn()) });
    await settle();

    expect(world.connectSync).not.toHaveBeenCalled();
    expect(result.current.status).toBeNull();
    await expect(result.current.flush()).resolves.toBeUndefined();
  });

  it('does nothing while signed out or while the account is still loading', async () => {
    for (const status of ['signed-out', 'loading', 'disabled'] as const) {
      const { result, unmount } = renderHook(() => useCloudSync(progressStub()), {
        wrapper: accountWrapper({ status, user: null }),
      });
      await settle();
      expect(world.connectSync).not.toHaveBeenCalled();
      expect(result.current.status).toBeNull();
      unmount();
    }
  });
});

describe('useCloudSync: signed in', () => {
  it('waits for the progress to be read from the device, then starts for that person', async () => {
    let progress = progressStub({ loaded: false });
    const { rerender } = renderHook(() => useCloudSync(progress), { wrapper: accountWrapper(signedIn('ada')) });
    await settle();
    expect(world.connectSync).not.toHaveBeenCalled();

    progress = progressStub({ loaded: true });
    rerender();
    await settle();
    expect(world.connectSync).toHaveBeenCalledTimes(1);
    expect(connects[0]?.uid).toBe('ada');
  });

  it('hands the engine the live state and a way to merge into it', async () => {
    const live = { ...emptyProgressState(), xp: 5 };
    const merged = { ...emptyProgressState(), xp: 50 };
    const mergeRemote = vi.fn(() => merged);
    renderHook(() => useCloudSync(progressStub({ getState: () => live, mergeRemote })), {
      wrapper: accountWrapper(signedIn()),
    });
    await settle();

    const remote = emptyProgressState();
    expect(connects[0]?.local.get()).toBe(live);
    expect(connects[0]?.local.merge(remote)).toBe(merged);
    expect(mergeRemote).toHaveBeenCalledWith(remote);
  });

  it('shows the engine’s status, starting at syncing', async () => {
    const { result } = renderHook(() => useCloudSync(progressStub()), { wrapper: accountWrapper(signedIn()) });
    expect(result.current.status).toBe('syncing');
    await settle();

    for (const next of ['synced', 'offline', 'error', 'syncing'] as const) {
      act(() => connects[0]?.onStatus(next));
      expect(result.current.status).toBe(next);
    }
  });

  it('tells the engine about every change to the progress, and once when it has started', async () => {
    let progress = progressStub();
    const { rerender } = renderHook(() => useCloudSync(progress), { wrapper: accountWrapper(signedIn()) });
    await settle();
    expect(sessions[0]?.localChanged).toHaveBeenCalledTimes(1);

    progress = progressStub({ state: { ...emptyProgressState(), xp: 10 } });
    rerender();
    expect(sessions[0]?.localChanged).toHaveBeenCalledTimes(2);
  });

  it('stops syncing when the person signs out, and its status goes away', async () => {
    let account = signedIn();
    const wrapper = ({ children }: { children: ReactNode }) => {
      const Inner = accountWrapper(account);
      return <Inner>{children}</Inner>;
    };
    const { result, rerender } = renderHook(() => useCloudSync(progressStub()), { wrapper });
    await settle();
    expect(result.current.status).toBe('syncing');

    account = { status: 'signed-out', user: null } as unknown as ReturnType<typeof signedIn>;
    rerender();
    expect(sessions[0]?.stop).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBeNull();
  });

  it('starts over for a different person, and stops for the first', async () => {
    let account = signedIn('ada');
    const wrapper = ({ children }: { children: ReactNode }) => {
      const Inner = accountWrapper(account);
      return <Inner>{children}</Inner>;
    };
    const { rerender } = renderHook(() => useCloudSync(progressStub()), { wrapper });
    await settle();

    account = signedIn('grace');
    rerender();
    await settle();
    expect(sessions[0]?.stop).toHaveBeenCalledTimes(1);
    expect(connects.map((options) => options.uid)).toEqual(['ada', 'grace']);
  });

  it('stops on unmount, and a start that finishes after it is stopped at once', async () => {
    const first = renderHook(() => useCloudSync(progressStub()), { wrapper: accountWrapper(signedIn()) });
    await settle();
    first.unmount();
    expect(sessions[0]?.stop).toHaveBeenCalledTimes(1);

    // Unmounted while the engine was still starting.
    let finish: (session: FakeSession) => void = () => {};
    world.connectSync.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const second = renderHook(() => useCloudSync(progressStub()), { wrapper: accountWrapper(signedIn()) });
    await settle();
    second.unmount();
    const late = fakeSession();
    await act(async () => {
      finish(late);
      await Promise.resolve();
    });
    expect(late.stop).toHaveBeenCalledTimes(1);
    expect(late.localChanged).not.toHaveBeenCalled();
  });

  it('sends what is waiting when the app goes to the background', async () => {
    renderHook(() => useCloudSync(progressStub()), { wrapper: accountWrapper(signedIn()) });
    await settle();

    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    try {
      document.dispatchEvent(new Event('visibilitychange'));
    } finally {
      Reflect.deleteProperty(document, 'visibilityState');
    }
    expect(sessions[0]?.flush).toHaveBeenCalledTimes(1);
  });

  it('flush goes to the engine', async () => {
    const { result } = renderHook(() => useCloudSync(progressStub()), { wrapper: accountWrapper(signedIn()) });
    await settle();
    await result.current.flush();
    expect(sessions[0]?.flush).toHaveBeenCalledTimes(1);
  });
});

describe('useCloudSync: when it can not start', () => {
  it('says error, then tries again later', async () => {
    vi.useFakeTimers();
    world.connectSync.mockRejectedValueOnce(new Error('chunk failed'));
    const { result } = renderHook(() => useCloudSync(progressStub()), { wrapper: accountWrapper(signedIn()) });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.status).toBe('error');
    expect(world.connectSync).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(31_000);
    });
    expect(world.connectSync).toHaveBeenCalledTimes(2);
    expect(sessions).toHaveLength(1);
  });

  it('says offline if that is what the browser says', async () => {
    vi.useFakeTimers();
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    world.connectSync.mockRejectedValueOnce(new Error('Failed to fetch dynamically imported module'));
    const { result } = renderHook(() => useCloudSync(progressStub()), { wrapper: accountWrapper(signedIn()) });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.status).toBe('offline');
    online.mockRestore();
  });
});

describe('useCloudSync: deleting the account', () => {
  it('removes the saved progress first', async () => {
    renderHook(() => useCloudSync(progressStub()), { wrapper: accountWrapper(signedIn('ada')) });
    await settle();

    await runBeforeDeleteHooks(user('ada'));
    expect(world.deleteCloudProgress).toHaveBeenCalledWith('ada');
  });

  it('is registered even before the sync has started, so a delete never leaves the progress behind', async () => {
    renderHook(() => useCloudSync(progressStub({ loaded: false })), { wrapper: accountWrapper(signedIn('ada')) });
    await settle();
    expect(world.connectSync).not.toHaveBeenCalled();

    await runBeforeDeleteHooks(user('ada'));
    expect(world.deleteCloudProgress).toHaveBeenCalledWith('ada');
  });

  it('refuses to let the account go if the progress could not be removed', async () => {
    world.deleteCloudProgress.mockRejectedValueOnce(new Error('offline'));
    renderHook(() => useCloudSync(progressStub()), { wrapper: accountWrapper(signedIn('ada')) });
    await settle();

    await expect(runBeforeDeleteHooks(user('ada'))).rejects.toMatchObject({ code: 'cleanup-failed' });
  });

  it('leaves another person’s progress alone', async () => {
    renderHook(() => useCloudSync(progressStub()), { wrapper: accountWrapper(signedIn('ada')) });
    await settle();

    await runBeforeDeleteHooks(user('someone-else'));
    expect(world.deleteCloudProgress).not.toHaveBeenCalled();
  });

  it('is gone once the person has signed out', async () => {
    const { unmount } = renderHook(() => useCloudSync(progressStub()), { wrapper: accountWrapper(signedIn('ada')) });
    await settle();
    unmount();

    await runBeforeDeleteHooks(user('ada'));
    expect(world.deleteCloudProgress).not.toHaveBeenCalled();
  });
});
