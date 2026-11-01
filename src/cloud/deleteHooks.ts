import { AccountError, type AccountUser } from './types';

/** Removes whatever the app keeps in the cloud for this person. It may be async; it must not leave half a job silently. */
export type BeforeDeleteHook = (user: AccountUser) => void | Promise<void>;

const hooks = new Set<BeforeDeleteHook>();

/**
 * Registers a clean-up that runs when somebody deletes their account, before
 * the account itself goes (while they can still be authorised to remove their
 * data). The progress sync and the leaderboard each register theirs. Returns
 * the function that unregisters it.
 *
 * Hooks run one after another in the order they were added. If one throws,
 * the account is NOT deleted and the person is told to try again, because an
 * account that is gone with its data still in the cloud cannot be cleaned up.
 */
export function onBeforeAccountDelete(hook: BeforeDeleteHook): () => void {
  hooks.add(hook);
  return () => {
    hooks.delete(hook);
  };
}

/** Runs every registered hook for `user`, stopping at the first that fails. */
export async function runBeforeDeleteHooks(user: AccountUser): Promise<void> {
  for (const hook of [...hooks]) {
    try {
      await hook(user);
    } catch {
      throw new AccountError(
        'cleanup-failed',
        'We couldn’t remove your saved data, so your account was kept. Check your connection and try again.',
      );
    }
  }
}
