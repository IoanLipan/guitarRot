import { useState, type CSSProperties } from 'react';
import { ConfirmDialog } from '@/game/ConfirmDialog';
import { MailIcon } from '@/ui/icons';
import { useAccount } from './AccountProvider';
import { accountName } from './accountName';
import { EmailSheet } from './EmailSheet';
import { toAccountError } from './errors';
import { GoogleMark } from './GoogleMark';
import { ReauthSheet } from './ReauthSheet';
import { GOOGLE_PROVIDER } from './types';

/** Said in full, because deleting is the one thing here that cannot be taken back. */
export const DELETE_TITLE = 'Delete your account?';
export const DELETE_BODY =
  'This permanently deletes your guitarRot account (your name, email and sign-in) and everything saved in the cloud for it, such as synced progress and your leaderboard entry. Progress on this phone stays, and you can keep playing without an account. This can’t be undone.';

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

/** How the account signs in, as a small mark: Google's G, or an envelope for email and password. */
function ProviderMark({ providers }: { providers: string[] }) {
  const google = providers.includes(GOOGLE_PROVIDER);
  return (
    <span
      role="img"
      aria-label={google ? 'Signed in with Google' : 'Signed in with email'}
      data-testid="account-provider"
      data-provider={google ? 'google' : 'password'}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-dim"
    >
      {google ? <GoogleMark size={18} /> : <MailIcon size={18} />}
    </span>
  );
}

type Busy = 'google' | 'sign-out' | 'delete' | null;

/**
 * The Account card of the You tab. Where accounts do not exist (a build
 * without a Firebase config) it renders nothing at all. Signed out it offers
 * Google and email; signed in it shows who you are, with Sign out and Delete
 * account (behind a dialog that says what goes).
 *
 * The email sheet's open state can be owned by the caller, because the Android
 * Back button has to close it before it does anything else.
 */
export function AccountCard({
  emailOpen,
  onEmailOpenChange,
  delay = '0ms',
}: {
  emailOpen?: boolean;
  onEmailOpenChange?: (open: boolean) => void;
  delay?: string;
}) {
  const account = useAccount();
  const [localEmailOpen, setLocalEmailOpen] = useState(false);
  const sheetOpen = emailOpen ?? localEmailOpen;
  const setSheetOpen = onEmailOpenChange ?? setLocalEmailOpen;
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [askingPassword, setAskingPassword] = useState(false);

  if (account.status === 'disabled') return null;

  const working = busy !== null;
  const style = { '--delay': delay } as CSSProperties;

  async function withGoogle() {
    if (working) return;
    setBusy('google');
    setError(null);
    setNotice(null);
    try {
      await account.signInWithGoogle();
    } catch (failure) {
      const problem = toAccountError(failure);
      if (!problem.cancelled) setError(problem.message);
    } finally {
      setBusy(null);
    }
  }

  async function leave() {
    if (working) return;
    setBusy('sign-out');
    setError(null);
    try {
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
      // A password account that signed in a while ago has to say its password first.
      if (problem.code === 'password-needed') setAskingPassword(true);
      else setError(problem.message);
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
    const name = accountName(user);
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

        {confirmingDelete && (
          <ConfirmDialog
            title={DELETE_TITLE}
            body={DELETE_BODY}
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

      {error !== null && (
        <p role="alert" className="text-meta text-bad" data-testid="account-error">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {/* Google's own button, in their dark-theme colours and with their mark, so it reads as theirs on our dark ground. */}
        <button
          type="button"
          onClick={() => void withGoogle()}
          disabled={working}
          data-testid="google-sign-in"
          className="press flex min-h-12 items-center justify-center gap-3 rounded-full border border-[#8e918f] bg-[#131314] px-4 text-[15px] font-medium text-[#e3e3e3] [font-family:Roboto,ui-sans-serif,system-ui,sans-serif] disabled:opacity-60"
        >
          <GoogleMark size={20} />
          {busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
        </button>
        <button
          type="button"
          onClick={() => {
            setNotice(null);
            setError(null);
            setSheetOpen(true);
          }}
          disabled={working}
          data-testid="email-sign-in"
          className="press flex min-h-12 items-center justify-center gap-3 rounded-full bg-surface-2 px-4 text-base font-bold text-ink disabled:opacity-60"
        >
          <MailIcon size={20} className="text-ink-dim" />
          Use email
        </button>
      </div>

      <EmailSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </section>
  );
}

export default AccountCard;
