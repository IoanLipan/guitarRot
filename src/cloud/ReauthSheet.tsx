import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BottomSheet } from '@/game/BottomSheet';
import { CloseIcon } from '@/ui/icons';
import { useAccount } from './AccountProvider';
import { toAccountError } from './errors';
import { PasswordField } from './PasswordField';
import { validatePassword } from './validate';

/**
 * Firebase wants a recent sign-in before it deletes an account, and a password
 * account can only give one by typing the password. This is that question,
 * asked at the moment it is needed; its answer goes straight to the delete.
 */
export function ReauthSheet({
  open,
  onClose,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  /** The account is gone (called just before the sheet closes itself). */
  onDeleted: () => void;
}) {
  const account = useAccount();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setPassword('');
    setError(null);
    setPending(false);
  }, [open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const problem = validatePassword(password, false);
    if (problem !== null) {
      setError(problem);
      inputRef.current?.focus();
      return;
    }
    setError(null);
    setPending(true);
    try {
      await account.deleteAccount({ password });
      onDeleted();
      onClose();
    } catch (failure) {
      setError(toAccountError(failure).message);
      inputRef.current?.focus();
    } finally {
      setPending(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} label="Confirm your password to delete your account" testId="reauth-sheet">
      <div className="mx-auto w-full max-w-md px-6 pt-2.5">
        <div aria-hidden="true" className="mx-auto mb-3 h-1 w-9 rounded-full bg-ink-faint/50" />
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-headline font-black">Confirm it’s you</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close confirmation"
            className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink"
          >
            <CloseIcon size={20} />
          </button>
        </div>
        <form onSubmit={submit} noValidate className="mt-4 flex flex-col gap-4" data-testid="reauth-form">
          <p className="text-body text-ink-dim">
            It’s been a while since you signed in. Enter your password to delete your account.
          </p>
          <PasswordField
            label="Password"
            inputRef={inputRef}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError(null);
            }}
            error={error}
            autoComplete="current-password"
            enterKeyHint="go"
            name="password"
          />
          <button
            type="submit"
            disabled={pending}
            className="press flex min-h-12 items-center justify-center rounded-full bg-surface-2 px-6 text-base font-extrabold text-bad disabled:opacity-60"
          >
            {pending ? 'Deleting…' : 'Delete my account'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="press -mt-1 flex min-h-11 items-center justify-center rounded-full text-meta font-bold text-ink-dim"
          >
            Keep my account
          </button>
        </form>
      </div>
    </BottomSheet>
  );
}
