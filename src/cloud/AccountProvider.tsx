import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { cloudEnabled } from './config';
import { toAccountError } from './errors';
import { AccountError, type AccountActions, type AccountApi, type AccountState } from './types';

const DISABLED: AccountState = { status: 'disabled', user: null };
const LOADING: AccountState = { status: 'loading', user: null };
const SIGNED_OUT: AccountState = { status: 'signed-out', user: null };

/** The service behind the actions: its own chunk, fetched once, after the first paint. */
let service: Promise<typeof import('./auth')> | undefined;
function loadService(): Promise<typeof import('./auth')> {
  service ??= import('./auth').catch((error: unknown) => {
    service = undefined;
    throw error;
  });
  return service;
}

/** Every action waits for the service; in a build without cloud features it fails the way every cloud call does. */
function viaService<Args extends unknown[]>(
  pick: (auth: typeof import('./auth')) => (...args: Args) => Promise<void>,
): (...args: Args) => Promise<void> {
  return async (...args) => {
    if (!cloudEnabled) throw new AccountError('cloud-disabled', 'Accounts aren’t available in this version.');
    try {
      await pick(await loadService())(...args);
    } catch (error) {
      throw toAccountError(error);
    }
  };
}

const ACTIONS: AccountActions = {
  signUpWithEmail: viaService((auth) => auth.signUpWithEmail),
  signInWithEmail: viaService((auth) => auth.signInWithEmail),
  sendPasswordReset: viaService((auth) => auth.sendPasswordReset),
  signInWithGoogle: viaService((auth) => auth.signInWithGoogle),
  signOut: viaService((auth) => auth.signOut),
  deleteAccount: viaService((auth) => auth.deleteAccount),
};

/** What `useAccount()` returns where there is no provider: no accounts, and nothing to do about it. */
const DISABLED_API: AccountApi = { ...DISABLED, ...ACTIONS };

export const AccountContext = createContext<AccountApi>(DISABLED_API);

/** Runs `run` once the first screen has had its chance to paint and the main thread is quiet. */
function whenIdle(run: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(run, { timeout: 2000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(run, 200);
  return () => window.clearTimeout(id);
}

/**
 * Holds the account for the whole app. With cloud features off it renders its
 * children and does nothing else. With them on, it starts Firebase only after
 * the first paint, so the start screen is as quick as ever and an offline
 * launch is not held up: the signed-in user is read from the device.
 */
export function AccountProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AccountState>(cloudEnabled ? LOADING : DISABLED);

  useEffect(() => {
    if (!cloudEnabled) return;
    let cancelled = false;
    let stopWatching: (() => void) | undefined;
    const cancelWait = whenIdle(() => {
      loadService()
        .then((auth) => {
          if (!cancelled) stopWatching = auth.watchAccount(setState);
        })
        .catch(() => {
          if (!cancelled) setState(SIGNED_OUT);
        });
    });
    return () => {
      cancelled = true;
      cancelWait();
      stopWatching?.();
    };
  }, []);

  const api = useMemo<AccountApi>(() => ({ ...state, ...ACTIONS }) as AccountApi, [state]);
  return <AccountContext.Provider value={api}>{children}</AccountContext.Provider>;
}

/** The account: `status`, `user`, and the actions. Outside a provider (or in a build with cloud off) the status is `disabled`. */
export function useAccount(): AccountApi {
  return useContext(AccountContext);
}
