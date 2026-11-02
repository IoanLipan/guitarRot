/**
 * The leaderboard block of firestore.rules, tried against the Firestore
 * emulator with @firebase/rules-unit-testing (`npm run test:cloud`). Players
 * here are rules-test contexts with a made-up uid, not Auth emulator users:
 * what is under test is the rules, not sign-in.
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { EMULATOR_PROJECT_ID, FIRESTORE_EMULATOR } from '@/cloud/config';

type Row = Record<string, unknown>;

let env: RulesTestEnvironment;

const now = () => firebase.firestore.FieldValue.serverTimestamp();

/** A row the rules accept; each test changes the one thing it is about. */
function row(over: Row = {}): Row {
  return { name: 'Ada', level: 1, xp: 0, weekKey: '2026-W44', weekXp: 0, instrument: 'guitar', updatedAt: now(), ...over };
}

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const anonymous = () => env.unauthenticatedContext().firestore();
const entry = (db: firebase.firestore.Firestore, uid: string) => db.doc(`leaderboard/${uid}`);

/** Puts a row on the board without the rules looking at it. */
async function seed(uid: string, over: Row = {}) {
  await env.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(`leaderboard/${uid}`).set(row(over));
  });
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: EMULATOR_PROJECT_ID,
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), ...FIRESTORE_EMULATOR },
  });
});
afterAll(async () => {
  await env.clearFirestore();
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
});

describe('reading the board', () => {
  it('lets a signed-in player read anybody’s row and list the board', async () => {
    await seed('bob', { name: 'Bob' });
    const alice = as('alice');
    await assertSucceeds(entry(alice, 'bob').get());
    await assertSucceeds(alice.collection('leaderboard').orderBy('xp', 'desc').limit(25).get());
  });

  it('refuses anybody who is not signed in', async () => {
    await seed('bob');
    const stranger = anonymous();
    await assertFails(entry(stranger, 'bob').get());
    await assertFails(stranger.collection('leaderboard').limit(25).get());
  });
});

describe('joining', () => {
  it('lets a player create their own row', async () => {
    await assertSucceeds(entry(as('alice'), 'alice').set(row()));
  });

  it('lets a player join with all the XP they already have, but not with a week’s worth', async () => {
    await assertSucceeds(entry(as('alice'), 'alice').set(row({ xp: 48_250, level: 31 })));
    await assertFails(entry(as('bob'), 'bob').set(row({ weekXp: 2001 })));
    await assertSucceeds(entry(as('bob'), 'bob').set(row({ weekXp: 2000 })));
  });

  it('refuses a row for somebody else, and any write when not signed in', async () => {
    await assertFails(entry(as('mallory'), 'alice').set(row()));
    await assertFails(entry(anonymous(), 'alice').set(row()));
  });

  it('refuses a row with extra or missing fields', async () => {
    await assertFails(entry(as('alice'), 'alice').set(row({ email: 'alice@example.com' })));
    await assertFails(entry(as('alice'), 'alice').set(row({ admin: true })));
    const { weekXp: _weekXp, ...missing } = row();
    await assertFails(entry(as('alice'), 'alice').set(missing));
  });

  it('refuses a stored time that is not the server’s', async () => {
    await assertFails(entry(as('alice'), 'alice').set(row({ updatedAt: new Date('2030-01-01') })));
    await assertFails(entry(as('alice'), 'alice').set(row({ updatedAt: null })));
  });
});

describe('names', () => {
  const ok = ['Ada', 'Ada Lovelace', 'ioan.lipan', 'player_42', 'a-b', 'Ștefan', 'José', '李小龙龙', 'a'.repeat(20)];
  const bad = [
    '',
    'ab',
    'a'.repeat(21),
    ' Ada',
    'Ada ',
    'ada@example.com',
    'Ada!',
    'a<b>c',
    'ada/lovelace',
    'ada😀x',
    'ada#1',
  ];

  it.each(ok)('accepts %j', async (name) => {
    await assertSucceeds(entry(as('alice'), 'alice').set(row({ name })));
  });

  it.each(bad)('refuses %j', async (name) => {
    await assertFails(entry(as('alice'), 'alice').set(row({ name })));
  });

  it('refuses a name that is not text', async () => {
    await assertFails(entry(as('alice'), 'alice').set(row({ name: 12345 })));
    await assertFails(entry(as('alice'), 'alice').set(row({ name: ['Ada'] })));
  });
});

describe('the other fields', () => {
  it('wants whole numbers in range', async () => {
    const alice = as('alice');
    await assertFails(entry(alice, 'alice').set(row({ level: 0 })));
    await assertFails(entry(alice, 'alice').set(row({ level: 1000 })));
    await assertFails(entry(alice, 'alice').set(row({ level: 1.5 })));
    await assertFails(entry(alice, 'alice').set(row({ xp: -1 })));
    await assertFails(entry(alice, 'alice').set(row({ xp: 10.5 })));
    await assertFails(entry(alice, 'alice').set(row({ xp: 10_000_001 })));
    await assertFails(entry(alice, 'alice').set(row({ weekXp: -1 })));
    await assertFails(entry(alice, 'alice').set(row({ xp: '100' })));
    await assertSucceeds(entry(alice, 'alice').set(row({ level: 999, xp: 10_000_000 })));
  });

  it('wants an ISO week key', async () => {
    const alice = as('alice');
    for (const weekKey of ['2026-W00', '2026-W54', '2026-44', '26-W44', '2026-W4', 'this week', 202644]) {
      await assertFails(entry(alice, 'alice').set(row({ weekKey })));
    }
    await assertSucceeds(entry(alice, 'alice').set(row({ weekKey: '2026-W53' })));
  });

  it('wants one of the two instruments', async () => {
    const alice = as('alice');
    await assertFails(entry(alice, 'alice').set(row({ instrument: 'piano' })));
    await assertFails(entry(alice, 'alice').set(row({ instrument: 'GUITAR' })));
    await assertSucceeds(entry(alice, 'alice').set(row({ instrument: 'ukulele' })));
  });
});

describe('playing', () => {
  it('lets XP grow by up to 2000 a write, and no more', async () => {
    await seed('alice', { xp: 100, weekXp: 100 });
    const alice = as('alice');
    await assertSucceeds(entry(alice, 'alice').update({ xp: 2100, level: 6, weekXp: 2100, updatedAt: now() }));
    await assertFails(entry(alice, 'alice').update({ xp: 4101, level: 9, updatedAt: now() }));
    await assertSucceeds(entry(alice, 'alice').update({ xp: 4100, level: 9, updatedAt: now() }));
  });

  it('never lets all-time XP go down', async () => {
    await seed('alice', { xp: 500, level: 3 });
    await assertFails(entry(as('alice'), 'alice').update({ xp: 499, updatedAt: now() }));
    await assertFails(entry(as('alice'), 'alice').update({ xp: 0, level: 1, updatedAt: now() }));
    await assertSucceeds(entry(as('alice'), 'alice').update({ xp: 500, updatedAt: now() }));
  });

  it('adds to the week with an increment, within the same limits', async () => {
    await seed('alice', { xp: 500, weekXp: 40 });
    const alice = as('alice');
    const plus = (n: number) => firebase.firestore.FieldValue.increment(n);
    await assertSucceeds(entry(alice, 'alice').update({ xp: plus(25), weekXp: plus(25), updatedAt: now() }));
    await assertFails(entry(alice, 'alice').update({ xp: plus(2001), weekXp: plus(2001), updatedAt: now() }));
    await assertFails(entry(alice, 'alice').update({ weekXp: plus(-10), updatedAt: now() }));
  });

  it('never lets this week’s XP go down within the week', async () => {
    await seed('alice', { weekXp: 300 });
    await assertFails(entry(as('alice'), 'alice').update({ weekXp: 299, updatedAt: now() }));
  });

  it('starts a later week from a small number, and never goes back to an earlier week', async () => {
    await seed('alice', { weekKey: '2026-W43', weekXp: 900, xp: 900 });
    const alice = as('alice');
    await assertFails(entry(alice, 'alice').update({ weekKey: '2026-W44', weekXp: 2001, updatedAt: now() }));
    await assertFails(entry(alice, 'alice').update({ weekKey: '2026-W42', weekXp: 5, updatedAt: now() }));
    await assertSucceeds(entry(alice, 'alice').update({ weekKey: '2026-W44', weekXp: 35, xp: 935, updatedAt: now() }));
    // The year turning over is a later week, too.
    await assertSucceeds(entry(alice, 'alice').update({ weekKey: '2027-W01', weekXp: 10, updatedAt: now() }));
  });

  it('lets a player rename without touching anything else, and checks the new name', async () => {
    await seed('alice', { xp: 700, weekXp: 70 });
    const alice = as('alice');
    await assertSucceeds(entry(alice, 'alice').update({ name: 'Ada L', updatedAt: now() }));
    await assertFails(entry(alice, 'alice').update({ name: 'x', updatedAt: now() }));
    await assertFails(entry(alice, 'alice').update({ name: 'me@example.com', updatedAt: now() }));
  });

  it('refuses a change that adds a field or does not stamp the time', async () => {
    await seed('alice');
    const alice = as('alice');
    await assertFails(entry(alice, 'alice').update({ email: 'alice@example.com', updatedAt: now() }));
    await assertFails(entry(alice, 'alice').update({ xp: 10 }));
  });

  it('refuses everybody but the owner', async () => {
    await seed('alice', { xp: 10 });
    await assertFails(entry(as('mallory'), 'alice').update({ xp: 2010, updatedAt: now() }));
    await assertFails(entry(as('mallory'), 'alice').update({ name: 'Mallory', updatedAt: now() }));
    await assertFails(entry(anonymous(), 'alice').update({ name: 'Mallory', updatedAt: now() }));
  });
});

describe('leaving', () => {
  it('lets a player delete their own row, and nobody else’s', async () => {
    await seed('alice');
    await seed('bob', { name: 'Bob' });
    await assertFails(entry(as('alice'), 'bob').delete());
    await assertFails(entry(anonymous(), 'alice').delete());
    await assertSucceeds(entry(as('alice'), 'alice').delete());
    // Deleting a row that is not there is not an error either.
    await assertSucceeds(entry(as('carol'), 'carol').delete());
  });
});

describe('the rest of the database', () => {
  it('stays closed: the leaderboard block opens nothing else', async () => {
    await assertFails(as('alice').doc('somewhere/else').set({ a: 1 }));
    await assertFails(as('alice').doc('somewhere/else').get());
    await assertFails(as('alice').doc('leaderboard/alice/extra/doc').set({ a: 1 }));
  });
});
