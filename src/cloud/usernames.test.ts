import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountError } from './types';

/**
 * What ./usernames makes of Firestore's answers, against a stand-in SDK: the shape checks before any
 * network, the plain words for a failure, and what the account deletion does when the rules aren't
 * there yet. The real rules and the real race are in usernames.rules.emu.test.ts and
 * usernames.emu.test.ts (`npm run test:cloud`).
 */
const fake = vi.hoisted(() => ({
  getDocFromServer: vi.fn(),
  runTransaction: vi.fn(),
  onSnapshot: vi.fn(),
}));

vi.mock('./firebase', () => ({
  getFirestoreDb: async () => ({}),
  loadFirestoreSdk: async () => ({
    doc: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
    serverTimestamp: () => 'now',
    getDocFromServer: fake.getDocFromServer,
    runTransaction: fake.runTransaction,
    onSnapshot: fake.onSnapshot,
  }),
}));

const { checkUsername, claimUsername, freeUsernames, removeUsername, watchProfile } = await import('./usernames');

const snapshot = (data: Record<string, unknown> | null) => ({ exists: () => data !== null, data: () => data });
const firestoreError = (code: string) => Object.assign(new Error(`Firestore: ${code}`), { code });

beforeEach(() => {
  for (const fn of Object.values(fake)) fn.mockReset();
});

async function failure(action: Promise<unknown>): Promise<AccountError> {
  try {
    await action;
  } catch (error) {
    expect(error).toBeInstanceOf(AccountError);
    return error as AccountError;
  }
  throw new Error('Expected the action to fail.');
}

describe('checkUsername', () => {
  it('says available for a handle nobody holds, asking the server for it in lowercase', async () => {
    fake.getDocFromServer.mockResolvedValue(snapshot(null));
    expect(await checkUsername('  Ada_L ')).toBe('available');
    expect(fake.getDocFromServer).toHaveBeenCalledWith({ path: 'usernames/ada_l' });
  });

  it('says taken for somebody else’s, and yours for the person’s own', async () => {
    fake.getDocFromServer.mockResolvedValue(snapshot({ uid: 'u1' }));
    expect(await checkUsername('ada')).toBe('taken');
    expect(await checkUsername('ada', 'u2')).toBe('taken');
    expect(await checkUsername('ada', 'u1')).toBe('yours');
  });

  it('says there is no connection when the server can not be reached', async () => {
    fake.getDocFromServer.mockRejectedValue(firestoreError('unavailable'));
    expect((await failure(checkUsername('ada'))).code).toBe('auth/network-request-failed');
  });
});

describe('freeUsernames', () => {
  it('keeps the candidates the server did not find taken, and skips one it could not ask about', async () => {
    let call = 0;
    fake.getDocFromServer.mockImplementation(async () => {
      call += 1;
      if (call === 1) return snapshot({ uid: 'other' });
      if (call === 2) throw firestoreError('unavailable');
      return snapshot(null);
    });
    const free = await freeUsernames('ada', undefined, 3);
    expect(free.length).toBeGreaterThan(0);
    expect(free.length).toBeLessThanOrEqual(3);
    for (const name of free) expect(name.startsWith('ada')).toBe(true);
  });
});

describe('claimUsername', () => {
  it('refuses a handle that breaks the shape without asking Firestore anything', async () => {
    expect(await failure(claimUsername('u1', 'a b'))).toMatchObject({ code: 'username-invalid', field: 'username' });
    expect(fake.runTransaction).not.toHaveBeenCalled();
  });

  it('gives back the handle it claimed, in lowercase', async () => {
    fake.runTransaction.mockResolvedValue(undefined);
    expect(await claimUsername('u1', ' Ada_L ')).toBe('ada_l');
  });

  it('says taken when the transaction found somebody else’s claim', async () => {
    fake.runTransaction.mockRejectedValue(new AccountError('username-taken', 'That username is taken.', 'username'));
    expect(await failure(claimUsername('u1', 'ada'))).toMatchObject({ code: 'username-taken', field: 'username' });
  });

  it('says taken when the rules refused it and the handle really is somebody else’s', async () => {
    fake.runTransaction.mockRejectedValue(firestoreError('permission-denied'));
    fake.getDocFromServer.mockResolvedValue(snapshot({ uid: 'other' }));
    expect((await failure(claimUsername('u1', 'ada'))).code).toBe('username-taken');
  });

  it('says it could not save it, not that it is taken, when the rules refused it for another reason', async () => {
    fake.runTransaction.mockRejectedValue(firestoreError('permission-denied'));
    fake.getDocFromServer.mockResolvedValue(snapshot(null));
    const error = await failure(claimUsername('u1', 'ada'));
    expect(error.code).toBe('username-failed');
    expect(error.message).toContain('couldn’t save your username');
  });

  it('says there is no connection when Firestore could not be reached', async () => {
    fake.runTransaction.mockRejectedValue(firestoreError('unavailable'));
    expect((await failure(claimUsername('u1', 'ada'))).code).toBe('auth/network-request-failed');
  });

  it('gives up with the same words when the server takes too long', async () => {
    vi.useFakeTimers();
    try {
      fake.runTransaction.mockReturnValue(new Promise(() => undefined));
      const pending = failure(claimUsername('u1', 'ada'));
      await vi.advanceTimersByTimeAsync(13_000);
      expect((await pending).code).toBe('auth/network-request-failed');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('removeUsername', () => {
  it('removes the profile and the claim in one transaction', async () => {
    const deleted: string[] = [];
    const transaction = {
      get: async (ref: { path: string }) =>
        ref.path === 'profiles/u1' ? snapshot({ username: 'ada' }) : snapshot({ uid: 'u1' }),
      delete: (ref: { path: string }) => void deleted.push(ref.path),
    };
    fake.runTransaction.mockImplementation(async (_db: unknown, body: (t: typeof transaction) => Promise<void>) => body(transaction));

    await removeUsername('u1');
    expect(deleted.sort()).toEqual(['profiles/u1', 'usernames/ada']);
  });

  it('leaves a claim that is not the person’s alone', async () => {
    const deleted: string[] = [];
    const transaction = {
      get: async (ref: { path: string }) =>
        ref.path === 'profiles/u1' ? snapshot({ username: 'ada' }) : snapshot({ uid: 'somebody-else' }),
      delete: (ref: { path: string }) => void deleted.push(ref.path),
    };
    fake.runTransaction.mockImplementation(async (_db: unknown, body: (t: typeof transaction) => Promise<void>) => body(transaction));
    await removeUsername('u1');
    expect(deleted).toEqual(['profiles/u1']);
  });

  it('does nothing, and does not fail, for a person who never picked one', async () => {
    const deleted: string[] = [];
    const transaction = { get: async () => snapshot(null), delete: (ref: { path: string }) => void deleted.push(ref.path) };
    fake.runTransaction.mockImplementation(async (_db: unknown, body: (t: typeof transaction) => Promise<void>) => body(transaction));
    await expect(removeUsername('u1')).resolves.toBeUndefined();
    expect(deleted).toEqual([]);
  });

  it('does not block deleting an account on a project whose rules have no profiles block yet', async () => {
    fake.runTransaction.mockRejectedValue(firestoreError('permission-denied'));
    await expect(removeUsername('u1')).resolves.toBeUndefined();
  });

  it('fails, so the account is kept, when it could not be done for any other reason', async () => {
    fake.runTransaction.mockRejectedValue(firestoreError('unavailable'));
    await expect(removeUsername('u1')).rejects.toMatchObject({ code: 'unavailable' });
  });
});

describe('watchProfile', () => {
  type Listener = (snap: { exists: () => boolean; data: () => unknown; metadata: { fromCache: boolean } }) => void;

  function watch() {
    const states: unknown[] = [];
    let push: Listener = () => undefined;
    let fail: () => void = () => undefined;
    const stop = vi.fn();
    fake.onSnapshot.mockImplementation((_ref: unknown, _options: unknown, next: Listener, error: () => void) => {
      push = next;
      fail = error;
      return stop;
    });
    const unwatch = watchProfile('u1', (state) => states.push(state));
    return { states, push: (...args: Parameters<Listener>) => push(...args), fail: () => fail(), stop, unwatch };
  }

  const snap = (data: Record<string, unknown> | null, fromCache: boolean) => ({ ...snapshot(data), metadata: { fromCache } });

  it('says ready with the username when there is a profile', async () => {
    const view = watch();
    await vi.waitFor(() => expect(fake.onSnapshot).toHaveBeenCalled());
    view.push(snap({ username: 'ada_l' }, true));
    expect(view.states).toEqual([{ status: 'ready', username: 'ada_l' }]);
  });

  it('says ready with no username only once the server has said there is none', async () => {
    const view = watch();
    await vi.waitFor(() => expect(fake.onSnapshot).toHaveBeenCalled());
    // An empty saved copy proves nothing: the phone may simply not have fetched it yet.
    view.push(snap(null, true));
    expect(view.states).toEqual([{ status: 'unknown', username: null }]);
    view.push(snap(null, false));
    expect(view.states.at(-1)).toEqual({ status: 'ready', username: null });
  });

  it('says unknown when the profile can not be read, and stops listening on request', async () => {
    const view = watch();
    await vi.waitFor(() => expect(fake.onSnapshot).toHaveBeenCalled());
    view.fail();
    expect(view.states).toEqual([{ status: 'unknown', username: null }]);
    view.unwatch();
    expect(view.stop).toHaveBeenCalledTimes(1);
  });
});
