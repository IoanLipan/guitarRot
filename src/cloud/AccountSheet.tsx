import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import { PRIVACY_URL, TERMS_URL } from '@/app/links';
import { BottomSheet } from '@/game/BottomSheet';
import { CloseIcon, MailIcon } from '@/ui/icons';
import { useAccount } from './AccountProvider';
import type { AccountSheetIntent } from './AccountSheetContext';
import { toAccountError } from './errors';
import { Field } from './Field';
import { PasswordField } from './PasswordField';
import { useProfile } from './ProfileProvider';
import { ProviderButtons, type ProviderId } from './ProviderButtons';
import { UsernameMissingError } from './types';
import { UsernameField, useUsernameCheck } from './UsernameField';
import { usernameSeed, validateUsername } from './username';
import { MIN_PASSWORD_LENGTH, validateEmail, validatePassword } from './validate';

type View = 'choose' | 'sign-up' | 'sign-in' | 'reset' | 'reset-sent' | 'username' | 'finishing';
type FieldName = 'username' | 'email' | 'password';
type Errors = Partial<Record<FieldName | 'form', string>>;

const FIRST_VIEW: Record<AccountSheetIntent, View> = {
  'sign-up': 'sign-up',
  'sign-in': 'sign-in',
  nudge: 'choose',
  username: 'username',
  'change-username': 'username',
};

/** How long a sign-in waits to hear whether the person has a username before it lets them go. */
export const FINISH_WAIT_MS = 5000;

export const NUDGE_TEXT = 'Make a free account so your streak, XP and badges follow you to a new phone.';

const SUBMIT: Record<'sign-in' | 'sign-up' | 'reset' | 'username', { label: string; busy: string }> = {
  'sign-in': { label: 'Sign in', busy: 'Signing in…' },
  'sign-up': { label: 'Create account', busy: 'Creating account…' },
  reset: { label: 'Send reset link', busy: 'Sending…' },
  username: { label: 'Continue', busy: 'Saving…' },
};

/**
 * The one place to get in: create an account, sign in, or pick a username. A bottom
 * sheet, so it keeps the screen behind it in view, and Escape, the backdrop and Android
 * Back all close it.
 *
 * Creating an account is Google and Apple on top, then "or", then username, email and
 * password and one button. Signing in is the same without the username. A person who
 * comes in through Google or Apple and has no username yet is asked for one, once, with
 * their name as the starting point; closing that step leaves them signed in, and the
 * Account card keeps offering "Pick a username" until they have one.
 *
 * Checked here first (what can be known without asking), then by Firebase, and either
 * way the problem is said once, in words, under the field it belongs to.
 */
export function AccountSheet({ intent, onClose }: { intent: AccountSheetIntent | null; onClose: () => void }) {
  const account = useAccount();
  const profile = useProfile();
  const open = intent !== null;
  // While the sheet slides away the intent is already gone; it keeps showing what it showed.
  const lastIntent = useRef<AccountSheetIntent>('sign-up');
  if (intent !== null) lastIntent.current = intent;
  const shownIntent = lastIntent.current;

  const [view, setView] = useState<View>(FIRST_VIEW[shownIntent]);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [providerError, setProviderError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [provider, setProvider] = useState<ProviderId | null>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const refs: Record<FieldName, RefObject<HTMLInputElement | null>> = {
    username: usernameRef,
    email: emailRef,
    password: passwordRef,
  };

  const signedInUid = account.status === 'signed-in' ? account.user.uid : undefined;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const check = useUsernameCheck(view === 'username' || view === 'sign-up' ? username : '', { uid: signedInUid });
  const busy = pending || provider !== null;

  // Each time it opens it is a fresh sheet: the right first view, no old complaints, no password left over.
  // (The email stays; somebody who closed it by accident should not have to type it again.)
  useEffect(() => {
    if (intent === null) return;
    const first = FIRST_VIEW[intent];
    setView(first);
    setErrors({});
    setProviderError(null);
    setPassword('');
    setPending(false);
    setProvider(null);
    if (intent === 'username') setUsername(account.status === 'signed-in' ? usernameSeed(account.user) : '');
    else if (intent === 'change-username') setUsername(profile.username ?? '');
    else setUsername('');
    // The account and the profile are read here only for what the sheet starts with; it must not start over when they change.
  }, [intent]);

  // A keyboard is right there on a desktop; on a phone it would cover the sheet before it has been read.
  useEffect(() => {
    if (!open || !window.matchMedia?.('(pointer: fine)').matches) return;
    const first = view === 'sign-up' || view === 'username' ? usernameRef : view === 'sign-in' || view === 'reset' ? emailRef : null;
    first?.current?.focus({ preventScroll: true });
  }, [open, view]);

  // After Google, Apple or an email sign-in: out if they have a username, to the username step if they don't.
  useEffect(() => {
    if (!open || view !== 'finishing') return;
    if (account.status === 'signed-in' && profile.status === 'ready') {
      if (profile.username !== null) {
        closeRef.current();
      } else {
        setUsername(usernameSeed(account.user));
        setView('username');
      }
      return;
    }
    // Offline, or the server is slow: they are signed in, and the Account card will offer the username.
    const timer = setTimeout(() => closeRef.current(), FINISH_WAIT_MS);
    return () => clearTimeout(timer);
  }, [open, view, account, profile]);

  /** Somebody typing in a field that was complained about is already fixing it: the complaint goes. */
  function clearError(field: FieldName) {
    setErrors((now) => (now[field] === undefined && now.form === undefined ? now : { ...now, [field]: undefined, form: undefined }));
  }

  function changeView(next: View) {
    setView(next);
    setErrors({});
    setProviderError(null);
  }

  /** Puts the cursor on the first field that has something to say, in the order they appear. */
  function focusFirst(problems: Errors) {
    const first = (['username', 'email', 'password'] as const).find((field) => problems[field] !== undefined);
    if (first !== undefined) refs[first].current?.focus();
  }

  function fail(problems: Errors) {
    setErrors(problems);
    focusFirst(problems);
  }

  async function withProvider(chosen: ProviderId) {
    if (busy) return;
    setProvider(chosen);
    setProviderError(null);
    setErrors({});
    try {
      await (chosen === 'google' ? account.signInWithGoogle() : account.signInWithApple());
      setView('finishing');
    } catch (error) {
      const failure = toAccountError(error);
      if (!failure.cancelled) setProviderError(failure.message);
    } finally {
      setProvider(null);
    }
  }

  function checkSignUp(): Errors {
    const problems: Errors = {};
    const usernameProblem = validateUsername(username);
    if (usernameProblem !== null) problems.username = usernameProblem;
    else if (check.state === 'taken') problems.username = 'That username is taken.';
    const emailProblem = validateEmail(email);
    if (emailProblem !== null) problems.email = emailProblem;
    const passwordProblem = validatePassword(password, true);
    if (passwordProblem !== null) problems.password = passwordProblem;
    return problems;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || view === 'reset-sent' || view === 'choose' || view === 'finishing') return;

    const problems: Errors = {};
    if (view === 'sign-up') Object.assign(problems, checkSignUp());
    if (view === 'sign-in' || view === 'reset') {
      const emailProblem = validateEmail(email);
      if (emailProblem !== null) problems.email = emailProblem;
    }
    if (view === 'sign-in') {
      const passwordProblem = validatePassword(password, false);
      if (passwordProblem !== null) problems.password = passwordProblem;
    }
    if (view === 'username') {
      const usernameProblem = validateUsername(username);
      if (usernameProblem !== null) problems.username = usernameProblem;
      else if (check.state === 'taken') problems.username = 'That username is taken.';
    }
    if (Object.keys(problems).length > 0) {
      fail(problems);
      return;
    }

    setErrors({});
    setPending(true);
    try {
      if (view === 'sign-up') {
        await account.signUpWithEmail({ email, password, username });
        onClose();
      } else if (view === 'sign-in') {
        await account.signInWithEmail({ email, password });
        setView('finishing');
      } else if (view === 'username') {
        await account.setUsername(username);
        onClose();
      } else {
        await account.sendPasswordReset(email);
        setView('reset-sent');
      }
    } catch (error) {
      const failure = toAccountError(error);
      if (error instanceof UsernameMissingError) {
        // The account exists and they are signed in; only the name was lost. Ask for another, here.
        setView('username');
        fail({ username: failure.message });
        return;
      }
      fail(failure.field !== undefined ? { [failure.field]: failure.message } : { form: failure.message });
    } finally {
      setPending(false);
    }
  }

  const TITLE: Record<View, string> = {
    choose: 'Save your progress',
    'sign-up': 'Create account',
    'sign-in': 'Sign in',
    reset: 'Reset password',
    'reset-sent': 'Check your email',
    username: shownIntent === 'change-username' ? 'Change username' : 'Pick a username',
    finishing: 'Signing you in',
  };

  const formError =
    errors.form !== undefined ? (
      <p role="alert" className="text-meta text-bad" data-testid="account-form-error">
        {errors.form}
      </p>
    ) : null;

  return (
    <BottomSheet open={open} onClose={onClose} label="Sign in or create an account" testId="account-sheet">
      <div className="mx-auto w-full max-w-md px-6 pt-2.5">
        <div aria-hidden="true" className="mx-auto mb-3 h-1 w-9 rounded-full bg-ink-faint/50" />
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-headline font-black" data-testid="account-sheet-title">
            {TITLE[view]}
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

        {view === 'finishing' && (
          <p role="status" className="mt-4 text-body text-ink-dim" data-testid="account-finishing">
            One moment…
          </p>
        )}

        {view === 'choose' && (
          <div className="mt-3 flex flex-col gap-4 tight:gap-3" data-testid="account-choose">
            <p className="text-body text-ink-dim">{NUDGE_TEXT}</p>
            <div className="flex flex-col gap-2">
              <ProviderButtons busy={provider} disabled={busy} onChoose={(chosen) => void withProvider(chosen)} />
              <button
                type="button"
                onClick={() => changeView('sign-up')}
                disabled={busy}
                data-testid="choose-email"
                className="press flex min-h-12 items-center justify-center gap-3 rounded-full bg-surface-3 px-4 text-[15px] font-medium text-ink disabled:opacity-60"
              >
                <MailIcon size={20} className="text-ink-dim" />
                Continue with email
              </button>
            </div>
            {providerError !== null && (
              <p role="alert" className="text-meta text-bad" data-testid="provider-error">
                {providerError}
              </p>
            )}
            <TermsLine />
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={onClose}
                data-testid="nudge-not-now"
                className="press flex min-h-11 items-center justify-center rounded-full px-5 text-meta font-bold text-ink-dim"
              >
                Not now
              </button>
              <SwitchLine lead="Already have an account?" action="Sign in" onClick={() => changeView('sign-in')} />
            </div>
          </div>
        )}

        {(view === 'sign-up' || view === 'sign-in') && (
          <div className="mt-4 flex flex-col gap-3 tight:mt-3 tight:gap-2">
            <ProviderButtons busy={provider} disabled={busy} onChoose={(chosen) => void withProvider(chosen)} />
            {providerError !== null && (
              <p role="alert" className="text-meta text-bad" data-testid="provider-error">
                {providerError}
              </p>
            )}
            <p className="text-center text-meta text-ink-dim">or</p>
          </div>
        )}

        {view === 'reset-sent' && (
          <div className="mt-5 flex flex-col gap-5" role="status" data-testid="reset-sent">
            <p className="text-body text-ink-dim">
              If there’s an account for <span className="font-bold break-words text-ink">{email.trim()}</span>, a link to
              choose a new password is on its way. It can take a minute, and it may land in spam.
            </p>
            <button
              type="button"
              onClick={() => changeView('sign-in')}
              className="press flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-base font-extrabold text-ground"
            >
              Back to sign in
            </button>
          </div>
        )}

        {(view === 'sign-up' || view === 'sign-in' || view === 'reset' || view === 'username') && (
          <form
            onSubmit={submit}
            noValidate
            className={`flex flex-col gap-4 tight:gap-3 [&_input]:scroll-mb-32 ${view === 'sign-up' || view === 'sign-in' ? 'mt-3 tight:mt-2' : 'mt-4'}`}
            data-testid={`account-form-${view}`}
          >
            {view === 'reset' && (
              <p className="text-body text-ink-dim">Enter your email and we’ll send a link to choose a new password.</p>
            )}
            {view === 'username' && (
              <p className="text-body text-ink-dim">
                {shownIntent === 'change-username'
                  ? 'Your old username is freed as soon as you save.'
                  : 'This is how you show up on the leaderboard. You can change it later.'}
              </p>
            )}

            {(view === 'sign-up' || view === 'username') && (
              <UsernameField
                label="Username"
                inputRef={usernameRef}
                value={username}
                onValueChange={(value) => {
                  setUsername(value);
                  clearError('username');
                }}
                check={check}
                error={errors.username}
                autoComplete={view === 'sign-up' ? 'username' : 'nickname'}
                enterKeyHint={view === 'sign-up' ? 'next' : 'go'}
                name="username"
              />
            )}

            {view !== 'username' && (
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
                autoComplete={view === 'sign-in' ? 'username' : 'email'}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint={view === 'reset' ? 'go' : 'next'}
                name="email"
              />
            )}

            {(view === 'sign-in' || view === 'sign-up') && (
              <PasswordField
                label="Password"
                inputRef={passwordRef}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  clearError('password');
                }}
                error={errors.password}
                hint={view === 'sign-up' ? `At least ${MIN_PASSWORD_LENGTH} characters` : undefined}
                autoComplete={view === 'sign-up' ? 'new-password' : 'current-password'}
                enterKeyHint="go"
                name="password"
              />
            )}

            {view === 'sign-in' && (
              <button
                type="button"
                onClick={() => changeView('reset')}
                className="press -mt-2 flex min-h-11 items-center self-start rounded-full text-meta font-bold text-ink-dim underline underline-offset-4"
              >
                Forgot your password?
              </button>
            )}

            {/* The action stays on screen: on a small phone the fields are taller than the sheet, and the
                button (with what must be said next to it) would otherwise sit below the fold. The inputs'
                scroll margin (above) keeps a field the browser scrolls to from landing under it. */}
            <div
              data-testid="account-actions"
              // The sheet's own bottom padding (BottomSheet) counts against a sticky offset, so the offset gives it back:
              // stuck, this sits flush with the sheet's bottom edge; at the end of the scroll it is where it always was.
              style={{ bottom: 'calc(-1.5rem - env(safe-area-inset-bottom))' }}
              className="sticky z-10 -mx-6 -mt-2 flex flex-col gap-2 bg-surface px-6 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"
            >
              {formError}
              <button
                type="submit"
                disabled={busy}
                data-testid="account-submit"
                className="press flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-base font-extrabold text-ground disabled:opacity-60"
              >
                {pending ? SUBMIT[view].busy : SUBMIT[view].label}
              </button>
              {view === 'sign-up' && <TermsLine />}
            </div>

            {view === 'sign-up' && (
              <SwitchLine lead="Already have an account?" action="Sign in" onClick={() => changeView('sign-in')} />
            )}
            {view === 'sign-in' && <SwitchLine lead="New here?" action="Create an account" onClick={() => changeView('sign-up')} />}
            {view === 'reset' && (
              <button
                type="button"
                onClick={() => changeView('sign-in')}
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

/**
 * What making an account means, said next to the ways to make one (Google, Apple, email): the
 * terms and the privacy policy, opened the way Settings opens them (a new browser tab on the web,
 * the phone's browser in the app: see `AboutLink` in app/SettingsSheet).
 */
function TermsLine() {
  const link = 'font-bold text-ink underline underline-offset-2';
  return (
    <p className="text-center text-label leading-snug text-ink-dim" data-testid="account-terms">
      By creating an account you agree to the{' '}
      <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" data-testid="account-terms-link" className={link}>
        Terms
      </a>{' '}
      and the{' '}
      <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" data-testid="account-privacy-link" className={link}>
        Privacy policy
      </a>
      .
    </p>
  );
}

/** "Already have an account? Sign in": a question, and the answer as a button. */
function SwitchLine({ lead, action, onClick }: { lead: string; action: string; onClick: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-1.5 text-meta text-ink-dim">
      <span>{lead}</span>
      <button
        type="button"
        onClick={onClick}
        data-testid={`switch-${action === 'Sign in' ? 'sign-in' : 'sign-up'}`}
        className="press flex min-h-11 items-center rounded-full px-1 font-bold text-ink underline underline-offset-4"
      >
        {action}
      </button>
    </div>
  );
}
