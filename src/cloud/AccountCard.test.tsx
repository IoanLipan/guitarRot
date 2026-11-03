import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountCard, DELETE_APPLE_NOTE, DELETE_BODY, DELETE_TITLE } from './AccountCard';
import { AccountContext } from './AccountProvider';
import { OpenAccountSheetProvider, type AccountSheetIntent } from './AccountSheetContext';
import { ProfileContext } from './ProfileProvider';
import { AccountError, type AccountApi, type AccountUser, type ProfileState } from './types';

const actions = {
  signUpWithEmail: vi.fn(),
  signInWithEmail: vi.fn(),
  sendPasswordReset: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithApple: vi.fn(),
  setUsername: vi.fn(),
  signOut: vi.fn(),
  deleteAccount: vi.fn(),
};

const ADA: AccountUser = {
  uid: 'u1',
  email: 'ada@example.com',
  displayName: 'Ada Lovelace',
  providers: ['password'],
  emailVerified: false,
};

function show(state: Partial<AccountApi>, open: (intent: AccountSheetIntent) => void = vi.fn(), profile: ProfileState = { status: 'unknown', username: null }) {
  render(
    <OpenAccountSheetProvider value={open}>
      <ProfileContext.Provider value={profile}>
        <AccountContext.Provider value={{ status: 'signed-out', user: null, ...actions, ...state } as AccountApi}>
          <AccountCard />
        </AccountContext.Provider>
      </ProfileContext.Provider>
    </OpenAccountSheetProvider>,
  );
  return userEvent.setup();
}

afterEach(() => {
  cleanup();
  for (const fn of Object.values(actions)) fn.mockReset();
});

describe('the account card', () => {
  describe('in a build without accounts', () => {
    it('is not there at all', () => {
      show({ status: 'disabled' });
      expect(screen.queryByTestId('account-card')).toBeNull();
      expect(document.body.textContent).toBe('');
    });
  });

  describe('while the account is being read from the device', () => {
    it('holds the signed-out card’s shape and tells a screen reader it is busy', () => {
      show({ status: 'loading' });
      const card = screen.getByTestId('account-card');
      expect(card).toHaveAttribute('aria-busy', 'true');
      expect(card).toHaveTextContent('Checking your account');
      expect(screen.queryByRole('button')).toBeNull();
    });
  });

  describe('signed out', () => {
    it('says why in one line, and offers to create an account or sign in', () => {
      show({ status: 'signed-out' });
      expect(screen.getByRole('region', { name: 'Account' })).toBeInTheDocument();
      expect(screen.getByText('Save your progress so it follows you to a new phone.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    });

    it('makes the account the one amber thing on the card, and keeps the other way in quiet', () => {
      show({ status: 'signed-out' });
      expect(screen.getByTestId('create-account').className).toContain('bg-accent');
      expect(screen.getByTestId('sign-in').className).not.toContain('bg-accent');
    });

    it('opens the account sheet on create account', async () => {
      const open = vi.fn();
      const user = show({ status: 'signed-out' }, open);
      await user.click(screen.getByRole('button', { name: 'Create account' }));
      expect(open).toHaveBeenCalledWith('sign-up');
    });

    it('opens the same sheet on sign in', async () => {
      const open = vi.fn();
      const user = show({ status: 'signed-out' }, open);
      await user.click(screen.getByRole('button', { name: 'Sign in' }));
      expect(open).toHaveBeenCalledWith('sign-in');
    });

    it('has no provider buttons of its own: Google and Apple live in the sheet', () => {
      show({ status: 'signed-out' });
      expect(screen.queryByTestId('google-sign-in')).toBeNull();
      expect(screen.queryByTestId('apple-sign-in')).toBeNull();
    });
  });

  describe('signed in', () => {
    it('shows the name and the email, and a mark for how they sign in', () => {
      show({ status: 'signed-in', user: ADA });
      expect(screen.getByTestId('account-name')).toHaveTextContent('Ada Lovelace');
      expect(screen.getByTestId('account-email')).toHaveTextContent('ada@example.com');
      expect(screen.getByRole('img', { name: 'Signed in with email' })).toHaveAttribute('data-provider', 'password');
      expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete account' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Create account' })).toBeNull();
    });

    it('marks a Google account with Google’s G, and shows its photo', () => {
      show({
        status: 'signed-in',
        user: { ...ADA, providers: ['google.com'], photoURL: 'https://example.com/ada.png' },
      });
      const mark = screen.getByRole('img', { name: 'Signed in with Google' });
      expect(mark).toHaveAttribute('data-provider', 'google');
      expect(mark.querySelector('svg')).not.toBeNull();
      expect(screen.getByTestId('account-card').querySelector('img')).toHaveAttribute('src', 'https://example.com/ada.png');
    });

    it('marks an Apple account with Apple’s logo', () => {
      show({ status: 'signed-in', user: { ...ADA, providers: ['apple.com'] } });
      const mark = screen.getByRole('img', { name: 'Signed in with Apple' });
      expect(mark).toHaveAttribute('data-provider', 'apple');
      expect(mark.querySelector('svg')).not.toBeNull();
    });

    it('goes by the username, not the name the provider gave', () => {
      show({ status: 'signed-in', user: ADA }, vi.fn(), { status: 'ready', username: 'ada_l' });
      expect(screen.getByTestId('account-name')).toHaveTextContent('ada_l');
      expect(screen.queryByTestId('pick-username')).toBeNull();
    });

    it('offers to change the username, in the same sheet', async () => {
      const open = vi.fn();
      const user = show({ status: 'signed-in', user: ADA }, open, { status: 'ready', username: 'ada_l' });
      await user.click(screen.getByRole('button', { name: 'Change username' }));
      expect(open).toHaveBeenCalledWith('change-username');
    });

    it('says "Pick a username" until a signed-in person has one, and opens the username step', async () => {
      const open = vi.fn();
      const user = show({ status: 'signed-in', user: ADA }, open, { status: 'ready', username: null });
      expect(screen.getByTestId('username-missing')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Change username' })).toBeNull();
      await user.click(screen.getByRole('button', { name: 'Pick a username' }));
      expect(open).toHaveBeenCalledWith('username');
    });

    it('does not nag while it can not tell whether there is a username (offline, nothing saved)', () => {
      show({ status: 'signed-in', user: ADA }, vi.fn(), { status: 'unknown', username: null });
      expect(screen.queryByTestId('username-missing')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Change username' })).toBeNull();
      expect(screen.getByTestId('account-name')).toHaveTextContent('Ada Lovelace');
    });

    it('goes by the start of the email when the account has no name', () => {
      show({ status: 'signed-in', user: { ...ADA, displayName: null } });
      expect(screen.getByTestId('account-name')).toHaveTextContent('ada');
    });

    it('signs out', async () => {
      actions.signOut.mockResolvedValue(undefined);
      const user = show({ status: 'signed-in', user: ADA });
      await user.click(screen.getByRole('button', { name: 'Sign out' }));
      expect(actions.signOut).toHaveBeenCalledTimes(1);
    });

    it('says why signing out failed', async () => {
      actions.signOut.mockRejectedValue(new AccountError('unknown', 'Something went wrong. Please try again.'));
      const user = show({ status: 'signed-in', user: ADA });
      await user.click(screen.getByRole('button', { name: 'Sign out' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
    });
  });

  describe('deleting the account', () => {
    it('asks first, and says exactly what goes and what stays', async () => {
      const user = show({ status: 'signed-in', user: ADA });
      await user.click(screen.getByTestId('delete-account'));

      const dialog = screen.getByRole('alertdialog', { name: 'Delete your account?' });
      expect(dialog).toHaveAccessibleDescription(DELETE_BODY);
      for (const part of [
        'permanently deletes your guitarRot account',
        'your name, email and sign-in',
        'everything saved in the cloud',
        'Progress on this phone stays',
        'can’t be undone',
      ]) {
        expect(dialog).toHaveTextContent(part);
      }
      expect(actions.deleteAccount).not.toHaveBeenCalled();
    });

    it('puts the safe answer first, with the cursor on it', async () => {
      const user = show({ status: 'signed-in', user: ADA });
      await user.click(screen.getByTestId('delete-account'));
      const keep = within(screen.getByTestId('confirm-dialog')).getByRole('button', { name: 'Keep my account' });
      expect(keep).toHaveFocus();
    });

    it('keeps the account, deleting nothing, when the person backs out', async () => {
      const user = show({ status: 'signed-in', user: ADA });
      await user.click(screen.getByTestId('delete-account'));
      await user.click(screen.getByRole('button', { name: 'Keep my account' }));
      expect(screen.queryByTestId('confirm-dialog')).toBeNull();
      expect(actions.deleteAccount).not.toHaveBeenCalled();
    });

    it('deletes when confirmed, and (once the account is gone) says so', async () => {
      actions.deleteAccount.mockResolvedValue(undefined);
      const view = (state: Partial<AccountApi>) => (
        <AccountContext.Provider value={{ status: 'signed-out', user: null, ...actions, ...state } as AccountApi}>
          <AccountCard />
        </AccountContext.Provider>
      );
      const { rerender } = render(view({ status: 'signed-in', user: ADA }));
      const user = userEvent.setup();

      await user.click(screen.getByTestId('delete-account'));
      await user.click(within(screen.getByTestId('confirm-dialog')).getByRole('button', { name: 'Delete account' }));
      expect(actions.deleteAccount).toHaveBeenCalledWith();

      // Firebase signs the user out as the account goes.
      rerender(view({ status: 'signed-out' }));
      expect(await screen.findByTestId('account-notice')).toHaveTextContent('Your account was deleted');
      expect(screen.getByTestId('account-notice')).toHaveTextContent('progress on this phone is untouched');
    });

    it('says why it could not delete, and the account stays', async () => {
      actions.deleteAccount.mockRejectedValue(
        new AccountError('cleanup-failed', 'We couldn’t remove your saved data, so your account was kept. Check your connection and try again.'),
      );
      const user = show({ status: 'signed-in', user: ADA });
      await user.click(screen.getByTestId('delete-account'));
      await user.click(within(screen.getByTestId('confirm-dialog')).getByRole('button', { name: 'Delete account' }));

      expect(await screen.findByTestId('account-error')).toHaveTextContent('your account was kept');
      expect(screen.getByTestId('account-name')).toBeInTheDocument();
    });

    it('tells an Apple account that Apple will ask first, and nobody else', async () => {
      const apple = userEvent.setup();
      const { unmount } = render(
        <AccountContext.Provider value={{ status: 'signed-in', user: { ...ADA, providers: ['apple.com'] }, ...actions } as AccountApi}>
          <AccountCard />
        </AccountContext.Provider>,
      );
      await apple.click(screen.getByTestId('delete-account'));
      expect(screen.getByRole('alertdialog', { name: DELETE_TITLE })).toHaveAccessibleDescription(DELETE_BODY + DELETE_APPLE_NOTE);
      expect(DELETE_APPLE_NOTE).toMatch(/Apple will ask you to confirm/);
      unmount();

      const user = show({ status: 'signed-in', user: ADA });
      await user.click(screen.getByTestId('delete-account'));
      expect(screen.getByRole('alertdialog', { name: DELETE_TITLE })).toHaveAccessibleDescription(DELETE_BODY);
    });

    it('says nothing when the person backs out of Apple’s sheet, and the account stays', async () => {
      actions.deleteAccount.mockRejectedValue(new AccountError('cancelled', ''));
      const user = show({ status: 'signed-in', user: { ...ADA, providers: ['apple.com'] } });
      await user.click(screen.getByTestId('delete-account'));
      await user.click(within(screen.getByTestId('confirm-dialog')).getByRole('button', { name: 'Delete account' }));

      expect(actions.deleteAccount).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('account-error')).toBeNull();
      expect(screen.getByTestId('account-name')).toBeInTheDocument();
    });

    it('asks a password account for its password when Firebase wants a fresh sign-in, then deletes with it', async () => {
      actions.deleteAccount
        .mockRejectedValueOnce(new AccountError('password-needed', 'Enter your password to confirm it’s you.', 'password'))
        .mockResolvedValueOnce(undefined);
      const user = show({ status: 'signed-in', user: ADA });
      await user.click(screen.getByTestId('delete-account'));
      await user.click(within(screen.getByTestId('confirm-dialog')).getByRole('button', { name: 'Delete account' }));

      const sheet = await screen.findByTestId('reauth-sheet');
      expect(within(sheet).getByRole('heading', { name: 'Confirm it’s you' })).toBeInTheDocument();
      const field = within(sheet).getByLabelText('Password', { selector: 'input' });
      expect(field).toHaveAttribute('autocomplete', 'current-password');

      await user.click(within(sheet).getByRole('button', { name: 'Delete my account' }));
      expect(within(sheet).getByText('Enter your password.')).toBeInTheDocument();
      expect(actions.deleteAccount).toHaveBeenCalledTimes(1);

      await user.type(field, 'secret12');
      await user.click(within(sheet).getByRole('button', { name: 'Delete my account' }));
      await waitFor(() => expect(actions.deleteAccount).toHaveBeenLastCalledWith({ password: 'secret12' }));
    });

    it('keeps the sheet open on a wrong password, with the reason under the field', async () => {
      actions.deleteAccount
        .mockRejectedValueOnce(new AccountError('password-needed', 'Enter your password to confirm it’s you.', 'password'))
        .mockRejectedValueOnce(new AccountError('auth/wrong-password', 'That password isn’t right. Try again, or reset it.', 'password'));
      const user = show({ status: 'signed-in', user: ADA });
      await user.click(screen.getByTestId('delete-account'));
      await user.click(within(screen.getByTestId('confirm-dialog')).getByRole('button', { name: 'Delete account' }));
      const sheet = await screen.findByTestId('reauth-sheet');

      await user.type(within(sheet).getByLabelText('Password', { selector: 'input' }), 'wrong');
      await user.click(within(sheet).getByRole('button', { name: 'Delete my account' }));

      expect(await within(sheet).findByText(/password isn’t right/)).toBeInTheDocument();
      expect(screen.getByTestId('reauth-sheet')).toBeInTheDocument();
    });
  });
});
