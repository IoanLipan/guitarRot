import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AccountContext } from '@/cloud/AccountProvider';
import type { AccountApi, AccountUser } from '@/cloud/types';
import { emptyProgressState, type ProgressState } from '@/progress';
import type { BoardEntry } from './model';
import type { OwnEntry } from './service';
import { COLLAPSED_ROWS } from './BoardView';
import { FETCH_TIMEOUT_MS } from './useBoard';
import { LEAVE_TITLE, LeaderboardSection } from './LeaderboardSection';
import { isoWeekKey } from './week';

vi.mock('@/app/haptics', () => ({ tapHaptic: vi.fn() }));

const world = vi.hoisted(() => ({
  push: null as null | ((own: OwnEntry) => void),
  onError: null as null | ((error: unknown) => void),
  watched: [] as string[],
  boards: { week: [] as BoardEntry[], all: [] as BoardEntry[] },
  ranks: { week: 0, all: 0 },
  fetchError: null as unknown,
  /** When set, the next fetch waits for the test to let it go. */
  hold: null as null | Promise<void>,
}));

vi.mock('./service', () => {
  class OfflineError extends Error {}
  return {
    OfflineError,
    watchOwnEntry: vi.fn((uid: string, onChange: (own: OwnEntry) => void, onError: (error: unknown) => void) => {
      world.watched.push(uid);
      world.push = onChange;
      world.onError = onError;
      return () => {};
    }),
    joinBoard: vi.fn(() => Promise.resolve()),
    renameEntry: vi.fn(() => Promise.resolve()),
    removeEntry: vi.fn(() => Promise.resolve()),
    fetchBoard: vi.fn(async (kind: 'week' | 'all') => {
      if (world.hold !== null) await world.hold;
      if (world.fetchError !== null) throw world.fetchError;
      return world.boards[kind];
    }),
    fetchRank: vi.fn(async (kind: 'week' | 'all') => world.ranks[kind]),
  };
});
const service = await import('./service');

const THIS_WEEK = isoWeekKey(new Date());
const USER: AccountUser = { uid: 'me', email: 'ada.lovelace@example.com', displayName: 'Ada Lovelace', providers: ['password'], emailVerified: true };
const actions = {
  signUpWithEmail: vi.fn(),
  signInWithEmail: vi.fn(),
  sendPasswordReset: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  deleteAccount: vi.fn(),
};
const account = (over: Partial<AccountApi>) => ({ status: 'signed-in', user: USER, ...actions, ...over }) as AccountApi;

const entry = (uid: string, name: string, over: Partial<BoardEntry> = {}): BoardEntry => ({
  uid,
  name,
  level: 3,
  xp: 340,
  weekKey: THIS_WEEK,
  weekXp: 40,
  instrument: 'guitar',
  ...over,
});
const ME = entry('me', 'Ada', { xp: 340, weekXp: 40, level: 3 });

function progressWith(xp = 340, instrument: 'guitar' | 'ukulele' = 'guitar') {
  const state: ProgressState = emptyProgressState();
  state.xp = xp;
  state.settings = { ...state.settings, instrument };
  return { state };
}

function renderSection(api?: AccountApi, progress = progressWith()) {
  const ui = (children: ReactNode) => (api === undefined ? children : <AccountContext.Provider value={api}>{children}</AccountContext.Provider>);
  return render(ui(<LeaderboardSection progress={progress} />));
}

const show = (own: OwnEntry) => act(() => world.push?.(own));
const joinedAs = (me: BoardEntry = ME, pending = false) => show({ entry: me, pending });
const board = () => screen.getByTestId('leaderboard');
const rowIds = () => within(screen.getByTestId('lb-list')).getAllByRole('listitem').map((li) => li.getAttribute('data-testid'));

function setOnline(online: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => online });
  act(() => {
    window.dispatchEvent(new Event(online ? 'online' : 'offline'));
  });
}

beforeEach(() => {
  world.push = null;
  world.onError = null;
  world.watched = [];
  world.boards = { week: [], all: [] };
  world.ranks = { week: 0, all: 0 };
  world.fetchError = null;
  world.hold = null;
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
});
afterEach(() => cleanup());

describe('where there are no accounts', () => {
  it('renders nothing, and asks Firestore for nothing', () => {
    const { container } = renderSection();
    expect(container).toBeEmptyDOMElement();
    expect(world.watched).toEqual([]);
  });

  it('is the same when the account provider says the build has none', () => {
    const { container } = renderSection(account({ status: 'disabled', user: null }));
    expect(container).toBeEmptyDOMElement();
  });
});

describe('signed out', () => {
  it('says what it is in one line and points at the Account card', () => {
    renderSection(account({ status: 'signed-out', user: null }));
    expect(board()).toHaveAttribute('data-state', 'signed-out');
    expect(screen.getByRole('heading', { name: 'Leaderboard' })).toBeInTheDocument();
    expect(board()).toHaveTextContent('Sign in to see how you rank against other players.');
    expect(world.watched).toEqual([]);
  });

  it('takes you to the Account card, and puts focus on its first button', () => {
    const scroll = vi.fn();
    render(
      <>
        <section aria-label="Account">
          <button type="button">Continue with Google</button>
        </section>
        <AccountContext.Provider value={account({ status: 'signed-out', user: null })}>
          <LeaderboardSection progress={progressWith()} />
        </AccountContext.Provider>
      </>,
    );
    const card = screen.getByRole('region', { name: 'Account' });
    card.scrollIntoView = scroll;

    fireEvent.click(screen.getByTestId('lb-sign-in'));

    expect(scroll).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toHaveFocus();
  });

  it('is a quiet placeholder while the account is still being checked', () => {
    renderSection(account({ status: 'loading', user: null }));
    expect(board()).toHaveAttribute('data-state', 'loading');
    expect(screen.getByRole('status')).toHaveTextContent('Checking your account');
  });
});

describe('signed in, not on the board', () => {
  it('waits for the row to arrive', () => {
    renderSection(account({}));
    expect(world.watched).toEqual(['me']);
    expect(board()).toHaveAttribute('data-state', 'loading');
    expect(screen.queryByTestId('lb-join')).toBeNull();
  });

  it('offers to join, with the name prefilled from the first name', async () => {
    renderSection(account({}));
    show({ entry: null, pending: false });

    expect(board()).toHaveAttribute('data-state', 'not-joined');
    expect(screen.getByLabelText('Name on the board')).toHaveValue('Ada');
    expect(screen.getByTestId('lb-join')).toHaveTextContent('your email never does');
    expect(screen.getByRole('button', { name: 'Show me on the leaderboard' })).toBeInTheDocument();
    // The email is never on screen.
    expect(board()).not.toHaveTextContent('ada.lovelace');
  });

  it('prefills from the start of the email when there is no name, and never the whole address', () => {
    renderSection(account({ user: { ...USER, displayName: null, email: 'grace.hopper@example.com' } }));
    show({ entry: null, pending: false });
    expect(screen.getByLabelText('Name on the board')).toHaveValue('grace.hopper');
  });

  it('joins with the chosen name, the XP they have and the instrument they are learning', async () => {
    renderSection(account({}), progressWith(1240, 'ukulele'));
    show({ entry: null, pending: false });

    fireEvent.change(screen.getByLabelText('Name on the board'), { target: { value: '  Ada   L  ' } });
    fireEvent.click(screen.getByTestId('lb-join-button'));

    expect(service.joinBoard).toHaveBeenCalledWith('me', { name: '  Ada   L  ', xp: 1240, instrument: 'ukulele' });
    expect(screen.getByTestId('lb-join-button')).toBeDisabled();
  });

  it('says what is wrong with a name, under the field, and does not join', () => {
    renderSection(account({}));
    show({ entry: null, pending: false });
    const input = screen.getByLabelText('Name on the board');

    fireEvent.change(input, { target: { value: 'Al' } });
    fireEvent.click(screen.getByTestId('lb-join-button'));
    expect(input).toHaveAccessibleDescription('Use at least 3 characters.');

    fireEvent.change(input, { target: { value: 'me@example.com' } });
    fireEvent.click(screen.getByTestId('lb-join-button'));
    expect(input).toHaveAccessibleDescription(/Use letters, numbers, spaces/);

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByTestId('lb-join-button'));
    expect(input).toHaveAccessibleDescription('Choose a name to show.');

    expect(service.joinBoard).not.toHaveBeenCalled();
  });

  it('tells you when joining did not go through, and lets you try again', async () => {
    vi.mocked(service.joinBoard).mockRejectedValueOnce(new Error('permission-denied'));
    renderSection(account({}));
    show({ entry: null, pending: false });

    fireEvent.click(screen.getByTestId('lb-join-button'));
    expect(await screen.findByTestId('lb-join-error')).toHaveTextContent('couldn’t add you');
    expect(screen.getByTestId('lb-join-button')).toBeEnabled();
  });

  it('shows the board as soon as the row exists, before the server has it', async () => {
    renderSection(account({}));
    show({ entry: null, pending: false });
    fireEvent.click(screen.getByTestId('lb-join-button'));

    joinedAs(ME, true);
    expect(board()).toHaveAttribute('data-state', 'joined');
    // The lists are not asked for yet: they would leave the player out.
    expect(service.fetchBoard).not.toHaveBeenCalled();
    expect(screen.getByTestId('lb-loading')).toBeInTheDocument();

    joinedAs(ME, false);
    await waitFor(() => expect(service.fetchBoard).toHaveBeenCalledWith('week', THIS_WEEK));
  });
});

describe('on the board', () => {
  it('lists this week by default, ranked, with the player highlighted in place', async () => {
    world.boards.week = [entry('a', 'Grace', { level: 12, weekXp: 1240 }), ME, entry('c', 'Linus', { level: 1, weekXp: 5 })];
    renderSection(account({}));
    joinedAs();

    expect(await screen.findByTestId('lb-list')).toBeInTheDocument();
    expect(rowIds()).toEqual(['lb-row-a', 'lb-row-me', 'lb-row-c']);
    expect(screen.getByTestId('lb-row-a-rank')).toHaveTextContent('1');
    expect(screen.getByTestId('lb-row-a-name')).toHaveTextContent('Grace');
    expect(screen.getByTestId('lb-row-a')).toHaveTextContent('Level 12');
    expect(screen.getByTestId('lb-row-a-xp')).toHaveTextContent('1,240');
    expect(screen.getByTestId('lb-row-me-rank')).toHaveTextContent('2');
    expect(screen.getByTestId('lb-row-me')).toHaveAttribute('data-you', 'true');
    expect(screen.getByTestId('lb-row-me')).toHaveTextContent('You');
    // In the list, so not shown a second time at the bottom, and no count needed.
    expect(screen.queryByTestId('lb-own')).toBeNull();
    expect(service.fetchRank).not.toHaveBeenCalled();
  });

  it('gives players on the same XP the same place', async () => {
    world.boards.week = [entry('a', 'Grace', { weekXp: 90 }), entry('b', 'Alan', { weekXp: 40 }), ME];
    renderSection(account({}));
    joinedAs();
    await screen.findByTestId('lb-list');
    expect(['lb-row-a', 'lb-row-b', 'lb-row-me'].map((id) => screen.getByTestId(`${id}-rank`).textContent)).toEqual(['1', '2', '2']);
  });

  it('pins the player’s own row at the bottom, with a place counted on the server, when they are not in the list', async () => {
    world.boards.week = [entry('a', 'Grace', { weekXp: 90 }), entry('b', 'Alan', { weekXp: 80 })];
    world.ranks.week = 27;
    renderSection(account({}));
    joinedAs();

    const own = await screen.findByTestId('lb-own');
    expect(within(own).getByTestId('lb-own-row-rank')).toHaveTextContent('27');
    expect(within(own).getByTestId('lb-own-row-name')).toHaveTextContent('Ada');
    expect(within(own).getByTestId('lb-own-row-xp')).toHaveTextContent('40');
    expect(service.fetchRank).toHaveBeenCalledWith('week', THIS_WEEK, 40);
    // Last in the section's board, after the list.
    const list = screen.getByTestId('lb-list');
    expect(list.compareDocumentPosition(own) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('says "be the first" when nobody has earned XP this week, and shows no place for a player with none', async () => {
    renderSection(account({}), progressWith());
    joinedAs(entry('me', 'Ada', { weekXp: 0, weekKey: THIS_WEEK }));

    expect(await screen.findByTestId('lb-empty')).toHaveTextContent('Be the first this week');
    expect(screen.getByTestId('lb-own-row-rank')).toHaveTextContent('–');
    expect(screen.getByTestId('lb-own-note')).toBeInTheDocument();
    expect(service.fetchRank).not.toHaveBeenCalled();
  });

  it('counts a row from an earlier week as having no XP this week', async () => {
    world.boards.week = [entry('a', 'Grace', { weekXp: 90 })];
    renderSection(account({}));
    joinedAs(entry('me', 'Ada', { weekKey: '2020-W01', weekXp: 999 }));

    const own = await screen.findByTestId('lb-own');
    expect(within(own).getByTestId('lb-own-row-rank')).toHaveTextContent('–');
    expect(within(own).getByTestId('lb-own-row-xp')).toHaveTextContent('0');
  });

  it('switches to all time, which ranks by total XP', async () => {
    world.boards.week = [ME];
    world.boards.all = [entry('a', 'Grace', { xp: 9000, level: 14 }), ME];
    renderSection(account({}));
    joinedAs();
    await screen.findByTestId('lb-list');
    expect(screen.getByTestId('lb-tab-week')).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByTestId('lb-tab-all'));

    expect(screen.getByTestId('lb-tab-all')).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(rowIds()).toEqual(['lb-row-a', 'lb-row-me']));
    expect(service.fetchBoard).toHaveBeenCalledWith('all', THIS_WEEK);
    expect(screen.getByTestId('lb-row-a-xp')).toHaveTextContent('9,000');
    expect(screen.getByTestId('lb-row-me-xp')).toHaveTextContent('340');
  });

  it('moves between the tabs with the arrow keys', async () => {
    world.boards.week = [ME];
    renderSection(account({}));
    joinedAs();
    await screen.findByTestId('lb-list');

    fireEvent.keyDown(screen.getByTestId('lb-tab-week'), { key: 'ArrowRight' });
    expect(screen.getByTestId('lb-tab-all')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('lb-tab-all')).toHaveFocus();
    fireEvent.keyDown(screen.getByTestId('lb-tab-all'), { key: 'ArrowLeft' });
    expect(screen.getByTestId('lb-tab-week')).toHaveFocus();
  });

  it('shows a loading skeleton to start with, and tells a screen reader', async () => {
    let release = () => {};
    world.hold = new Promise<void>((resolve) => (release = resolve));
    world.boards.week = [ME];
    renderSection(account({}));
    joinedAs();

    const loading = screen.getByTestId('lb-loading');
    expect(loading).toHaveAttribute('aria-busy', 'true');
    expect(within(loading).getByRole('status')).toHaveTextContent('Loading the leaderboard');

    release();
    expect(await screen.findByTestId('lb-list')).toBeInTheDocument();
    expect(screen.queryByTestId('lb-loading')).toBeNull();
  });

  it('shows ten rows and offers the rest', async () => {
    world.boards.week = Array.from({ length: 25 }, (_, i) => entry(`p${i}`, `Player ${i + 1}`, { weekXp: 1000 - i }));
    world.ranks.week = 40;
    renderSection(account({}));
    joinedAs();
    await screen.findByTestId('lb-list');

    expect(rowIds()).toHaveLength(COLLAPSED_ROWS);
    expect(screen.getByTestId('lb-own')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('lb-more'));
    expect(rowIds()).toHaveLength(25);
    expect(screen.queryByTestId('lb-more')).toBeNull();
  });

  it('keeps showing the player pinned when they are in the list but not among the ten', async () => {
    world.boards.week = Array.from({ length: 25 }, (_, i) => entry(i === 14 ? 'me' : `p${i}`, i === 14 ? 'Ada' : `Player ${i + 1}`, { weekXp: 1000 - i }));
    renderSection(account({}), progressWith());
    joinedAs(entry('me', 'Ada', { weekXp: 1000 - 14 }));
    await screen.findByTestId('lb-list');

    expect(screen.queryByTestId('lb-row-me')).toBeNull();
    expect(screen.getByTestId('lb-own-row-rank')).toHaveTextContent('15');
    // No count was needed: the list already has the place.
    expect(service.fetchRank).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('lb-more'));
    expect(screen.getByTestId('lb-row-me')).toBeInTheDocument();
    expect(screen.queryByTestId('lb-own')).toBeNull();
  });

  it('gives every row a name a screen reader can read', async () => {
    world.boards.week = [entry('a', 'Grace', { weekXp: 90 }), ME];
    renderSection(account({}));
    joinedAs();
    await screen.findByTestId('lb-list');
    expect(screen.getByRole('list', { name: 'Top players this week' })).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: 'Leaderboard' })).toBeInTheDocument();
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });
});

describe('when the phone is offline', () => {
  it('does not offer to join: a row that is "not there" may just not be saved on this phone', () => {
    setOnline(false);
    renderSection(account({}));
    expect(board()).toHaveAttribute('data-state', 'offline');
    expect(board()).toHaveTextContent('You’re offline');
    expect(screen.queryByTestId('lb-join')).toBeNull();

    setOnline(true);
    show({ entry: null, pending: false });
    expect(board()).toHaveAttribute('data-state', 'not-joined');
  });

  it('says so in the board, without asking the server, and loads when it is back', async () => {
    world.boards.week = [ME];
    renderSection(account({}));
    joinedAs();
    await screen.findByTestId('lb-list');
    vi.mocked(service.fetchBoard).mockClear();
    cleanup();

    setOnline(false);
    renderSection(account({}));
    joinedAs();
    expect(screen.getByTestId('lb-offline')).toHaveAttribute('data-offline', 'true');
    expect(screen.getByTestId('lb-offline')).toHaveTextContent('You’re offline');
    expect(service.fetchBoard).not.toHaveBeenCalled();

    setOnline(true);
    expect(await screen.findByTestId('lb-list')).toBeInTheDocument();
  });

  it('keeps showing a list that has loaded when the connection drops', async () => {
    world.boards.week = [ME];
    renderSection(account({}));
    joinedAs();
    await screen.findByTestId('lb-list');
    setOnline(false);
    expect(screen.getByTestId('lb-list')).toBeInTheDocument();
    expect(screen.queryByTestId('lb-offline')).toBeNull();
  });

  it('calls a list that cannot be reached offline, and tries again on request', async () => {
    const { OfflineError } = service;
    world.fetchError = new OfflineError();
    renderSection(account({}));
    joinedAs();

    const notice = await screen.findByTestId('lb-offline');
    expect(notice).toHaveAttribute('data-offline', 'true');

    world.fetchError = null;
    world.boards.week = [ME];
    fireEvent.click(screen.getByTestId('lb-retry'));
    expect(await screen.findByTestId('lb-list')).toBeInTheDocument();
  });

  it('tells other failures apart from being offline', async () => {
    world.fetchError = new Error('permission-denied');
    renderSection(account({}));
    joinedAs();
    const notice = await screen.findByTestId('lb-offline');
    expect(notice).toHaveAttribute('data-offline', 'false');
    expect(notice).toHaveTextContent('Can’t load the leaderboard');
  });

  it('gives up on a list that never answers', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      world.hold = new Promise<void>(() => {});
      renderSection(account({}));
      joinedAs();
      expect(screen.getByTestId('lb-loading')).toBeInTheDocument();
      await act(() => vi.advanceTimersByTimeAsync(FETCH_TIMEOUT_MS + 10));
      expect(screen.getByTestId('lb-offline')).toHaveAttribute('data-offline', 'true');
    } finally {
      vi.useRealTimers();
    }
  });

  it('offers to try again when the row itself cannot be read', () => {
    renderSection(account({}));
    act(() => world.onError?.(new Error('permission-denied')));
    expect(board()).toHaveAttribute('data-state', 'error');
    fireEvent.click(screen.getByTestId('lb-retry'));
    expect(world.watched).toEqual(['me', 'me']);
    expect(board()).toHaveAttribute('data-state', 'loading');
  });
});

describe('renaming and leaving', () => {
  async function onTheBoard() {
    world.boards.week = [ME];
    renderSection(account({}));
    joinedAs();
    await screen.findByTestId('lb-list');
  }

  it('renames, after checking the new name', async () => {
    await onTheBoard();
    fireEvent.click(screen.getByTestId('lb-rename-open'));
    const input = screen.getByLabelText('Name on the board');
    expect(input).toHaveValue('Ada');

    fireEvent.change(input, { target: { value: 'x' } });
    fireEvent.click(screen.getByTestId('lb-rename-save'));
    expect(input).toHaveAccessibleDescription('Use at least 3 characters.');
    expect(service.renameEntry).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: 'Ada L' } });
    fireEvent.click(screen.getByTestId('lb-rename-save'));
    expect(service.renameEntry).toHaveBeenCalledWith('me', 'Ada L');
    expect(screen.queryByTestId('lb-rename')).toBeNull();
  });

  it('does not write when the name has not changed, and Cancel puts it back', async () => {
    await onTheBoard();
    fireEvent.click(screen.getByTestId('lb-rename-open'));
    fireEvent.click(screen.getByTestId('lb-rename-save'));
    expect(service.renameEntry).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('lb-rename-open'));
    fireEvent.change(screen.getByLabelText('Name on the board'), { target: { value: 'Different' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByTestId('lb-rename-open'));
    expect(screen.getByLabelText('Name on the board')).toHaveValue('Ada');
  });

  it('shows the new name once the row has it', async () => {
    await onTheBoard();
    world.boards.week = [{ ...ME, name: 'Countess' }];
    joinedAs({ ...ME, name: 'Countess' });
    await waitFor(() => expect(screen.getByTestId('lb-row-me-name')).toHaveTextContent('Countess'));
  });

  it('asks before leaving, then takes the player off the board', async () => {
    await onTheBoard();
    fireEvent.click(screen.getByTestId('lb-leave'));
    expect(screen.getByRole('alertdialog', { name: LEAVE_TITLE })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Stay on the board' }));
    expect(service.removeEntry).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('lb-leave'));
    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
    expect(service.removeEntry).toHaveBeenCalledWith('me');

    // Once the row is gone the join form is back.
    show({ entry: null, pending: false });
    expect(board()).toHaveAttribute('data-state', 'not-joined');
  });

  it('tells you when leaving did not go through', async () => {
    vi.mocked(service.removeEntry).mockRejectedValueOnce(new Error('unavailable'));
    await onTheBoard();
    fireEvent.click(screen.getByTestId('lb-leave'));
    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
    expect(await screen.findByTestId('lb-error')).toHaveTextContent('couldn’t take you off');
  });
});
