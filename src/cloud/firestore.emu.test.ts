/**
 * Phase 1 only wires Firestore up; this checks the wiring reaches the
 * emulator and that the placeholder rules (firestore.rules) deny everything,
 * so nothing can be read or written until the sync phase writes real rules.
 */
import { describe, expect, it } from 'vitest';
import { getFirebaseApp, getFirestoreDb, loadFirestoreSdk } from './firebase';

describe('Firestore, against the emulator', () => {
  it('is the same database every time, on the demo project', async () => {
    const db = await getFirestoreDb();
    expect(await getFirestoreDb()).toBe(db);
    expect((await getFirebaseApp()).options.projectId).toBe('demo-guitarrot');
  });

  it('reaches the emulator, whose placeholder rules refuse every read and write', async () => {
    const db = await getFirestoreDb();
    const { doc, getDoc, setDoc } = await loadFirestoreSdk();

    await expect(getDoc(doc(db, 'users/someone'))).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(setDoc(doc(db, 'users/someone'), { xp: 1 })).rejects.toMatchObject({ code: 'permission-denied' });
  });
});
