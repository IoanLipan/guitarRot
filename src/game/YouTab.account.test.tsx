import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AccountContext } from '@/cloud/AccountProvider';
import type { AccountApi } from '@/cloud/types';
import { emptyProgressState } from '@/progress';
import { TODAY } from './testState';
import { YouTab } from './YouTab';

vi.mock('@/app/haptics', () => ({ tapHaptic: vi.fn() }));

const noop = vi.fn();
const api = {
  signUpWithEmail: noop,
  signInWithEmail: noop,
  sendPasswordReset: noop,
  signInWithGoogle: noop,
  signOut: noop,
  deleteAccount: noop,
};

function renderTab(account?: Partial<AccountApi>) {
  const tab = <YouTab progress={{ state: emptyProgressState() }} openPickId={null} onOpenPickChange={noop} today={TODAY} />;
  render(account === undefined ? tab : <AccountContext.Provider value={{ ...api, ...account } as AccountApi}>{tab}</AccountContext.Provider>);
}

afterEach(() => cleanup());

describe('the You tab and accounts', () => {
  it('has no account card without accounts', () => {
    renderTab();
    expect(screen.queryByTestId('account-card')).toBeNull();
    expect(screen.getByTestId('you-level')).toBeInTheDocument();
  });

  it('has no leaderboard without accounts', () => {
    renderTab();
    expect(screen.queryByTestId('leaderboard')).toBeNull();
  });

  it('puts the Leaderboard right under the Account card, before the streak', () => {
    renderTab({ status: 'signed-out', user: null });
    const card = screen.getByTestId('account-card');
    const board = screen.getByTestId('leaderboard');
    const streak = screen.getByTestId('you-streak');
    expect(card.compareDocumentPosition(board) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(board.compareDocumentPosition(streak) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(board).toHaveAttribute('data-state', 'signed-out');
  });

  it('puts the Account card right under the level, before the streak', () => {
    renderTab({ status: 'signed-out', user: null });
    const level = screen.getByTestId('you-level');
    const card = screen.getByTestId('account-card');
    const streak = screen.getByTestId('you-streak');
    expect(level.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(card.compareDocumentPosition(streak) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
