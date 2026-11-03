import { useEffect, useState, type ComponentProps, type Ref } from 'react';
import { Field } from './Field';
import { normalizeUsername, USERNAME_MAX, USERNAME_MIN, validateUsername } from './username';
import { checkUsername, freeUsernames } from './usernames';

/** How long typing has to pause before the server is asked, so a name is checked once, not once per letter. */
export const CHECK_DELAY_MS = 400;

export const USERNAME_HINT = `${USERNAME_MIN} to ${USERNAME_MAX} letters, numbers, . or _`;

export type UsernameCheck = {
  /**
   * `idle`: nothing typed. `short`: on its way (still fewer than the minimum). `invalid`: breaks the
   * shape. `checking`: asking the server. `available`, `taken`, `yours`: its answer. `unknown`: it
   * couldn't be asked (offline); the claim at the end is what decides.
   */
  state: 'idle' | 'short' | 'invalid' | 'checking' | 'available' | 'taken' | 'yours' | 'unknown';
  /** What to say under the field; null for nothing. */
  message: string | null;
  tone: 'dim' | 'good' | 'bad';
  /** Free names near a taken one. */
  suggestions: string[];
};

const NONE: UsernameCheck = { state: 'idle', message: null, tone: 'dim', suggestions: [] };

type Answer = { handle: string; state: 'available' | 'taken' | 'yours' | 'unknown'; suggestions: string[] };

/**
 * Follows what is typed in a username field: checks the shape at once, then, once typing has paused,
 * asks the server whether it is free. A late answer to an earlier version of the text is dropped.
 * `uid` makes the person's own current username answer `yours` rather than `taken`.
 */
export function useUsernameCheck(value: string, { uid, delay = CHECK_DELAY_MS }: { uid?: string; delay?: number } = {}): UsernameCheck {
  const handle = normalizeUsername(value);
  const problem = handle === '' ? null : validateUsername(handle);
  const [answer, setAnswer] = useState<Answer | null>(null);

  useEffect(() => {
    if (handle === '' || problem !== null) return;
    let stale = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const state = await checkUsername(handle, uid);
          if (stale) return;
          setAnswer({ handle, state, suggestions: [] });
          if (state === 'taken') {
            const suggestions = await freeUsernames(handle, uid);
            if (!stale) setAnswer({ handle, state, suggestions });
          }
        } catch {
          if (!stale) setAnswer({ handle, state: 'unknown', suggestions: [] });
        }
      })();
    }, delay);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [handle, problem, uid, delay]);

  if (handle === '') return NONE;
  if (problem !== null) {
    // Still typing toward three characters is not a mistake; a space or a hyphen is.
    const onItsWay = handle.length < USERNAME_MIN && /^[a-z0-9._]+$/.test(handle);
    return { state: onItsWay ? 'short' : 'invalid', message: problem, tone: onItsWay ? 'dim' : 'bad', suggestions: [] };
  }
  if (answer === null || answer.handle !== handle) return { state: 'checking', message: 'Checking…', tone: 'dim', suggestions: [] };
  switch (answer.state) {
    case 'available':
      return { state: 'available', message: 'Available', tone: 'good', suggestions: [] };
    case 'taken':
      return { state: 'taken', message: 'Taken', tone: 'bad', suggestions: answer.suggestions };
    case 'yours':
      return { state: 'yours', message: 'That’s your username now', tone: 'dim', suggestions: [] };
    default:
      return { state: 'unknown', message: 'Can’t check right now. We’ll check again when you continue.', tone: 'dim', suggestions: [] };
  }
}

/**
 * The username input: lowercase as you type, a hint of the shape, "Available" or "Taken" as soon
 * as the server has said, and a few free names to tap when it is taken. `error` is a problem found
 * on submit; it wins over the live status.
 */
export function UsernameField({
  value,
  onValueChange,
  check,
  error,
  inputRef,
  label = 'Username',
  ...input
}: {
  value: string;
  onValueChange: (value: string) => void;
  check: UsernameCheck;
  error?: string | null;
  inputRef?: Ref<HTMLInputElement>;
  label?: string;
} & Omit<ComponentProps<'input'>, 'id' | 'value' | 'onChange' | 'ref'>) {
  // The note under the field: a problem from submit, else the live status, else the shape of a username.
  const shownError = error ?? (check.tone === 'bad' ? check.message : null);
  const hint = shownError !== null ? undefined : (check.message ?? USERNAME_HINT);
  return (
    <Field
      {...input}
      label={label}
      inputRef={inputRef}
      value={value}
      onChange={(event) => onValueChange(event.target.value.toLowerCase())}
      error={shownError}
      hint={hint}
      hintTone={check.tone === 'good' ? 'good' : 'dim'}
      live
      type="text"
      inputMode="text"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      maxLength={40}
      below={
        check.suggestions.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1" data-testid="username-suggestions">
            <span className="text-meta text-ink-dim">Try</span>
            {check.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onValueChange(suggestion)}
                className="press flex min-h-11 items-center rounded-full bg-surface-2 px-4 text-meta font-bold text-ink"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : undefined
      }
    />
  );
}
