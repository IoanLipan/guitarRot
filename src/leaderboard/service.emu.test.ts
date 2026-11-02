/**
 * The leaderboard service against the Auth and Firestore emulators
 * (`npm run test:cloud`): real sign-ins, the real rules, the real queries.
 * Several players take turns on the one signed-in slot the app's Firebase has.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { signOut, signUpWithEmail } from '@/cloud/auth';
import { EMULATOR_PROJECT_ID, FIRESTORE_EMULATOR } from '@/cloud/config';
import { uniqueEmail, waitForAccount } from '@/cloud/emulatorKit';
import { getFirestoreDb, loadFirestoreSdk } from '@/cloud/firebase';
import { planUpdates, type BoardEntry } from './model';
import {
  fetchBoard,
  fetchRank,
  joinBoard,
  OfflineError,
  removeEntry,
  renameEntry,
  watchOwnEntry,
  writePatches,
  type OwnEntry,
} from './service';
import { isoWeekKey } from './week';

const PASSWORD = 'correct horse battery';
const THIS_WEEK = isoWeekKey(new Date());
/** A week that is certainly not this one. */
const LAST_WEEK = isoWeekKey(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

type Player = { uid: string; name: string };

/** Signs a new account up (which also signs it in) and gives its uid. */
async function newPlayer(name: string): Promise<Player> {
  await signUpWithEmail({ email: uniqueEmail(name.toLowerCase().replace(/\W/g, '')), password: PASSWORD, displayName: name });
  const state = await waitForAccount((s) => s.status === 'signed-in' && s.user.displayName === name);
  if (state.user === null) throw new Error('not signed in');
  return { uid: state.user.uid, name };
}

/** Joins, then earns `week` XP this week on top of the `xp` they joined with. */
async function joinAndPlay(player: Player, xp: number, week: number) {
  await joinBoard(player.uid, { name: player.name, xp, instrument: 'guitar' });
  if (week > 0) {
    const own = await ownEntry(player.uid);
    if (own === null) throw new Error('not on the board');
    await writePatches(player.uid, planUpdates(own, { weekKey: THIS_WEEK, earned: week, localXp: xp + week, instrument: 'guitar' }));
  }
}

function ownEntry(uid: string, until: (own: OwnEntry) => boolean = (own) => !own.pending): Promise<BoardEntry | null> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The row never arrived.')), 10_000);
    const stop = watchOwnEntry(
      uid,
      (own) => {
        if (!until(own)) return;
        clearTimeout(timer);
        queueMicrotask(() => stop());
        resolve(own.entry);
      },
      reject,
    );
  });
}

async function clearBoard() {
  const url = `http://${FIRESTORE_EMULATOR.host}:${FIRESTORE_EMULATOR.port}/emulator/v1/projects/${EMULATOR_PROJECT_ID}/databases/(default)/documents`;
  await fetch(url, { method: 'DELETE' });
}

beforeAll(clearBoard);
afterEach(async () => {
  await signOut();
});

describe('ranks and lists, with several players', () => {
  it('orders both lists, counts every rank, and leaves last week’s players out of the weekly list', async () => {
    const ada = await newPlayer('Ada');
    await joinAndPlay(ada, 500, 50);
    await signOut();
    const bob = await newPlayer('Bob');
    await joinAndPlay(bob, 900, 20);
    await signOut();
    const cyd = await newPlayer('Cyd');
    await joinAndPlay(cyd, 100, 80);
    await signOut();

    // Dee was on the board last week and has not played since: a row from an earlier week.
    const dee = await newPlayer('Dee');
    {
      const db = await getFirestoreDb();
      const sdk = await loadFirestoreSdk();
      await sdk.setDoc(sdk.doc(db, 'leaderboard', dee.uid), {
        name: 'Dee',
        level: 3,
        xp: 300,
        weekKey: LAST_WEEK,
        weekXp: 999,
        instrument: 'ukulele',
        updatedAt: sdk.serverTimestamp(),
      });
    }

    // Everybody on the board can look at it.
    const allTime = await fetchBoard('all', THIS_WEEK);
    expect(allTime.map((row) => [row.name, row.xp])).toEqual([
      ['Bob', 920],
      ['Ada', 550],
      ['Dee', 300],
      ['Cyd', 180],
    ]);
    expect(allTime[0]).toMatchObject({ uid: expect.any(String), level: expect.any(Number), instrument: 'guitar' });

    const week = await fetchBoard('week', THIS_WEEK);
    expect(week.map((row) => [row.name, row.weekXp])).toEqual([
      ['Cyd', 80],
      ['Ada', 50],
      ['Bob', 20],
    ]);
    expect(week.map((row) => row.name)).not.toContain('Dee');

    // Rank = players with more XP + 1.
    expect(await fetchRank('all', THIS_WEEK, 920)).toBe(1);
    expect(await fetchRank('all', THIS_WEEK, 550)).toBe(2);
    expect(await fetchRank('all', THIS_WEEK, 180)).toBe(4);
    expect(await fetchRank('all', THIS_WEEK, 1)).toBe(5);
    expect(await fetchRank('week', THIS_WEEK, 80)).toBe(1);
    expect(await fetchRank('week', THIS_WEEK, 50)).toBe(2);
    expect(await fetchRank('week', THIS_WEEK, 20)).toBe(3);
    // Last week's 999 does not count for this week's rank.
    expect(await fetchRank('week', THIS_WEEK, 5)).toBe(4);
    // And last week's board still ranks last week's players.
    expect(await fetchRank('week', LAST_WEEK, 100)).toBe(2);
    expect((await fetchBoard('week', LAST_WEEK)).map((row) => row.name)).toEqual(['Dee']);
  });

  it('keeps the list to 25', async () => {
    const db = await getFirestoreDb();
    const sdk = await loadFirestoreSdk();
    // 30 more rows made through the rules, as 30 players would: each is its own signed-in uid.
    for (let i = 0; i < 30; i += 1) {
      const player = await newPlayer(`Filler ${i}`);
      await sdk.setDoc(sdk.doc(db, 'leaderboard', player.uid), {
        name: player.name,
        level: 2,
        xp: 1000 + i,
        weekKey: THIS_WEEK,
        weekXp: 1 + i,
        instrument: 'guitar',
        updatedAt: sdk.serverTimestamp(),
      });
      await signOut();
    }
    await newPlayer('Reader');
    expect(await fetchBoard('all', THIS_WEEK)).toHaveLength(25);
    expect(await fetchBoard('week', THIS_WEEK)).toHaveLength(25);
    // Ranks past the 25th still come from the count.
    // Four players from the test above and 30 here have more than 100 XP.
    expect(await fetchRank('all', THIS_WEEK, 100)).toBe(35);
  });
});

describe('one player’s own row', () => {
  it('follows joins, plays, renames and leaving, live', async () => {
    const me = await newPlayer('Me Myself');
    expect(await ownEntry(me.uid, () => true)).toBeNull();

    await joinBoard(me.uid, { name: ' Me   Myself ', xp: 340, instrument: 'ukulele' });
    expect(await ownEntry(me.uid)).toMatchObject({ name: 'Me Myself', xp: 340, level: 3, weekXp: 0, weekKey: THIS_WEEK, instrument: 'ukulele' });

    // Two awards in a row add up, and the all-time XP follows the player's own total.
    const first = (await ownEntry(me.uid)) as BoardEntry;
    await writePatches(me.uid, planUpdates(first, { weekKey: THIS_WEEK, earned: 10, localXp: 350, instrument: 'ukulele' }));
    const second = (await ownEntry(me.uid)) as BoardEntry;
    await writePatches(me.uid, planUpdates(second, { weekKey: THIS_WEEK, earned: 15, localXp: 365, instrument: 'ukulele' }));
    expect(await ownEntry(me.uid)).toMatchObject({ xp: 365, weekXp: 25 });

    await renameEntry(me.uid, 'Myself');
    expect(await ownEntry(me.uid)).toMatchObject({ name: 'Myself', xp: 365, weekXp: 25 });

    await removeEntry(me.uid);
    expect(await ownEntry(me.uid)).toBeNull();
    // Leaving twice is fine.
    await removeEntry(me.uid);
  });

  it('adds up what two phones earn at the same moment', async () => {
    const me = await newPlayer('Two Phones');
    await joinBoard(me.uid, { name: 'Two Phones', xp: 0, instrument: 'guitar' });
    const row = (await ownEntry(me.uid)) as BoardEntry;
    // Both phones saw the same row and each earned something; their writes arrive one after the other.
    await Promise.all([
      writePatches(me.uid, planUpdates(row, { weekKey: THIS_WEEK, earned: 30, localXp: 30, instrument: 'guitar' })),
      writePatches(me.uid, planUpdates(row, { weekKey: THIS_WEEK, earned: 12, localXp: 12, instrument: 'guitar' })),
    ]);
    const merged = await ownEntry(me.uid);
    expect(merged?.weekXp).toBe(42);
    // The all-time XP is raised by each phone's difference, so neither is refused for being lower.
    expect(merged?.xp).toBe(42);
  });

  it('starts a new week when the row is from an earlier one', async () => {
    const me = await newPlayer('Back Again');
    const db = await getFirestoreDb();
    const sdk = await loadFirestoreSdk();
    await sdk.setDoc(sdk.doc(db, 'leaderboard', me.uid), {
      name: 'Back Again',
      level: 4,
      xp: 700,
      weekKey: LAST_WEEK,
      weekXp: 650,
      instrument: 'guitar',
      updatedAt: sdk.serverTimestamp(),
    });
    const row = (await ownEntry(me.uid)) as BoardEntry;
    await writePatches(me.uid, planUpdates(row, { weekKey: THIS_WEEK, earned: 5, localXp: 705, instrument: 'guitar' }));
    expect(await ownEntry(me.uid)).toMatchObject({ weekKey: THIS_WEEK, weekXp: 5, xp: 705 });
  });

  it('catches a long way up in steps the rules accept', async () => {
    const me = await newPlayer('Far Behind');
    await joinBoard(me.uid, { name: 'Far Behind', xp: 100, instrument: 'guitar' });
    const row = (await ownEntry(me.uid)) as BoardEntry;
    const patches = planUpdates(row, { weekKey: THIS_WEEK, earned: 0, localXp: 9100, instrument: 'guitar' });
    expect(patches).toHaveLength(5);
    await writePatches(me.uid, patches);
    expect(await ownEntry(me.uid)).toMatchObject({ xp: 9100, level: 14 });
  });
});

describe('what the rules say to the service', () => {
  it('stops one player writing or removing another’s row', async () => {
    const ada = await newPlayer('Ada Owner');
    await joinBoard(ada.uid, { name: 'Ada Owner', xp: 10, instrument: 'guitar' });
    await signOut();

    await newPlayer('Mallory');
    await expect(removeEntry(ada.uid)).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(renameEntry(ada.uid, 'Hacked')).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(joinBoard(ada.uid, { name: 'Hacked', xp: 99999, instrument: 'guitar' })).rejects.toMatchObject({ code: 'permission-denied' });
    // Mallory can still read it, and it is untouched.
    expect(await ownEntry(ada.uid, () => true)).toMatchObject({ name: 'Ada Owner', xp: 10 });
  });

  it('refuses a name the board does not allow, and an anonymous read', async () => {
    const me = await newPlayer('Careful');
    await expect(joinBoard(me.uid, { name: 'me@example.com', xp: 0, instrument: 'guitar' })).rejects.toMatchObject({ code: 'permission-denied' });
    await signOut();
    await vi.waitFor(async () => expect(await fetchBoard('all', THIS_WEEK).catch((e: { code: string }) => e.code)).toBe('permission-denied'));
    await expect(fetchBoard('all', THIS_WEEK)).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(fetchRank('all', THIS_WEEK, 0)).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('knows an answer from the saved copy is not a leaderboard', () => {
    expect(new OfflineError().name).toBe('OfflineError');
  });
});
