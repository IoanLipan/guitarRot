import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountCard, SYNC_TEXT } from './AccountCard';
import { AccountContext } from './AccountProvider';
import type { SyncStatus } from './sync';
import type { AccountApi, AccountUser } from './types';
import { SyncContext, type SyncApi } from './useCloudSync';

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

function show(sync: SyncApi | null, account: Partial<AccountApi> = { status: 'signed-in', user: ADA }) {
  const value = { status: 'signed-out', user: null, ...actions, ...account } as AccountApi;
  const card = (
    <AccountContext.Provider value={value}>
      <AccountCard />
    </AccountContext.Provider>
  );
  render(sync === null ? card : <SyncContext.Provider value={sync}>{card}</SyncContext.Provider>);
  return userEvent.setup();
}

const syncing = (status: SyncStatus | null, flush = vi.fn(() => Promise.resolve())): SyncApi => ({ status, flush });

afterEach(() => {
  cleanup();
  for (const fn of Object.values(actions)) fn.mockReset();
});

describe('the account card: how the saved progress stands', () => {
  it.each([
    ['synced', 'Saved to your account'],
    ['syncing', 'Saving…'],
    ['offline', 'Will save when you’re back online'],
    ['error', 'Couldn’t save to your account. We’ll keep trying.'],
  ] as const)('says %s in plain words', (status, words) => {
    show(syncing(status));
    expect(screen.getByTestId('sync-status')).toHaveTextContent(words);
    expect(screen.getByTestId('sync-status')).toHaveAttribute('data-sync', status);
    expect(SYNC_TEXT[status]).toBe(words);
  });

  it('is a quiet line in the card, not an alert', () => {
    show(syncing('offline'));
    const line = screen.getByTestId('sync-status');
    expect(line).toHaveAttribute('role', 'status');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByTestId('account-card')).toContainElement(line);
  });

  it('says nothing when nothing is syncing', () => {
    show(syncing(null));
    expect(screen.queryByTestId('sync-status')).toBeNull();
  });

  it('says nothing without a sync at all (the card on its own)', () => {
    show(null);
    expect(screen.queryByTestId('sync-status')).toBeNull();
  });

  it('says nothing when signed out', () => {
    show(syncing('synced'), { status: 'signed-out' });
    expect(screen.queryByTestId('sync-status')).toBeNull();
  });
});

describe('the account card: signing out', () => {
  it('sends what is still waiting before it signs out', async () => {
    const order: string[] = [];
    const flush = vi.fn(async () => {
      order.push('flush');
    });
    actions.signOut.mockImplementation(async () => {
      order.push('sign out');
    });
    const user = show(syncing('syncing', flush));

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(actions.signOut).toHaveBeenCalledTimes(1));
    expect(order).toEqual(['flush', 'sign out']);
  });

  it('still signs out when the flush fails', async () => {
    const flush = vi.fn(() => Promise.reject(new Error('no')));
    actions.signOut.mockResolvedValue(undefined);
    const user = show(syncing('error', flush));

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(actions.signOut).toHaveBeenCalledTimes(1));
  });
});
