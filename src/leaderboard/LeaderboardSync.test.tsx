import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { AccountContext } from '@/cloud/AccountProvider';
import { runBeforeDeleteHooks } from '@/cloud/deleteHooks';
import type { AccountApi, AccountUser } from '@/cloud/types';
import { NO_AWARD } from '@/app/testkit';
import type { AwardNotice } from '@/app/useProgress';
import { emptyProgressState, type ProgressState } from '@/progress';
import type { BoardEntry, EntryPatch } from './model';
import type { OwnEntry } from './service';
import { LeaderboardSync, REMOVE_TIMEOUT_MS, SETTLE_MS, SYNC_DELAY_MS } from './LeaderboardSync';

const world = vi.hoisted(() => ({
  watched: [] as string[],
  stopped: 0,
  push: null as null | ((own: OwnEntry) => void),
  writes: [] as { uid: string; patches: EntryPatch[] }[],
  removed: [] as string[],
  /** What `writePatches` and `removeEntry` do when called; tests swap them. */
  write: null as null | ((uid: string, patches: EntryPatch[]) => Promise<void>),
  remove: null as null | ((uid: string) => Promise<void>),
}));

vi.mock('./service', () => ({
  watchOwnEntry: vi.fn((uid: string, onChange: (own: OwnEntry) => void) => {
    world.watched.push(uid);
    world.push = onChange;
    return () => {
      world.stopped += 1;
    };
  }),
  writePatches: vi.fn((uid: string, patches: EntryPatch[]) => {
    world.writes.push({ uid, patches });
    return world.write === null ? Promise.resolve() : world.write(uid, patches);
  }),
  removeEntry: vi.fn((uid: string) => {
    world.removed.push(uid);
    return world.remove === null ? Promise.resolve() : world.remove(uid);
  }),
}));

// 2026-11-04 is a Wednesday of ISO week 45.
const NOW = new Date('2026-11-04T10:00:00Z');
const THIS_WEEK = '2026-W45';

const USER: AccountUser = { uid: 'u1', email: 'ada@example.com', displayName: 'Ada', providers: ['password'], emailVerified: true };
const actions = {
  signUpWithEmail: vi.fn(),
  signInWithEmail: vi.fn(),
  sendPasswordReset: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  deleteAccount: vi.fn(),
};
const signedIn = { status: 'signed-in', user: USER, ...actions } as AccountApi;
const signedOut = { status: 'signed-out', user: null, ...actions } as AccountApi;
const disabled = { status: 'disabled', user: null, ...actions } as AccountApi;

const row = (over: Partial<BoardEntry> = {}): BoardEntry => ({
  uid: 'u1',
  name: 'Ada',
  level: 2,
  xp: 100,
  weekKey: THIS_WEEK,
  weekXp: 40,
  instrument: 'guitar',
  ...over,
});

/** A progress handle whose awards the test fires by hand. */
function fakeProgress() {
  const listeners = new Set<(notice: AwardNotice) => void>();
  let id = 0;
  return {
    subscribeAwards: vi.fn((listener: (notice: AwardNotice) => void) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    }),
    award(xp: number) {
      id += 1;
      for (const listener of [...listeners]) {
        listener({ id, event: { type: 'tuned-all' }, award: { ...NO_AWARD, xp } });
      }
    },
    listeners,
  };
}

type Setup = { account?: AccountApi; xp?: number; instrument?: 'guitar' | 'ukulele' };

function mount(progress: ReturnType<typeof fakeProgress>, { account = signedIn, xp = 100, instrument = 'guitar' }: Setup = {}) {
  const view = (setup: Setup) => {
    const state: ProgressState = emptyProgressState();
    state.xp = setup.xp ?? xp;
    state.settings = { ...state.settings, instrument: setup.instrument ?? instrument };
    return (
      <AccountContext.Provider value={setup.account ?? account}>
        <LeaderboardSync progress={{ state, subscribeAwards: progress.subscribeAwards }} />
      </AccountContext.Provider>
    );
  };
  const rendered = render(view({}));
  return {
    ...rendered,
    update: (setup: Setup) => rendered.rerender(view({ account, xp, instrument, ...setup })),
  };
}

const own = (entry: BoardEntry | null, pending = false): OwnEntry => ({ entry, pending });
const show = (value: OwnEntry) => act(() => world.push?.(value));
const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.setSystemTime(NOW);
  world.watched = [];
  world.stopped = 0;
  world.push = null;
  world.writes = [];
  world.removed = [];
  world.write = null;
  world.remove = null;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('without an account on the board', () => {
  it('does nothing at all when there are no accounts or nobody is signed in', async () => {
    for (const account of [disabled, signedOut]) {
      const progress = fakeProgress();
      mount(progress, { account });
      progress.award(10);
      await wait(SYNC_DELAY_MS * 2);
      expect(progress.subscribeAwards).not.toHaveBeenCalled();
      cleanup();
    }
    expect(world.watched).toEqual([]);
    expect(world.writes).toEqual([]);
  });

  it('follows the signed-in player’s row, but sends nothing for a player who has not joined', async () => {
    const progress = fakeProgress();
    mount(progress);
    expect(world.watched).toEqual(['u1']);
    show(own(null));
    progress.award(10);
    await wait(SYNC_DELAY_MS * 2);
    expect(world.writes).toEqual([]);
  });

  it('does not count XP earned before joining towards the week they join in', async () => {
    const progress = fakeProgress();
    const view = mount(progress, { xp: 110 });
    show(own(null));
    progress.award(10);
    // They join straight away, within the delay: the row appears (seeded from their 110 XP).
    show(own(row({ xp: 110, weekXp: 0 })));
    view.update({ xp: 110 });
    await wait(SYNC_DELAY_MS);
    expect(world.writes).toEqual([]);
  });
});

describe('sending XP', () => {
  it('adds an award to this week with an increment, and brings the all-time XP up to the player’s total', async () => {
    const progress = fakeProgress();
    const view = mount(progress);
    show(own(row()));

    view.update({ xp: 110 });
    progress.award(10);
    expect(world.writes).toEqual([]); // not yet: it waits to see if more is coming
    await wait(SYNC_DELAY_MS);

    expect(world.writes).toHaveLength(1);
    expect(world.writes[0]?.uid).toBe('u1');
    expect(world.writes[0]?.patches).toEqual([
      { xpDelta: 10, level: 2, instrument: 'guitar', week: { kind: 'add', xp: 10 } },
    ]);
  });

  it('starts the new week when the row is from an earlier one', async () => {
    const progress = fakeProgress();
    const view = mount(progress);
    show(own(row({ weekKey: '2026-W44', weekXp: 900 })));
    view.update({ xp: 105 });
    progress.award(5);
    await wait(SYNC_DELAY_MS);
    expect(world.writes[0]?.patches[0]?.week).toEqual({ kind: 'start', weekKey: THIS_WEEK, xp: 5 });
  });

  it('sends the answers of a whole run as one write', async () => {
    const progress = fakeProgress();
    const view = mount(progress);
    show(own(row()));
    for (let answer = 1; answer <= 8; answer += 1) {
      view.update({ xp: 100 + answer * 3 });
      progress.award(3);
      await wait(400);
    }
    expect(world.writes).toEqual([]);
    await wait(SYNC_DELAY_MS);
    expect(world.writes).toHaveLength(1);
    expect(world.writes[0]?.patches).toEqual([
      { xpDelta: 24, level: 2, instrument: 'guitar', week: { kind: 'add', xp: 24 } },
    ]);
  });

  it('adds up two awards from one tap', async () => {
    const progress = fakeProgress();
    const view = mount(progress);
    show(own(row()));
    view.update({ xp: 160 });
    progress.award(10);
    progress.award(50);
    await wait(SYNC_DELAY_MS);
    expect(world.writes[0]?.patches).toEqual([
      { xpDelta: 60, level: 2, instrument: 'guitar', week: { kind: 'add', xp: 60 } },
    ]);
  });

  it('ignores an award with no XP in it (an unlock on its own)', async () => {
    const progress = fakeProgress();
    mount(progress);
    show(own(row()));
    progress.award(0);
    await wait(SYNC_DELAY_MS * 2);
    expect(world.writes).toEqual([]);
  });

  it('keeps XP earned before the row has arrived, and sends it when it does', async () => {
    const progress = fakeProgress();
    const view = mount(progress);
    view.update({ xp: 112 });
    progress.award(12);
    await wait(SYNC_DELAY_MS * 2);
    expect(world.writes).toEqual([]);

    show(own(row()));
    await wait(SYNC_DELAY_MS);
    expect(world.writes[0]?.patches).toEqual([
      { xpDelta: 12, level: 2, instrument: 'guitar', week: { kind: 'add', xp: 12 } },
    ]);
  });

  it('sends at once when the app goes to the background', async () => {
    const progress = fakeProgress();
    const view = mount(progress);
    show(own(row()));
    view.update({ xp: 108 });
    progress.award(8);
    expect(world.writes).toEqual([]);

    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await wait(0);
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });

    expect(world.writes).toHaveLength(1);
    // And the timer that was waiting does not send it a second time.
    await wait(SYNC_DELAY_MS * 2);
    expect(world.writes).toHaveLength(1);
  });

  it('catches the row up when the player’s own total is ahead of it, in steps the rules accept', async () => {
    const progress = fakeProgress();
    mount(progress, { xp: 4900 });
    show(own(row({ xp: 100 })));
    await wait(SYNC_DELAY_MS);
    expect(world.writes).toHaveLength(1);
    expect(world.writes[0]?.patches.map((patch) => patch.xpDelta)).toEqual([2000, 2000, 800]);
    expect(world.writes[0]?.patches.every((patch) => patch.week.kind === 'none')).toBe(true);
  });

  it('writes nothing when the row is already current', async () => {
    const progress = fakeProgress();
    mount(progress, { xp: 100 });
    show(own(row({ xp: 100 })));
    await wait(SYNC_DELAY_MS * 2);
    expect(world.writes).toEqual([]);
  });

  it('carries the instrument being learned', async () => {
    const progress = fakeProgress();
    const view = mount(progress, { instrument: 'ukulele' });
    show(own(row()));
    view.update({ xp: 107, instrument: 'ukulele' });
    progress.award(7);
    await wait(SYNC_DELAY_MS);
    expect(world.writes[0]?.patches[0]?.instrument).toBe('ukulele');
  });

  it('does not hold the XP back when the phone is offline and a write never gets its answer', async () => {
    world.write = () => new Promise<void>(() => {}); // the server never answers
    const progress = fakeProgress();
    const view = mount(progress);
    show(own(row()));

    view.update({ xp: 110 });
    progress.award(10);
    await wait(SYNC_DELAY_MS + SETTLE_MS);
    expect(world.writes).toHaveLength(1);

    view.update({ xp: 130 });
    progress.award(20);
    await wait(SYNC_DELAY_MS + SETTLE_MS);
    expect(world.writes).toHaveLength(2);
  });

  it('survives the server refusing a write', async () => {
    world.write = () => Promise.reject(new Error('permission-denied'));
    const progress = fakeProgress();
    const view = mount(progress);
    show(own(row()));
    view.update({ xp: 110 });
    progress.award(10);
    await wait(SYNC_DELAY_MS + SETTLE_MS);
    view.update({ xp: 120 });
    progress.award(10);
    await wait(SYNC_DELAY_MS + SETTLE_MS);
    expect(world.writes).toHaveLength(2);
  });

  it('stops listening when the player signs out, and forgets what was gathered', async () => {
    const progress = fakeProgress();
    const view = mount(progress);
    show(own(row()));
    view.update({ xp: 110 });
    progress.award(10);
    view.update({ account: signedOut });
    await wait(SYNC_DELAY_MS * 2);
    expect(world.writes).toEqual([]);
    expect(world.stopped).toBeGreaterThan(0);
    expect(progress.listeners.size).toBe(0);
  });
});

describe('deleting the account', () => {
  it('takes the player off the board first', async () => {
    mount(fakeProgress());
    show(own(row()));
    await runBeforeDeleteHooks(USER);
    expect(world.removed).toEqual(['u1']);
  });

  it('removes the row even for a player the app has no row for, which is harmless', async () => {
    mount(fakeProgress());
    show(own(null));
    await runBeforeDeleteHooks(USER);
    expect(world.removed).toEqual(['u1']);
  });

  it('keeps the account when the row could not be removed', async () => {
    world.remove = () => Promise.reject(new Error('unavailable'));
    mount(fakeProgress());
    await expect(runBeforeDeleteHooks(USER)).rejects.toMatchObject({ code: 'cleanup-failed' });
  });

  it('keeps the account rather than wait forever for a phone that is offline', async () => {
    world.remove = () => new Promise<void>(() => {});
    mount(fakeProgress());
    const attempt = runBeforeDeleteHooks(USER);
    const outcome = expect(attempt).rejects.toMatchObject({ code: 'cleanup-failed' });
    await wait(REMOVE_TIMEOUT_MS);
    await outcome;
  });

  it('is no longer asked once the player is signed out', async () => {
    const view = mount(fakeProgress());
    view.update({ account: signedOut });
    await runBeforeDeleteHooks(USER);
    expect(world.removed).toEqual([]);
  });
});
