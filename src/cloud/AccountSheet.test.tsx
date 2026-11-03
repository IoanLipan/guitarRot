import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountContext } from './AccountProvider';
import { AccountSheet, FINISH_WAIT_MS, NUDGE_TEXT } from './AccountSheet';
import type { AccountSheetIntent } from './AccountSheetContext';
import { ProfileContext } from './ProfileProvider';
import { AccountError, UsernameMissingError, type AccountApi, type AccountUser, type ProfileState } from './types';
import { CHECK_DELAY_MS } from './UsernameField';

const world = vi.hoisted(() => ({ apple: false }));

vi.mock('./config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./config')>()),
  appleSignInAvailable: () => world.apple,
}));
vi.mock('./usernames', () => ({ checkUsername: vi.fn(), freeUsernames: vi.fn() }));
const usernames = await import('./usernames');

const api = {
  signUpWithEmail: vi.fn(),
  signInWithEmail: vi.fn(),
  sendPasswordReset: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithApple: vi.fn(),
  setUsername: vi.fn(),
  signOut: vi.fn(),
  deleteAccount: vi.fn(),
};

const GRACE: AccountUser = {
  uid: 'u1',
  email: 'grace.hopper@example.com',
  displayName: 'Grace Hopper',
  providers: ['google.com'],
  emailVerified: true,
};
const SIGNED_OUT: Partial<AccountApi> = { status: 'signed-out', user: null };
const SIGNED_IN: Partial<AccountApi> = { status: 'signed-in', user: GRACE };
const UNKNOWN: ProfileState = { status: 'unknown', username: null };

type Scene = { account?: Partial<AccountApi>; profile?: ProfileState; intent?: AccountSheetIntent | null };

function tree({ account = SIGNED_OUT, profile = UNKNOWN, intent = 'sign-up' }: Scene, onClose: () => void) {
  return (
    <ProfileContext.Provider value={profile}>
      <AccountContext.Provider value={{ ...api, ...account } as AccountApi}>
        <AccountSheet intent={intent} onClose={onClose} />
      </AccountContext.Provider>
    </ProfileContext.Provider>
  );
}

function setup(scene: Scene = {}) {
  const onClose = vi.fn();
  const view = render(tree(scene, onClose));
  return { onClose, user: userEvent.setup(), rerender: (next: Scene) => view.rerender(tree(next, onClose)) };
}

const username = () => screen.getByLabelText('Username');
const email = () => screen.getByLabelText('Email');
const password = () => screen.getByLabelText('Password', { selector: 'input' });
const form = (view: string) => within(screen.getByTestId(`account-form-${view}`));
const title = () => screen.getByTestId('account-sheet-title');

/** Types a username and lets the debounce and the server's answer through. */
async function typeUsername(value: string) {
  fireEvent.change(username(), { target: { value } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(CHECK_DELAY_MS + 10);
  });
}

beforeEach(() => {
  world.apple = false;
  vi.mocked(usernames.checkUsername).mockResolvedValue('available');
  vi.mocked(usernames.freeUsernames).mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  for (const fn of Object.values(api)) fn.mockReset();
  vi.mocked(usernames.checkUsername).mockReset();
  vi.mocked(usernames.freeUsernames).mockReset();
});

describe('create account', () => {
  it('is one screen: Google on top, then "or", then username, email and password, and one amber button', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'Sign in or create an account' })).toBeInTheDocument();
    expect(title()).toHaveTextContent('Create account');

    const google = screen.getByRole('button', { name: 'Continue with Google' });
    const or = screen.getByText('or');
    const fields = [username(), email(), password()];
    const create = form('sign-up').getByRole('button', { name: 'Create account' });
    const order = [google, or, ...fields, create];
    for (let index = 1; index < order.length; index += 1) {
      const before = order[index - 1];
      const after = order[index];
      expect(before!.compareDocumentPosition(after!) & Node.DOCUMENT_POSITION_FOLLOWING, `step ${index}`).toBeTruthy();
    }

    // Exactly one amber hero in the sheet.
    const amber = screen.getAllByRole('button').filter((button) => button.className.includes('bg-accent'));
    expect(amber).toEqual([create]);
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
  });

  it('says where to go instead if you already have an account', async () => {
    const { user } = setup();
    expect(screen.getByText('Already have an account?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(title()).toHaveTextContent('Sign in');
  });

  it('uses the right kind of input for each field, for a phone’s keyboard and a password manager’s fill', () => {
    setup();
    expect(username()).toHaveAttribute('autocomplete', 'username');
    expect(username()).toHaveAttribute('autocapitalize', 'none');
    expect(username()).toHaveAttribute('autocorrect', 'off');
    expect(username()).toHaveAttribute('spellcheck', 'false');
    expect(email()).toHaveAttribute('type', 'email');
    expect(email()).toHaveAttribute('inputmode', 'email');
    expect(email()).toHaveAttribute('autocomplete', 'email');
    expect(password()).toHaveAttribute('type', 'password');
    expect(password()).toHaveAttribute('autocomplete', 'new-password');
  });

  it('sets every field in 16px type, which keeps a phone from zooming the page on focus', () => {
    setup();
    for (const input of [username(), email(), password()]) {
      expect(input.className).toContain('text-body');
      expect(input.className).not.toMatch(/text-(xs|sm|meta|label)\b/);
    }
  });

  it('shows and hides the password', async () => {
    const { user } = setup();
    await user.type(password(), 'secret12');
    expect(password()).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password()).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password()).toHaveAttribute('type', 'password');
  });

  it('says what is wrong under each field, puts the cursor on the first, and asks nothing of Firebase', async () => {
    const { user } = setup();
    await user.type(username(), 'ab');
    await user.type(email(), 'ada@nowhere');
    await user.type(password(), '1234567');
    await user.click(form('sign-up').getByRole('button', { name: 'Create account' }));

    expect(username()).toHaveAccessibleDescription('Use at least 3 characters.');
    expect(username()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('That doesn’t look like an email address.')).toBeInTheDocument();
    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument();
    expect(username()).toHaveFocus();
    expect(api.signUpWithEmail).not.toHaveBeenCalled();
  });

  it('names what is missing when the form is empty', async () => {
    const { user } = setup();
    await user.click(form('sign-up').getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Choose a username.')).toBeInTheDocument();
    expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Choose a password.')).toBeInTheDocument();
  });

  it('creates the account with the username, then closes', async () => {
    api.signUpWithEmail.mockResolvedValue(undefined);
    const { user, onClose } = setup();
    await user.type(username(), 'Ada_L');
    await user.type(email(), 'ada@example.com');
    await user.type(password(), 'secret12');
    await user.click(form('sign-up').getByRole('button', { name: 'Create account' }));

    // Lowercased as it was typed.
    expect(api.signUpWithEmail).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'secret12', username: 'ada_l' });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('disables the button and says what it is doing while it works', async () => {
    let finish: () => void = () => undefined;
    api.signUpWithEmail.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    const { user } = setup();
    await user.type(username(), 'ada_l');
    await user.type(email(), 'ada@example.com');
    await user.type(password(), 'secret12');
    await user.click(form('sign-up').getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('button', { name: 'Creating account…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeDisabled();
    finish();
  });

  describe('errors', () => {
    async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
      await user.type(username(), 'ada_l');
      await user.type(email(), 'ada@example.com');
      await user.type(password(), 'secret12');
      await user.click(form('sign-up').getByRole('button', { name: 'Create account' }));
    }

    it('says an address that already has an account under the email field', async () => {
      api.signUpWithEmail.mockRejectedValue(
        new AccountError('auth/email-already-in-use', 'That email already has an account. Sign in instead, or reset the password.', 'email'),
      );
      const { user, onClose } = setup();
      await fillAndSubmit(user);

      expect(await screen.findByText(/already has an account/)).toBeInTheDocument();
      expect(email()).toHaveAttribute('aria-invalid', 'true');
      expect(email()).toHaveFocus();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('says a username the check found taken under the field when you submit, without asking Firebase', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.mocked(usernames.checkUsername).mockResolvedValue('taken');
      const { user } = setup();
      await typeUsername('ada_l');
      await user.type(email(), 'ada@example.com');
      await user.type(password(), 'secret12');
      await user.click(form('sign-up').getByRole('button', { name: 'Create account' }));

      expect(username()).toHaveAccessibleDescription('That username is taken.');
      expect(api.signUpWithEmail).not.toHaveBeenCalled();
    });

    it('says a username that was taken in the last moment under the username field', async () => {
      api.signUpWithEmail.mockRejectedValue(new AccountError('username-taken', 'That username is taken.', 'username'));
      const { user } = setup();
      await fillAndSubmit(user);
      expect(await screen.findByText('That username is taken.')).toBeInTheDocument();
      expect(username()).toHaveAttribute('aria-invalid', 'true');
    });

    it('says a weak password under the password field', async () => {
      api.signUpWithEmail.mockRejectedValue(new AccountError('auth/weak-password', 'Use at least 8 characters for the password.', 'password'));
      const { user } = setup();
      await fillAndSubmit(user);
      expect(await screen.findByText('Use at least 8 characters for the password.')).toBeInTheDocument();
      expect(password()).toHaveAttribute('aria-invalid', 'true');
    });

    it('says a missing connection once, above the button, and lets you try again', async () => {
      api.signUpWithEmail.mockRejectedValueOnce(new AccountError('auth/network-request-failed', 'No connection. Check your internet and try again.'));
      const { user } = setup();
      await fillAndSubmit(user);

      expect(await screen.findByTestId('account-form-error')).toHaveTextContent('No connection');
      expect(screen.getByRole('button', { name: 'Create account', hidden: false })).toBeEnabled();
    });

    it('stops complaining about a field the moment it is being fixed', async () => {
      const { user } = setup();
      await user.click(form('sign-up').getByRole('button', { name: 'Create account' }));
      expect(screen.getByText('Choose a username.')).toBeInTheDocument();
      await user.type(username(), 'a');
      expect(screen.queryByText('Choose a username.')).toBeNull();
    });

    it('when the account was made but the name was lost, asks for another name, not the whole form again', async () => {
      api.signUpWithEmail.mockRejectedValue(new UsernameMissingError(new AccountError('username-taken', 'That username is taken.', 'username')));
      const { user, onClose } = setup();
      await fillAndSubmit(user);

      expect(await screen.findByTestId('account-form-username')).toBeInTheDocument();
      expect(title()).toHaveTextContent('Pick a username');
      expect(screen.getByText('That username is taken.')).toBeInTheDocument();
      expect(username()).toHaveValue('ada_l');
      expect(screen.queryByLabelText('Password', { selector: 'input' })).toBeNull();
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});

describe('the terms line', () => {
  const TERMS = 'https://guitar-rot.vercel.app/terms.html';
  const PRIVACY = 'https://guitar-rot.vercel.app/privacy.html';

  it('says what making an account means, with the Terms and the Privacy policy linked', () => {
    setup();
    const line = screen.getByTestId('account-terms');
    expect(line).toHaveTextContent('By creating an account you agree to the Terms and the Privacy policy.');
    expect(within(line).getByRole('link', { name: 'Terms' })).toHaveAttribute('href', TERMS);
    expect(within(line).getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', PRIVACY);
  });

  it('opens both outside the app, the way Settings opens the privacy policy', () => {
    setup();
    for (const link of within(screen.getByTestId('account-terms')).getAllByRole('link')) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    }
  });

  it('sits right under "Create account", above the switch to sign in', () => {
    setup();
    const create = screen.getByRole('button', { name: 'Create account' });
    const line = screen.getByTestId('account-terms');
    const switchLine = screen.getByText('Already have an account?');
    expect(create.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(line.compareDocumentPosition(switchLine) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Together they are one area, kept on screen when the fields are taller than the sheet (360x640).
    const actions = screen.getByTestId('account-actions');
    expect(actions).toContainElement(create);
    expect(actions).toContainElement(line);
    expect(actions.className).toContain('sticky');
  });

  it('keeps "Create account" a submit button of the form, so Enter still creates the account', () => {
    setup();
    const create = screen.getByRole('button', { name: 'Create account' });
    expect(create).toHaveAttribute('type', 'submit');
    expect(screen.getByTestId('account-form-sign-up')).toContainElement(create);
  });

  it('keeps a message about the whole form (no connection) in the same area as the button', async () => {
    api.signUpWithEmail.mockRejectedValueOnce(new AccountError('auth/network-request-failed', 'No connection. Check your internet and try again.'));
    const { user } = setup();
    await user.type(username(), 'ada_l');
    await user.type(email(), 'ada@example.com');
    await user.type(password(), 'secret12');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    const actions = screen.getByTestId('account-actions');
    expect(await within(actions).findByTestId('account-form-error')).toHaveTextContent('No connection');
  });

  it('is there in the one-time offer too, where Google and Apple make the account', () => {
    setup({ intent: 'nudge' });
    const line = screen.getByTestId('account-terms');
    expect(line).toHaveTextContent('By creating an account you agree to the Terms and the Privacy policy.');
    const notNow = screen.getByRole('button', { name: 'Not now' });
    expect(line.compareDocumentPosition(notNow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('is not shown to somebody who is only signing in, or choosing a username', () => {
    const signIn = setup({ intent: 'sign-in' });
    expect(screen.queryByTestId('account-terms')).toBeNull();
    signIn.rerender({ intent: 'username', account: SIGNED_IN });
    expect(screen.queryByTestId('account-terms')).toBeNull();
  });
});

describe('the username field', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));

  it('lowercases as you type, and starts with the shape of a username', () => {
    setup();
    expect(username()).toHaveAccessibleDescription('3 to 20 letters, numbers, . or _');
    fireEvent.change(username(), { target: { value: 'ADA_L' } });
    expect(username()).toHaveValue('ada_l');
  });

  it('asks the server only once typing has paused, then says Available', async () => {
    setup();
    fireEvent.change(username(), { target: { value: 'ada' } });
    fireEvent.change(username(), { target: { value: 'ada_' } });
    fireEvent.change(username(), { target: { value: 'ada_l' } });
    expect(username()).toHaveAccessibleDescription('Checking…');
    expect(usernames.checkUsername).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHECK_DELAY_MS + 10);
    });
    expect(usernames.checkUsername).toHaveBeenCalledTimes(1);
    expect(usernames.checkUsername).toHaveBeenCalledWith('ada_l', undefined);
    expect(username()).toHaveAccessibleDescription('Available');
    expect(screen.getByText('Available').className).toContain('text-good');
    expect(username()).not.toHaveAttribute('aria-invalid');
  });

  it('says Taken, offers free names close to it, and takes one when it is tapped', async () => {
    vi.mocked(usernames.checkUsername).mockImplementation(async (handle) => (handle === 'ada' ? 'taken' : 'available'));
    vi.mocked(usernames.freeUsernames).mockResolvedValue(['ada42', 'ada_7', 'ada123']);
    setup();
    await typeUsername('ada');

    expect(username()).toHaveAccessibleDescription('Taken');
    expect(username()).toHaveAttribute('aria-invalid', 'true');
    const suggestions = within(screen.getByTestId('username-suggestions'));
    expect(suggestions.getAllByRole('button').map((button) => button.textContent)).toEqual(['ada42', 'ada_7', 'ada123']);

    fireEvent.click(suggestions.getByRole('button', { name: 'ada42' }));
    expect(username()).toHaveValue('ada42');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHECK_DELAY_MS + 10);
    });
    expect(username()).toHaveAccessibleDescription('Available');
    expect(screen.queryByTestId('username-suggestions')).toBeNull();
  });

  it('does not ask the server about a name that cannot be one, and says why in time', async () => {
    setup();
    await typeUsername('ab');
    expect(username()).toHaveAccessibleDescription('Use at least 3 characters.');
    // On its way to three characters is not a mistake yet.
    expect(username()).not.toHaveAttribute('aria-invalid');

    await typeUsername('ada l');
    expect(username()).toHaveAccessibleDescription('Use letters, numbers, . and _ only.');
    expect(username()).toHaveAttribute('aria-invalid', 'true');
    expect(usernames.checkUsername).not.toHaveBeenCalled();
  });

  it('ignores the answer to something that has been typed over since', async () => {
    let answerFirst: (state: 'taken') => void = () => undefined;
    vi.mocked(usernames.checkUsername)
      .mockImplementationOnce(() => new Promise((resolve) => (answerFirst = resolve as (state: 'taken') => void)))
      .mockResolvedValue('available');
    setup();
    fireEvent.change(username(), { target: { value: 'ada' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CHECK_DELAY_MS + 10);
    });
    await typeUsername('adam');
    expect(username()).toHaveAccessibleDescription('Available');

    await act(async () => answerFirst('taken'));
    expect(username()).toHaveAccessibleDescription('Available');
  });

  it('says it could not check when the server can not be reached, and still lets you go on', async () => {
    vi.mocked(usernames.checkUsername).mockRejectedValue(new Error('offline'));
    api.signUpWithEmail.mockResolvedValue(undefined);
    const { onClose } = setup();
    await typeUsername('ada_l');
    expect(username()).toHaveAccessibleDescription(/Can’t check right now/);

    fireEvent.change(email(), { target: { value: 'ada@example.com' } });
    fireEvent.change(password(), { target: { value: 'secret12' } });
    fireEvent.click(form('sign-up').getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(api.signUpWithEmail).toHaveBeenCalled());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('announces each answer politely, so a screen reader hears it', () => {
    setup();
    expect(document.querySelector('[aria-live="polite"]')).not.toBeNull();
  });
});

describe('Apple', () => {
  it('is not there unless the build turns it on', () => {
    setup();
    expect(screen.queryByTestId('apple-sign-in')).toBeNull();
    expect(screen.queryByText(/Apple/)).toBeNull();
  });

  it('sits right under Google, the same size, with Apple’s logo on a white button, when the build turns it on', () => {
    world.apple = true;
    setup();
    const google = screen.getByTestId('google-sign-in');
    const apple = screen.getByRole('button', { name: 'Continue with Apple' });
    expect(google.compareDocumentPosition(apple) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(apple.nextElementSibling).toBeNull();
    expect(apple.className).toContain('min-h-12');
    expect(google.className).toContain('min-h-12');
    expect(apple.className).toContain('bg-white');
    expect(apple.className).toContain('text-black');
    expect(apple.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(apple.querySelector('svg path')).not.toBeNull();
  });

  it('is on the sign-in and the "save your progress" screens too', async () => {
    world.apple = true;
    setup({ intent: 'sign-in' });
    expect(screen.getByRole('button', { name: 'Continue with Apple' })).toBeInTheDocument();
    cleanup();
    setup({ intent: 'nudge' });
    expect(screen.getByRole('button', { name: 'Continue with Apple' })).toBeInTheDocument();
  });

  it('signs in with Apple', async () => {
    world.apple = true;
    api.signInWithApple.mockResolvedValue(undefined);
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Continue with Apple' }));
    expect(api.signInWithApple).toHaveBeenCalledTimes(1);
    expect(api.signInWithGoogle).not.toHaveBeenCalled();
  });
});

describe('sign in', () => {
  it('asks for an email and a password, and has the way back to create one', () => {
    setup({ intent: 'sign-in' });
    expect(title()).toHaveTextContent('Sign in');
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Username')).toBeNull();
    expect(email()).toHaveAttribute('autocomplete', 'username');
    expect(password()).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByText('New here?')).toBeInTheDocument();
  });

  it('says what is missing under each field without asking Firebase', async () => {
    const { user } = setup({ intent: 'sign-in' });
    await user.click(form('sign-in').getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(email()).toHaveFocus();
    expect(api.signInWithEmail).not.toHaveBeenCalled();
  });

  it('does not hold an old password to the new minimum', async () => {
    api.signInWithEmail.mockResolvedValue(undefined);
    const { user } = setup({ intent: 'sign-in' });
    await user.type(email(), 'ada@example.com');
    await user.type(password(), '123456');
    await user.click(form('sign-in').getByRole('button', { name: 'Sign in' }));
    expect(api.signInWithEmail).toHaveBeenCalledWith({ email: 'ada@example.com', password: '123456' });
  });

  it('signs in, then closes once it knows they have a username', async () => {
    api.signInWithEmail.mockResolvedValue(undefined);
    const { user, onClose, rerender } = setup({ intent: 'sign-in' });
    await user.type(email(), 'ada@example.com');
    await user.type(password(), 'secret12');
    await user.click(form('sign-in').getByRole('button', { name: 'Sign in' }));
    await screen.findByTestId('account-finishing');
    expect(onClose).not.toHaveBeenCalled();

    rerender({ intent: 'sign-in', account: SIGNED_IN, profile: { status: 'ready', username: 'grace' } });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('says a wrong password under the password field', async () => {
    api.signInWithEmail.mockRejectedValue(new AccountError('auth/invalid-credential', 'That email and password don’t match. Check them and try again.', 'password'));
    const { user } = setup({ intent: 'sign-in' });
    await user.type(email(), 'ada@example.com');
    await user.type(password(), 'nope-nope');
    await user.click(form('sign-in').getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText(/don’t match/)).toBeInTheDocument();
    expect(password()).toHaveAttribute('aria-invalid', 'true');
  });

  it('resets a password: asks for the email, says what happens, and goes back', async () => {
    api.sendPasswordReset.mockResolvedValue(undefined);
    const { user } = setup({ intent: 'sign-in' });
    await user.click(screen.getByRole('button', { name: 'Forgot your password?' }));
    expect(title()).toHaveTextContent('Reset password');
    expect(screen.queryByLabelText('Password', { selector: 'input' })).toBeNull();

    await user.type(email(), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(api.sendPasswordReset).toHaveBeenCalledWith('ada@example.com');
    expect(await screen.findByTestId('reset-sent')).toHaveTextContent('ada@example.com');
    expect(title()).toHaveTextContent('Check your email');

    await user.click(screen.getByRole('button', { name: 'Back to sign in' }));
    expect(title()).toHaveTextContent('Sign in');
  });

  it('moves to create account with the link under the form', async () => {
    const { user } = setup({ intent: 'sign-in' });
    await user.click(screen.getByRole('button', { name: 'Create an account' }));
    expect(title()).toHaveTextContent('Create account');
    expect(username()).toBeInTheDocument();
  });
});

describe('Google, then the username step', () => {
  it('signs in with Google, and a person who already has a username is simply let in', async () => {
    api.signInWithGoogle.mockResolvedValue(undefined);
    const { user, onClose, rerender } = setup();
    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(api.signInWithGoogle).toHaveBeenCalledTimes(1);
    await screen.findByTestId('account-finishing');

    rerender({ account: SIGNED_IN, profile: { status: 'ready', username: 'grace' } });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('asks a new person for a username once, starting from their name, with one Continue', async () => {
    api.signInWithGoogle.mockResolvedValue(undefined);
    api.setUsername.mockResolvedValue(undefined);
    const { user, onClose, rerender } = setup();
    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));
    rerender({ account: SIGNED_IN, profile: { status: 'ready', username: null } });

    expect(await screen.findByTestId('account-form-username')).toBeInTheDocument();
    expect(title()).toHaveTextContent('Pick a username');
    expect(username()).toHaveValue('grace');
    expect(screen.queryByLabelText('Email')).toBeNull();
    expect(screen.queryByLabelText('Password', { selector: 'input' })).toBeNull();
    // No way to skip it from inside: one amber button, and the close button.
    expect(screen.queryByRole('button', { name: /skip|not now|later/i })).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(api.setUsername).toHaveBeenCalledWith('grace');
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('wants a valid, free username before it continues', async () => {
    api.signInWithGoogle.mockResolvedValue(undefined);
    const { user, rerender } = setup();
    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));
    rerender({ account: SIGNED_IN, profile: { status: 'ready', username: null } });
    await screen.findByTestId('account-form-username');

    await user.clear(username());
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Choose a username.')).toBeInTheDocument();
    await user.type(username(), 'x y');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Use letters, numbers, . and _ only.')).toBeInTheDocument();
    expect(api.setUsername).not.toHaveBeenCalled();
  });

  it('says a taken username under the field and lets them pick another', async () => {
    api.signInWithGoogle.mockResolvedValue(undefined);
    api.setUsername
      .mockRejectedValueOnce(new AccountError('username-taken', 'That username is taken.', 'username'))
      .mockResolvedValueOnce(undefined);
    const { user, onClose, rerender } = setup();
    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));
    rerender({ account: SIGNED_IN, profile: { status: 'ready', username: null } });
    await screen.findByTestId('account-form-username');

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('That username is taken.')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    await user.clear(username());
    await user.type(username(), 'grace_h');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(api.setUsername).toHaveBeenLastCalledWith('grace_h');
  });

  it('can be closed from the username step: they stay signed in, and nothing signs them out', async () => {
    api.signInWithGoogle.mockResolvedValue(undefined);
    const { user, onClose, rerender } = setup();
    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));
    rerender({ account: SIGNED_IN, profile: { status: 'ready', username: null } });
    await screen.findByTestId('account-form-username');

    await user.click(screen.getByRole('button', { name: 'Close sign in' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(api.signOut).not.toHaveBeenCalled();
    expect(api.setUsername).not.toHaveBeenCalled();
  });

  it('starts from a plain word when Google shared no usable name', async () => {
    api.signInWithGoogle.mockResolvedValue(undefined);
    const { user, rerender } = setup();
    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));
    rerender({ account: { status: 'signed-in', user: { ...GRACE, displayName: null, email: 'x@privaterelay.appleid.com' } }, profile: { status: 'ready', username: null } });
    await screen.findByTestId('account-form-username');
    expect(username()).toHaveValue('player');
  });

  it('says why Google did not work, but not when the window was only closed', async () => {
    api.signInWithGoogle
      .mockRejectedValueOnce(new AccountError('auth/popup-blocked', 'Your browser blocked the sign-in window. Allow pop-ups for this site, then try again.'))
      .mockRejectedValueOnce(new AccountError('cancelled', ''));
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(await screen.findByTestId('provider-error')).toHaveTextContent('blocked the sign-in window');

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));
    await waitFor(() => expect(api.signInWithGoogle).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByTestId('provider-error')).toBeNull());
  });

  it('lets a signed-in person with an unreachable profile go after a few seconds, rather than hanging', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    api.signInWithGoogle.mockResolvedValue(undefined);
    const { onClose, rerender } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    await act(async () => undefined);
    rerender({ account: SIGNED_IN, profile: UNKNOWN });

    expect(onClose).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FINISH_WAIT_MS + 50);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('the "save your progress" offer', () => {
  it('offers the same three ways in, and a quiet "Not now"', () => {
    world.apple = true;
    setup({ intent: 'nudge' });
    expect(title()).toHaveTextContent('Save your progress');
    expect(screen.getByText(NUDGE_TEXT)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with Apple' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with email' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Not now' })).toBeInTheDocument();
    // No form yet: the email way opens it.
    expect(screen.queryByLabelText('Email')).toBeNull();
    // Three equal ways, no amber among them.
    expect(screen.getAllByRole('button').filter((button) => button.className.includes('bg-accent'))).toEqual([]);
  });

  it('closes on "Not now"', async () => {
    const { user, onClose } = setup({ intent: 'nudge' });
    await user.click(screen.getByRole('button', { name: 'Not now' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens the create-account form from "Continue with email"', async () => {
    const { user } = setup({ intent: 'nudge' });
    await user.click(screen.getByRole('button', { name: 'Continue with email' }));
    expect(title()).toHaveTextContent('Create account');
    expect(username()).toBeInTheDocument();
  });

  it('has the sign-in way for somebody who already has an account', async () => {
    const { user } = setup({ intent: 'nudge' });
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(title()).toHaveTextContent('Sign in');
  });

  it('goes through Google like anywhere else', async () => {
    api.signInWithGoogle.mockResolvedValue(undefined);
    const { user, rerender } = setup({ intent: 'nudge' });
    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));
    rerender({ intent: 'nudge', account: SIGNED_IN, profile: { status: 'ready', username: null } });
    expect(await screen.findByTestId('account-form-username')).toBeInTheDocument();
  });
});

describe('the username steps', () => {
  it('"Pick a username" starts from the person’s name', () => {
    setup({ intent: 'username', account: SIGNED_IN, profile: { status: 'ready', username: null } });
    expect(title()).toHaveTextContent('Pick a username');
    expect(username()).toHaveValue('grace');
  });

  it('"Change username" starts from the current one, and tells you the old one is freed', async () => {
    api.setUsername.mockResolvedValue(undefined);
    vi.mocked(usernames.checkUsername).mockResolvedValue('yours');
    const { user, onClose } = setup({ intent: 'change-username', account: SIGNED_IN, profile: { status: 'ready', username: 'grace_h' } });
    expect(title()).toHaveTextContent('Change username');
    expect(username()).toHaveValue('grace_h');
    expect(screen.getByText('Your old username is freed as soon as you save.')).toBeInTheDocument();

    await user.clear(username());
    await user.type(username(), 'amazing_grace');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(api.setUsername).toHaveBeenCalledWith('amazing_grace');
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('checks the current username against the person, so their own does not read as taken', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setup({ intent: 'change-username', account: SIGNED_IN, profile: { status: 'ready', username: 'grace_h' } });
    act(() => {
      vi.advanceTimersByTime(CHECK_DELAY_MS + 10);
    });
    expect(usernames.checkUsername).toHaveBeenCalledWith('grace_h', 'u1');
  });
});

describe('opening it', () => {
  it('starts afresh each time: the right first view, no old complaints, no password left over', async () => {
    const { user, onClose, rerender } = setup({ intent: 'sign-up' });
    await user.type(username(), 'ada_l');
    await user.type(email(), 'ada@example.com');
    await user.type(password(), 'secret12');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(title()).toHaveTextContent('Sign in');

    rerender({ intent: null });
    rerender({ intent: 'sign-up' });
    expect(title()).toHaveTextContent('Create account');
    expect(password()).toHaveValue('');
    // The email stays: somebody who closed it by accident should not have to type it again.
    expect(email()).toHaveValue('ada@example.com');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('is not on screen at all when closed', () => {
    setup({ intent: null });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
