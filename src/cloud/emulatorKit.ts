/**
 * Helpers for the tests that run against the Firebase Emulator Suite
 * (`*.emu.test.ts`, `npm run test:cloud`). Not imported by the app.
 */
import { AUTH_EMULATOR, EMULATOR_PROJECT_ID } from './config';
import { watchAccount } from './auth';
import type { AccountState } from './types';

const AUTH_URL = `http://${AUTH_EMULATOR.host}:${AUTH_EMULATOR.port}`;

/** An address no other test (or earlier run against a long-lived emulator) has used. */
export function uniqueEmail(label: string): string {
  return `${label}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}@example.test`;
}

export type OobCode = { email: string; requestType: string; oobCode: string; oobLink: string };

/** The emails the Auth emulator "sent": it keeps their one-time codes instead of delivering them. */
export async function sentEmails(): Promise<OobCode[]> {
  const response = await fetch(`${AUTH_URL}/emulator/v1/projects/${EMULATOR_PROJECT_ID}/oobCodes`);
  const body = (await response.json()) as { oobCodes?: OobCode[] };
  return body.oobCodes ?? [];
}

/** Watches the account until `done` accepts a state, and gives that state back. */
export function waitForAccount(done: (state: AccountState) => boolean, timeoutMs = 10_000): Promise<AccountState> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      stop();
      reject(new Error('The account never reached the expected state.'));
    }, timeoutMs);
    const stop = watchAccount((state) => {
      if (!done(state)) return;
      clearTimeout(timer);
      // `stop` is assigned by the time any state arrives: reporting is asynchronous.
      queueMicrotask(() => stop());
      resolve(state);
    });
  });
}
