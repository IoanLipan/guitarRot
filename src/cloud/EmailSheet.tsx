import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import { BottomSheet } from '@/game/BottomSheet';
import { CloseIcon } from '@/ui/icons';
import { useAccount } from './AccountProvider';
import { toAccountError } from './errors';
import { Field } from './Field';
import { PasswordField } from './PasswordField';
import { MIN_PASSWORD_LENGTH, validateEmail, validateName, validatePassword } from './validate';

type Mode = 'sign-in' | 'sign-up' | 'reset' | 'reset-sent';
type FieldName = 'name' | 'email' | 'password';
type Errors = Partial<Record<FieldName | 'form', string>>;

const TITLE: Record<Mode, string> = {
  'sign-in': 'Sign in',
  'sign-up': 'Create account',
  reset: 'Reset password',
  'reset-sent': 'Check your email',
};

const SUBMIT: Record<'sign-in' | 'sign-up' | 'reset', { label: string; busy: string }> = {
  'sign-in': { label: 'Sign in', busy: 'Signing in…' },
  'sign-up': { label: 'Create account', busy: 'Creating account…' },
  reset: { label: 'Send reset link', busy: 'Sending…' },
};

/**
 * Sign in, create an account, or ask for a password reset, with an email
 * address. A bottom sheet, so it keeps the You tab in view behind it and
 * Escape, the backdrop and Android Back all close it. Checked here first
 * (what can be known without asking Firebase), then by Firebase, and either
 * way the problem is said once, in words, under the field it belongs to.
 */
export function EmailSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const account = useAccount();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const refs: Record<FieldName, RefObject<HTMLInputElement | null>> = {
    name: nameRef,
    email: emailRef,
    password: passwordRef,
  };

  // Each time it opens it is a fresh sheet: sign in, no old complaints, no password left over.
  // (The email stays; somebody who closed it by accident should not have to type it again.)
  useEffect(() => {
    if (!open) return;
    setMode('sign-in');
    setErrors({});
    setPassword('');
    setPending(false);
    // A keyboard is right there on a desktop; on a phone it would cover the sheet before it has been read.
    if (window.matchMedia?.('(pointer: fine)').matches) emailRef.current?.focus({ preventScroll: true });
  }, [open]);

  /** Somebody typing in a field that was complained about is already fixing it: the complaint goes. */
  function clearError(field: FieldName) {
    setErrors((now) => (now[field] === undefined && now.form === undefined ? now : { ...now, [field]: undefined, form: undefined }));
  }

  function changeMode(next: Mode) {
    setMode(next);
    setErrors({});
  }

  /** Puts the cursor on the first field that has something to say, in the order they appear. */
  function focusFirst(problems: Errors) {
    const first = (['name', 'email', 'password'] as const).find((field) => problems[field] !== undefined);
    if (first !== undefined) refs[first].current?.focus();
  }

  function check(): Errors {
    const problems: Errors = {};
    if (mode === 'sign-up') {
      const nameProblem = validateName(name);
      if (nameProblem !== null) problems.name = nameProblem;
    }
    const emailProblem = validateEmail(email);
    if (emailProblem !== null) problems.email = emailProblem;
    if (mode === 'sign-in' || mode === 'sign-up') {
      const passwordProblem = validatePassword(password, mode === 'sign-up');
      if (passwordProblem !== null) problems.password = passwordProblem;
    }
    return problems;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending || mode === 'reset-sent') return;
    const problems = check();
    if (Object.keys(problems).length > 0) {
      setErrors(problems);
      focusFirst(problems);
      return;
    }
    setErrors({});
    setPending(true);
    try {
      if (mode === 'sign-up') {
        await account.signUpWithEmail({ email, password, username: name });
        onClose();
      } else if (mode === 'sign-in') {
        await account.signInWithEmail({ email, password });
        onClose();
      } else {
        await account.sendPasswordReset(email);
        setMode('reset-sent');
      }
    } catch (error) {
      const failure = toAccountError(error);
      const field = failure.field;
      const problem: Errors = field !== undefined ? { [field]: failure.message } : { form: failure.message };
      setErrors(problem);
      focusFirst(problem);
    } finally {
      setPending(false);
    }
  }

  const creating = mode === 'sign-up';

  return (
    <BottomSheet open={open} onClose={onClose} label="Sign in or create an account" testId="email-sheet">
      <div className="mx-auto w-full max-w-md px-6 pt-2.5">
        <div aria-hidden="true" className="mx-auto mb-3 h-1 w-9 rounded-full bg-ink-faint/50" />
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-headline font-black" data-testid="email-sheet-title">
            {TITLE[mode]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign in"
            className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {(mode === 'sign-in' || mode === 'sign-up') && (
          <div role="group" aria-label="Sign in or create an account" className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1">
            {(['sign-in', 'sign-up'] as const).map((choice) => (
              <button
                key={choice}
                type="button"
                aria-pressed={mode === choice}
                onClick={() => changeMode(choice)}
                data-testid={`mode-${choice}`}
                className={`press min-h-11 rounded-full text-meta font-bold ${
                  mode === choice ? 'bg-surface-3 text-ink' : 'text-ink-dim'
                }`}
              >
                {choice === 'sign-in' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>
        )}

        {mode === 'reset-sent' ? (
          <div className="mt-5 flex flex-col gap-5" role="status" data-testid="reset-sent">
            <p className="text-body text-ink-dim">
              If there’s an account for <span className="font-bold break-words text-ink">{email.trim()}</span>, a link to
              choose a new password is on its way. It can take a minute, and it may land in spam.
            </p>
            <button
              type="button"
              onClick={() => changeMode('sign-in')}
              className="press flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-base font-extrabold text-ground"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-4 tight:mt-4 tight:gap-3" data-testid="email-form">
            {mode === 'reset' && (
              <p className="text-body text-ink-dim">Enter your email and we’ll send a link to choose a new password.</p>
            )}

            {creating && (
              <Field
                label="Name"
                inputRef={nameRef}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  clearError('name');
                }}
                error={errors.name}
                type="text"
                autoComplete="name"
                autoCapitalize="words"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                name="name"
              />
            )}

            <Field
              label="Email"
              inputRef={emailRef}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                clearError('email');
              }}
              error={errors.email}
              type="email"
              inputMode="email"
              autoComplete={mode === 'sign-in' ? 'username' : 'email'}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint={mode === 'reset' ? 'go' : 'next'}
              name="email"
            />

            {(mode === 'sign-in' || mode === 'sign-up') && (
              <PasswordField
                label="Password"
                inputRef={passwordRef}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  clearError('password');
                }}
                error={errors.password}
                hint={creating ? `At least ${MIN_PASSWORD_LENGTH} characters.` : undefined}
                autoComplete={creating ? 'new-password' : 'current-password'}
                enterKeyHint="go"
                name="password"
              />
            )}

            {mode === 'sign-in' && (
              <button
                type="button"
                onClick={() => changeMode('reset')}
                className="press -mt-2 flex min-h-11 items-center self-start rounded-full text-meta font-bold text-ink-dim underline underline-offset-4"
              >
                Forgot your password?
              </button>
            )}

            {errors.form !== undefined && (
              <p role="alert" className="text-meta text-bad" data-testid="email-form-error">
                {errors.form}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="press flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-base font-extrabold text-ground disabled:opacity-60"
            >
              {pending ? SUBMIT[mode].busy : SUBMIT[mode].label}
            </button>

            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => changeMode('sign-in')}
                className="press -mt-1 flex min-h-11 items-center justify-center rounded-full text-meta font-bold text-ink-dim"
              >
                Back to sign in
              </button>
            )}
          </form>
        )}
      </div>
    </BottomSheet>
  );
}
