import { useState, type CSSProperties } from 'react';
import { ConfirmDialog } from '@/game/ConfirmDialog';
import { MailIcon } from '@/ui/icons';
import { useAccount } from './AccountProvider';
import { useOpenAccountSheet } from './AccountSheetContext';
import { accountName } from './accountName';
import { AppleMark } from './AppleMark';
import { toAccountError } from './errors';
import { GoogleMark } from './GoogleMark';
import { needsUsername, useProfile } from './ProfileProvider';
import { ReauthSheet } from './ReauthSheet';
import type { SyncStatus } from './sync';
import { APPLE_PROVIDER, GOOGLE_PROVIDER } from './types';
import { useSync } from './useCloudSync';

/** Said in full, because deleting is the one thing here that cannot be taken back. */
export const DELETE_TITLE = 'Delete your account?';
export const DELETE_BODY =
  'This permanently deletes your guitarRot account (your name, email and sign-in) and everything saved in the cloud for it, such as synced progress and your leaderboard entry. Progress on this phone stays, and you can keep playing without an account. This can’t be undone.';
/** An account with Apple also has Apple's token revoked as it goes, which takes Apple's own sheet or window. */
export const DELETE_APPLE_NOTE = ' Apple will ask you to confirm first.';

/** What the card says about the saved progress, quietly, under who you are. */
export const SYNC_TEXT: Record<SyncStatus, string> = {
  synced: 'Saved to your account',
  syncing: 'Saving…',
  offline: 'Will save when you’re back online',
  error: 'Couldn’t save to your account. We’ll keep trying.',
};

const DELETED_NOTICE = 'Your account was deleted. Your progress on this phone is untouched.';

function Avatar({ name, photoURL }: { name: string; photoURL: string | undefined }) {
  const [broken, setBroken] = useState(false);
  return (
    <span
      aria-hidden="true"
      className="font-display relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-3 text-2xl leading-none font-black text-ink"
    >
      {name.slice(0, 1).toUpperCase()}
      {photoURL !== undefined && !broken && (
        <img
          src={photoURL}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </span>
  );
}

/** How the account signs in, as a small mark: Google's G, Apple's apple, or an envelope for email and password. */
function ProviderMark({ providers }: { providers: string[] }) {
  const provider = providers.includes(GOOGLE_PROVIDER) ? 'google' : providers.includes(APPLE_PROVIDER) ? 'apple' : 'password';
  const label = { google: 'Signed in with Google', apple: 'Signed in with Apple', password: 'Signed in with email' }[provider];
  return (
    <span
      role="img"
      aria-label={label}
      data-testid="account-provider"
      data-provider={provider}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-dim"
    >
      {provider === 'google' ? <GoogleMark size={18} /> : provider === 'apple' ? <AppleMark size={18} /> : <MailIcon size={18} />}
    </span>
  );
}

type Busy = 'sign-out' | 'delete' | null;

/**
 * The Account card of the You tab. Where accounts do not exist (a build
 * without a Firebase config) it renders nothing at all. Signed out it offers
 * to create an account or sign in, both through the app's one account sheet;
 * signed in it shows who you are (the username), with Sign out and Delete
 * account (behind a dialog that says what goes). Somebody who is signed in but
 * has no username yet is offered one here, until they pick it.
 */
export function AccountCard({ delay = '0ms' }: { delay?: string }) {
  const account = useAccount();
  const profile = useProfile();
  const sync = useSync();
  const openSheet = useOpenAccountSheet();
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [askingPassword, setAskingPassword] = useState(false);

  if (account.status === 'disabled') return null;

  const working = busy !== null;
  const style = { '--delay': delay } as CSSProperties;

  async function leave() {
    if (working) return;
    setBusy('sign-out');
    setError(null);
    try {
      // Whatever is still waiting to be saved goes first: once signed out, it can't be.
      await sync.flush().catch(() => undefined);
      await account.signOut();
    } catch (failure) {
      setError(toAccountError(failure).message);
    } finally {
      setBusy(null);
    }
  }

  async function deleteForGood() {
    setConfirmingDelete(false);
    setBusy('delete');
    setError(null);
    try {
      await account.deleteAccount();
      setNotice(DELETED_NOTICE);
    } catch (failure) {
      const problem = toAccountError(failure);
      // A password account that signed in a while ago has to say its password first. Backing out of Apple's
      // sheet is a choice, not a failure: the account stays and there is nothing to say.
      if (problem.code === 'password-needed') setAskingPassword(true);
      else if (!problem.cancelled) setError(problem.message);
    } finally {
      setBusy(null);
    }
  }

  const frame = 'rise-in flex flex-col gap-4 rounded-3xl bg-surface p-4';

  if (account.status === 'loading') {
    // The signed-out card's shape, so nothing jumps when the answer arrives; a reader is told it is loading.
    return (
      <section aria-label="Account" aria-busy="true" className={frame} style={style} data-testid="account-card" data-state="loading">
        <h2 className="label">Account</h2>
        <p className="sr-only">Checking your account</p>
        <div aria-hidden="true" className="h-5 w-4/5 rounded-full bg-surface-2" />
        <div aria-hidden="true" className="h-12 rounded-full bg-surface-2" />
        <div aria-hidden="true" className="h-12 rounded-full bg-surface-2" />
      </section>
    );
  }

  if (account.status === 'signed-in') {
    const { user } = account;
    const name = profile.username ?? accountName(user);
    const pickUsername = needsUsername(account, profile);
    return (
      <section aria-label="Account" className={frame} style={style} data-testid="account-card" data-state="signed-in">
        <h2 className="label">Account</h2>
        <div className="flex items-center gap-3">
          <Avatar name={name} photoURL={user.photoURL} />
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate text-body font-extrabold" data-testid="account-name">
              {name}
            </p>
            {user.email !== null && (
              <p className="truncate text-meta text-ink-dim" data-testid="account-email">
                {user.email}
              </p>
            )}
          </div>
          <ProviderMark providers={user.providers} />
        </div>

        {sync.status !== null && (
          <p role="status" className="-mt-2 text-meta text-ink-dim" data-testid="sync-status" data-sync={sync.status}>
            {SYNC_TEXT[sync.status]}
          </p>
        )}

        {pickUsername && (
          <div className="flex flex-col items-start gap-2" data-testid="username-missing">
            <p className="text-meta text-ink-dim">Choose a username to finish setting up. It’s how you show up to other players.</p>
            <button
              type="button"
              onClick={() => openSheet('username')}
              data-testid="pick-username"
              className="press flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-4 text-base font-extrabold text-ground"
            >
              Pick a username
            </button>
          </div>
        )}

        {error !== null && (
          <p role="alert" className="text-meta text-bad" data-testid="account-error">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void leave()}
            disabled={working}
            data-testid="sign-out"
            className="press flex min-h-12 flex-1 items-center justify-center rounded-full bg-surface-2 px-4 text-base font-bold text-ink disabled:opacity-60"
          >
            {busy === 'sign-out' ? 'Signing out…' : 'Sign out'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            disabled={working}
            data-testid="delete-account"
            className="press flex min-h-12 shrink-0 items-center justify-center rounded-full px-4 text-base font-bold whitespace-nowrap text-bad disabled:opacity-60"
          >
            {busy === 'delete' ? 'Deleting…' : 'Delete account'}
          </button>
        </div>

        {profile.username !== null && (
          <button
            type="button"
            onClick={() => openSheet('change-username')}
            data-testid="change-username"
            className="press -mt-1 flex min-h-11 items-center self-start text-meta font-bold text-ink-dim underline underline-offset-4"
          >
            Change username
          </button>
        )}

        {confirmingDelete && (
          <ConfirmDialog
            title={DELETE_TITLE}
            body={user.providers.includes(APPLE_PROVIDER) ? DELETE_BODY + DELETE_APPLE_NOTE : DELETE_BODY}
            keepLabel="Keep my account"
            confirmLabel="Delete account"
            onKeep={() => setConfirmingDelete(false)}
            onConfirm={() => void deleteForGood()}
          />
        )}
        <ReauthSheet
          open={askingPassword}
          onClose={() => setAskingPassword(false)}
          onDeleted={() => setNotice(DELETED_NOTICE)}
        />
      </section>
    );
  }

  return (
    <section aria-label="Account" className={frame} style={style} data-testid="account-card" data-state="signed-out">
      <h2 className="label">Account</h2>
      {notice !== null && (
        <p role="status" className="text-meta text-ink" data-testid="account-notice">
          {notice}
        </p>
      )}
      <p className="text-body leading-snug text-ink-dim">Save your progress so it follows you to a new phone.</p>

      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => {
            setNotice(null);
            openSheet('sign-up');
          }}
          data-testid="create-account"
          className="press flex min-h-12 items-center justify-center rounded-full bg-accent px-4 text-base font-extrabold text-ground"
        >
          Create account
        </button>
        <button
          type="button"
          onClick={() => {
            setNotice(null);
            openSheet('sign-in');
          }}
          data-testid="sign-in"
          className="press flex min-h-11 items-center justify-center rounded-full px-4 text-base font-bold text-ink"
        >
          Sign in
        </button>
      </div>
    </section>
  );
}

export default AccountCard;
