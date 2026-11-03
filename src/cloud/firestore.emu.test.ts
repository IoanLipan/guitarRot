/**
 * Checks the app's Firestore wiring reaches the emulator, and that the rules
 * (firestore.rules) refuse a request from nobody signed in. What a signed-in
 * person can and can not do is in firestore.rules.emu.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { getFirebaseApp, getFirestoreDb, loadFirestoreSdk } from './firebase';

describe('Firestore, against the emulator', () => {
  it('is the same database every time, on the demo project', async () => {
    const db = await getFirestoreDb();
    expect(await getFirestoreDb()).toBe(db);
    expect((await getFirebaseApp()).options.projectId).toBe('demo-guitarrot');
  });

  it('reaches the emulator, whose rules refuse a read or write from nobody signed in', async () => {
    const db = await getFirestoreDb();
    const { doc, getDoc, setDoc } = await loadFirestoreSdk();

    await expect(getDoc(doc(db, 'users/someone'))).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(setDoc(doc(db, 'users/someone'), { xp: 1 })).rejects.toMatchObject({ code: 'permission-denied' });
  });
});
