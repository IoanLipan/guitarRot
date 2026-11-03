import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { BoardEntry } from './model';
import { BoardView, COLLAPSED_ROWS } from './BoardView';
import { HIDDEN_KEY } from './hidden';
import { isoWeekKey } from './week';

vi.mock('@/app/haptics', () => ({ tapHaptic: vi.fn() }));

const world = vi.hoisted(() => ({ rows: [] as unknown[] }));

vi.mock('./service', () => {
  class OfflineError extends Error {}
  return {
    OfflineError,
    fetchBoard: vi.fn(async () => world.rows),
    fetchRank: vi.fn(async () => 40),
  };
});

const THIS_WEEK = isoWeekKey(new Date());
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
const ME = entry('me', 'Ada', { weekXp: 50 });

const GRACE = entry('u-grace', 'Grace', { weekXp: 90, level: 12 });
const ALAN = entry('u-alan', 'Alan', { weekXp: 70 });

function renderBoard() {
  return render(<BoardView me={ME} settled weekKey={THIS_WEEK} />);
}

/** Rows come back best first, as the service returns them. */
function board(...rows: BoardEntry[]) {
  world.rows = rows;
}

const rowIds = () => within(screen.getByTestId('lb-list')).getAllByRole('listitem').map((li) => li.getAttribute('data-testid'));
const dotsOf = (uid: string) => screen.getByTestId(`lb-row-${uid}-more`);
const storedHidden = () => JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]') as string[];

beforeEach(() => {
  localStorage.clear();
  world.rows = [];
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
  // A mailto link has nowhere to go in jsdom; stopping the navigation keeps the test output quiet. React still hears the click.
  document.addEventListener('click', stopNavigation, true);
});
afterEach(() => {
  document.removeEventListener('click', stopNavigation, true);
  cleanup();
});
function stopNavigation(event: Event) {
  if (event.target instanceof Element && event.target.closest('a[href^="mailto:"]')) event.preventDefault();
}

describe('the dots on a row', () => {
  it('are on every other player, named for them, and not on the player’s own row', async () => {
    board(GRACE, ME, ALAN);
    renderBoard();
    await screen.findByTestId('lb-list');

    expect(dotsOf('u-grace')).toHaveAccessibleName('Report or hide Grace');
    expect(dotsOf('u-alan')).toHaveAccessibleName('Report or hide Alan');
    expect(screen.queryByTestId('lb-row-me-more')).toBeNull();
  });

  it('are not on the pinned row of the player’s own place either', async () => {
    board(GRACE, ALAN);
    renderBoard();
    const own = await screen.findByTestId('lb-own');
    expect(within(own).queryByRole('button')).toBeNull();
  });

  it('open a sheet about that player, with Report and Hide', async () => {
    board(GRACE, ME);
    renderBoard();
    await screen.findByTestId('lb-list');
    expect(screen.queryByTestId('player-sheet')).toBeNull();

    fireEvent.click(dotsOf('u-grace'));

    const sheet = screen.getByRole('dialog', { name: 'Report or hide a player' });
    expect(within(sheet).getByRole('heading', { name: 'Grace' })).toBeInTheDocument();
    expect(within(sheet).getByRole('link', { name: /Report this name/ })).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: /Hide this player/ })).toBeInTheDocument();
  });

  it('close without hiding anyone, and give the cursor back to the dots', async () => {
    board(GRACE, ME);
    renderBoard();
    await screen.findByTestId('lb-list');
    fireEvent.click(dotsOf('u-grace'));

    fireEvent.click(within(screen.getByTestId('player-sheet')).getByRole('button', { name: 'Close player options' }));

    await waitFor(() => expect(dotsOf('u-grace')).toHaveFocus());
    expect(screen.getByTestId('lb-row-u-grace')).toBeInTheDocument();
    expect(screen.queryByTestId('lb-hidden')).toBeNull();
    expect(localStorage.getItem(HIDDEN_KEY)).toBeNull();
  });
});

describe('Report', () => {
  it('is an email to us naming the name as shown and the player id', async () => {
    board(GRACE, ME);
    renderBoard();
    await screen.findByTestId('lb-list');
    fireEvent.click(dotsOf('u-grace'));

    const link = screen.getByTestId('player-report');
    const url = new URL(link.getAttribute('href') ?? '');
    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe('guitar.rot@proton.me');
    expect(url.searchParams.get('subject')).toBe('Report a guitarRot name');
    expect(url.searchParams.get('body')).toContain('Name shown: Grace');
    expect(url.searchParams.get('body')).toContain('Player id: u-grace');
  });

  it('also hides that player, on this phone', async () => {
    board(GRACE, ME, ALAN);
    renderBoard();
    await screen.findByTestId('lb-list');
    fireEvent.click(dotsOf('u-grace'));

    fireEvent.click(screen.getByTestId('player-report'));

    expect(screen.queryByTestId('lb-row-u-grace')).toBeNull();
    expect(storedHidden()).toEqual(['u-grace']);
    expect(screen.getByTestId('lb-hidden')).toHaveTextContent('1 player hidden.');
  });
});

describe('Hide', () => {
  it('takes the player off the board and remembers it', async () => {
    board(GRACE, ME, ALAN);
    renderBoard();
    await screen.findByTestId('lb-list');

    fireEvent.click(dotsOf('u-grace'));
    fireEvent.click(screen.getByTestId('player-hide'));

    expect(rowIds()).toEqual(['lb-row-me', 'lb-row-u-alan']);
    expect(storedHidden()).toEqual(['u-grace']);
  });

  it('keeps the rest of the board’s places true: nobody below moves up into the hidden player’s place', async () => {
    board(GRACE, ALAN, ME);
    renderBoard();
    await screen.findByTestId('lb-list');

    fireEvent.click(dotsOf('u-grace'));
    fireEvent.click(screen.getByTestId('player-hide'));

    expect(screen.getByTestId('lb-row-u-alan-rank')).toHaveTextContent('2');
    expect(screen.getByTestId('lb-row-me-rank')).toHaveTextContent('3');
  });

  it('says how many are hidden and brings them all back with Show them', async () => {
    board(GRACE, ALAN, ME);
    renderBoard();
    await screen.findByTestId('lb-list');
    expect(screen.queryByTestId('lb-hidden')).toBeNull();

    fireEvent.click(dotsOf('u-grace'));
    fireEvent.click(screen.getByTestId('player-hide'));
    fireEvent.click(dotsOf('u-alan'));
    fireEvent.click(screen.getByTestId('player-hide'));

    expect(screen.getByTestId('lb-hidden')).toHaveTextContent('2 players hidden.');
    expect(rowIds()).toEqual(['lb-row-me']);

    fireEvent.click(screen.getByRole('button', { name: 'Show them' }));

    expect(rowIds()).toEqual(['lb-row-u-grace', 'lb-row-u-alan', 'lb-row-me']);
    expect(screen.queryByTestId('lb-hidden')).toBeNull();
    expect(localStorage.getItem(HIDDEN_KEY)).toBeNull();
  });

  it('stays hidden when the board is opened again, on either list', async () => {
    board(GRACE, ME);
    const first = renderBoard();
    await screen.findByTestId('lb-list');
    fireEvent.click(dotsOf('u-grace'));
    fireEvent.click(screen.getByTestId('player-hide'));
    first.unmount();

    renderBoard();
    await screen.findByTestId('lb-list');
    expect(screen.queryByTestId('lb-row-u-grace')).toBeNull();
    expect(screen.getByTestId('lb-hidden')).toHaveTextContent('1 player hidden.');

    fireEvent.click(screen.getByTestId('lb-tab-all'));
    await waitFor(() => expect(screen.getByTestId('lb-list')).toBeInTheDocument());
    expect(screen.queryByTestId('lb-row-u-grace')).toBeNull();
  });

  it('hides players who were hidden before the board loaded', async () => {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(['u-alan']));
    board(GRACE, ALAN, ME);
    renderBoard();
    await screen.findByTestId('lb-list');
    expect(rowIds()).toEqual(['lb-row-u-grace', 'lb-row-me']);
  });

  it('lets the next players in when the first ten are thinned out', async () => {
    const many = Array.from({ length: 14 }, (_, i) => entry(`p${i}`, `Player ${i + 1}`, { weekXp: 1000 - i }));
    board(...many);
    renderBoard();
    await screen.findByTestId('lb-list');
    expect(rowIds()).toHaveLength(COLLAPSED_ROWS);
    expect(screen.queryByTestId('lb-row-p10')).toBeNull();

    fireEvent.click(dotsOf('p0'));
    fireEvent.click(screen.getByTestId('player-hide'));

    expect(rowIds()).toHaveLength(COLLAPSED_ROWS);
    expect(screen.getByTestId('lb-row-p10')).toBeInTheDocument();
    expect(screen.getByTestId('lb-more')).toHaveTextContent('Show 3 more');
  });

  it('says so when everyone on the list is hidden, rather than that nobody is here', async () => {
    board(GRACE);
    renderBoard();
    await screen.findByTestId('lb-list');
    fireEvent.click(dotsOf('u-grace'));
    fireEvent.click(screen.getByTestId('player-hide'));

    expect(screen.getByTestId('lb-empty')).toHaveTextContent('Everyone here is hidden');
    expect(screen.getByTestId('lb-hidden')).toBeInTheDocument();
  });

  it('never hides the player’s own row, even if their id is on the list', async () => {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(['me']));
    board(GRACE, ME);
    renderBoard();
    await screen.findByTestId('lb-list');
    expect(screen.getByTestId('lb-row-me')).toBeInTheDocument();
  });
});

describe('names the filter refuses', () => {
  it('are left off the board for everyone, including a row written before there was a filter', async () => {
    board(entry('u-bad', 'big.shithead', { weekXp: 99 }), GRACE, ME);
    renderBoard();
    await screen.findByTestId('lb-list');

    expect(screen.queryByTestId('lb-row-u-bad')).toBeNull();
    expect(rowIds()).toEqual(['lb-row-u-grace', 'lb-row-me']);
    // Nothing to undo: they were never one of the players this person hid.
    expect(screen.queryByTestId('lb-hidden')).toBeNull();
  });

  it('do not take the player’s own row off their screen', async () => {
    board(GRACE, entry('me', 'shithead', { weekXp: 50 }));
    render(<BoardView me={entry('me', 'shithead', { weekXp: 50 })} settled weekKey={THIS_WEEK} />);
    await screen.findByTestId('lb-list');
    expect(screen.getByTestId('lb-row-me')).toBeInTheDocument();
  });

  it('leave real names that contain a root alone', async () => {
    board(entry('u-k', 'Kinoshita'), entry('u-s', 'Scunthorpe'), ME);
    renderBoard();
    await screen.findByTestId('lb-list');
    expect(rowIds()).toEqual(['lb-row-u-k', 'lb-row-u-s', 'lb-row-me']);
  });
});
