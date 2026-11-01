import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountContext } from './AccountProvider';
import { EmailSheet } from './EmailSheet';
import { AccountError, type AccountApi } from './types';

const api = {
  signUpWithEmail: vi.fn(),
  signInWithEmail: vi.fn(),
  sendPasswordReset: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  deleteAccount: vi.fn(),
};

function setup(overrides: Partial<typeof api> = {}) {
  const onClose = vi.fn();
  Object.assign(api, overrides);
  render(
    <AccountContext.Provider value={{ status: 'signed-out', user: null, ...api } as AccountApi}>
      <EmailSheet open onClose={onClose} />
    </AccountContext.Provider>,
  );
  return { onClose, user: userEvent.setup() };
}

const email = () => screen.getByLabelText('Email');
const password = () => screen.getByLabelText('Password', { selector: 'input' });
const name = () => screen.getByLabelText('Name');
/** The form's own button: "Sign in" and "Create account" are also the names of the two mode tabs above it. */
const submit = (label: string) => within(screen.getByTestId('email-form')).getByRole('button', { name: label });

afterEach(() => {
  cleanup();
  for (const fn of Object.values(api)) fn.mockReset();
});

describe('the email sheet: sign in', () => {
  it('opens on sign in, as a dialog with a name, and asks for an email and a password', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'Sign in or create an account' })).toBeInTheDocument();
    expect(screen.getByTestId('email-sheet-title')).toHaveTextContent('Sign in');
    expect(screen.queryByLabelText('Name')).toBeNull();
    expect(screen.getByRole('button', { name: 'Sign in', pressed: true })).toBeInTheDocument();
  });

  it('uses the right kind of input for each field, so a phone offers the right keyboard and a password manager the right fill', () => {
    setup();
    expect(email()).toHaveAttribute('type', 'email');
    expect(email()).toHaveAttribute('inputmode', 'email');
    expect(email()).toHaveAttribute('autocomplete', 'username');
    expect(email()).toHaveAttribute('autocapitalize', 'none');
    expect(email()).toHaveAttribute('spellcheck', 'false');
    expect(password()).toHaveAttribute('type', 'password');
    expect(password()).toHaveAttribute('autocomplete', 'current-password');
  });

  it('sets its fields in 16px type, which keeps a phone from zooming the page on focus', () => {
    setup();
    for (const input of [email(), password()]) {
      expect(input.className).toContain('text-body');
      expect(input.className).not.toMatch(/text-(xs|sm|meta|label)\b/);
    }
  });

  it('says what is missing under each field, and puts the cursor on the first one, without asking Firebase', async () => {
    const { user } = setup();
    await user.click(submit('Sign in'));

    expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(email()).toHaveAttribute('aria-invalid', 'true');
    expect(email()).toHaveFocus();
    expect(api.signInWithEmail).not.toHaveBeenCalled();
  });

  it('ties each message to its field, so a screen reader reads it with the field', async () => {
    const { user } = setup();
    await user.type(email(), 'not-an-email');
    await user.click(submit('Sign in'));

    const message = screen.getByText('That doesn’t look like an email address.');
    expect(message).toHaveAttribute('role', 'alert');
    expect(email().getAttribute('aria-describedby')).toBe(message.id);
  });

  it('takes the complaint away as soon as the field is being fixed', async () => {
    const { user } = setup();
    await user.click(submit('Sign in'));
    expect(screen.getByText('Enter your email address.')).toBeInTheDocument();

    await user.type(email(), 'a');
    expect(screen.queryByText('Enter your email address.')).toBeNull();
    expect(email()).not.toHaveAttribute('aria-invalid');
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
  });

  it('signs in with what was typed, then closes', async () => {
    api.signInWithEmail.mockResolvedValue(undefined);
    const { user, onClose } = setup();
    await user.type(email(), 'ada@example.com');
    await user.type(password(), 'secret12');
    await user.click(submit('Sign in'));

    expect(api.signInWithEmail).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'secret12' });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('submits from the keyboard with Enter in the password field', async () => {
    api.signInWithEmail.mockResolvedValue(undefined);
    const { user } = setup();
    await user.type(email(), 'ada@example.com');
    await user.type(password(), 'secret12{Enter}');
    expect(api.signInWithEmail).toHaveBeenCalledTimes(1);
  });

  it('puts a wrong password under the password field, in plain words, and keeps the sheet open', async () => {
    api.signInWithEmail.mockRejectedValue(
      new AccountError('auth/invalid-credential', 'That email and password don’t match. Check them and try again.', 'password'),
    );
    const { user, onClose } = setup();
    await user.type(email(), 'ada@example.com');
    await user.type(password(), 'nope');
    await user.click(submit('Sign in'));

    expect(await screen.findByText(/don’t match/)).toBeInTheDocument();
    expect(password()).toHaveAttribute('aria-invalid', 'true');
    expect(password()).toHaveFocus();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows a failure that belongs to no field above the button', async () => {
    api.signInWithEmail.mockRejectedValue(new AccountError('auth/network-request-failed', 'No connection. Check your internet and try again.'));
    const { user } = setup();
    await user.type(email(), 'ada@example.com');
    await user.type(password(), 'secret12');
    await user.click(submit('Sign in'));

    expect(await screen.findByTestId('email-form-error')).toHaveTextContent('No connection');
  });

  it('is busy, and cannot be sent twice, while Firebase is answering', async () => {
    let finish: () => void = () => undefined;
    api.signInWithEmail.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    const { user } = setup();
    await user.type(email(), 'ada@example.com');
    await user.type(password(), 'secret12');
    await user.click(submit('Sign in'));

    const busy = screen.getByRole('button', { name: 'Signing in…' });
    expect(busy).toBeDisabled();
    fireEvent.submit(screen.getByTestId('email-form'));
    expect(api.signInWithEmail).toHaveBeenCalledTimes(1);

    await act(async () => finish());
  });

  it('can show the password, and hide it again', async () => {
    const { user } = setup();
    await user.type(password(), 'secret12');
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);
    expect(password()).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true');
    expect(password()).toHaveValue('secret12');

    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password()).toHaveAttribute('type', 'password');
  });

  it('closes from the close button and from Escape', async () => {
    const { user, onClose } = setup();
    await user.click(screen.getByRole('button', { name: 'Close sign in' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('the email sheet: create account', () => {
  async function toSignUp() {
    const view = setup();
    await view.user.click(screen.getByTestId('mode-sign-up'));
    return view;
  }

  it('asks for a name too, and a new password for the password manager to offer', async () => {
    await toSignUp();
    expect(screen.getByTestId('email-sheet-title')).toHaveTextContent('Create account');
    expect(name()).toHaveAttribute('autocomplete', 'name');
    expect(name()).toHaveAttribute('autocapitalize', 'words');
    expect(email()).toHaveAttribute('autocomplete', 'email');
    expect(password()).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByText('At least 6 characters.')).toBeInTheDocument();
  });

  it('wants a name, a real email and six characters', async () => {
    const { user } = await toSignUp();
    await user.type(email(), 'ada@nowhere');
    await user.type(password(), '12345');
    await user.click(submit('Create account'));

    expect(screen.getByText('Enter a name to go by.')).toBeInTheDocument();
    expect(screen.getByText('That doesn’t look like an email address.')).toBeInTheDocument();
    expect(screen.getByText('Use at least 6 characters.')).toBeInTheDocument();
    expect(name()).toHaveFocus();
    expect(api.signUpWithEmail).not.toHaveBeenCalled();
  });

  it('creates the account with the name, then closes', async () => {
    api.signUpWithEmail.mockResolvedValue(undefined);
    const { user, onClose } = await toSignUp();
    await user.type(name(), 'Ada Lovelace');
    await user.type(email(), 'ada@example.com');
    await user.type(password(), 'secret12');
    await user.click(submit('Create account'));

    expect(api.signUpWithEmail).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'secret12',
      displayName: 'Ada Lovelace',
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('says an address that already has an account under the email field', async () => {
    api.signUpWithEmail.mockRejectedValue(
      new AccountError('auth/email-already-in-use', 'That email already has an account. Sign in instead, or reset the password.', 'email'),
    );
    const { user } = await toSignUp();
    await user.type(name(), 'Ada');
    await user.type(email(), 'ada@example.com');
    await user.type(password(), 'secret12');
    await user.click(submit('Create account'));

    expect(await screen.findByText(/already has an account/)).toBeInTheDocument();
    expect(email()).toHaveAttribute('aria-invalid', 'true');
    expect(email()).toHaveFocus();
  });

  it('switches back to sign in, and drops what was complained about', async () => {
    const { user } = await toSignUp();
    await user.click(submit('Create account'));
    expect(screen.getByText('Enter a name to go by.')).toBeInTheDocument();

    await user.click(screen.getByTestId('mode-sign-in'));
    expect(screen.queryByText('Enter a name to go by.')).toBeNull();
    expect(screen.queryByLabelText('Name')).toBeNull();
  });
});

describe('the email sheet: forgot password', () => {
  async function toReset() {
    const view = setup();
    await view.user.click(screen.getByRole('button', { name: 'Forgot your password?' }));
    return view;
  }

  it('asks for the email alone', async () => {
    await toReset();
    expect(screen.getByTestId('email-sheet-title')).toHaveTextContent('Reset password');
    expect(email()).toBeInTheDocument();
    expect(screen.queryByLabelText('Password', { selector: 'input' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeInTheDocument();
  });

  it('sends the link, and answers the same whether or not the address has an account', async () => {
    api.sendPasswordReset.mockResolvedValue(undefined);
    const { user } = await toReset();
    await user.type(email(), 'ada@example.com');
    await user.click(submit('Send reset link'));

    expect(api.sendPasswordReset).toHaveBeenCalledWith('ada@example.com');
    const sent = await screen.findByTestId('reset-sent');
    expect(sent).toHaveTextContent('If there’s an account for ada@example.com');
    expect(screen.getByTestId('email-sheet-title')).toHaveTextContent('Check your email');
  });

  it('checks the address first', async () => {
    const { user } = await toReset();
    await user.type(email(), 'nope');
    await user.click(submit('Send reset link'));
    expect(screen.getByText('That doesn’t look like an email address.')).toBeInTheDocument();
    expect(api.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('goes back to sign in from either place', async () => {
    api.sendPasswordReset.mockResolvedValue(undefined);
    const { user } = await toReset();
    await user.click(screen.getByRole('button', { name: 'Back to sign in' }));
    expect(screen.getByTestId('email-sheet-title')).toHaveTextContent('Sign in');
  });
});

describe('the email sheet, opened again', () => {
  it('starts fresh: sign in, no complaints, no password left over, but the email kept', async () => {
    const onClose = vi.fn();
    const tree = (open: boolean) => (
      <AccountContext.Provider value={{ status: 'signed-out', user: null, ...api } as AccountApi}>
        <EmailSheet open={open} onClose={onClose} />
      </AccountContext.Provider>
    );
    const view = render(tree(true));
    const user = userEvent.setup();
    await user.click(screen.getByTestId('mode-sign-up'));
    await user.type(email(), 'ada@example.com');
    await user.type(password(), 'secret12');
    await user.click(submit('Create account'));
    expect(screen.getByText('Enter a name to go by.')).toBeInTheDocument();

    view.rerender(tree(false));
    view.rerender(tree(true));

    expect(screen.getByTestId('email-sheet-title')).toHaveTextContent('Sign in');
    expect(screen.queryByText('Enter a name to go by.')).toBeNull();
    expect(password()).toHaveValue('');
    expect(email()).toHaveValue('ada@example.com');
  });
});
