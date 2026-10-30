import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ACHIEVEMENTS, emptyProgressState, type ProgressState } from '@/progress';
import { midGameState, TODAY } from './testState';
import { lastSevenDays } from './StreakStrip';
import { YouTab } from './YouTab';

vi.mock('@/app/haptics', () => ({ tapHaptic: vi.fn() }));

/** Holds the open pick the way the app shell does. */
function Harness({ state, initial = null }: { state: ProgressState; initial?: string | null }) {
  const [open, setOpen] = useState<string | null>(initial);
  return <YouTab progress={{ state }} openPickId={open} onOpenPickChange={setOpen} today={TODAY} />;
}

describe('the You tab: where you stand', () => {
  it('shows the level, the rank, and the XP to the next one in plain words', () => {
    render(<Harness state={midGameState()} />);

    // 340 XP is level 3 (300 to 600): 40 into a band of 300.
    expect(screen.getByRole('img', { name: 'Level 3, Riff Apprentice' })).toBeInTheDocument();
    expect(screen.getByTestId('you-rank')).toHaveTextContent('Riff Apprentice');
    expect(screen.getByTestId('you-xp')).toHaveTextContent('40 of 300 XP to level 4');
    const bar = screen.getByRole('progressbar', { name: 'Progress to level 4' });
    expect(bar).toHaveAttribute('aria-valuenow', '13');
  });

  it('starts a new player at level 1, with nothing earned and nothing lit', () => {
    render(<Harness state={emptyProgressState()} />);

    expect(screen.getByTestId('you-rank')).toHaveTextContent('Bedroom Strummer');
    expect(screen.getByTestId('you-xp')).toHaveTextContent('0 of 100 XP to level 2');
    expect(screen.getByTestId('you-streak-days')).toHaveTextContent('0');
    expect(screen.getByText(/light the first dot/)).toBeInTheDocument();
    expect(screen.getByTestId('pick-count')).toHaveTextContent('0 of 25 earned');
    for (const difficulty of ['easy', 'medium', 'hard']) {
      expect(within(screen.getByTestId(`best-${difficulty}`)).getByText('Not played yet')).toBeInTheDocument();
    }
  });

  it('counts the days in a row, and the longest, beside each other', () => {
    render(<Harness state={midGameState()} />);

    expect(screen.getByTestId('you-streak-days')).toHaveTextContent('1');
    expect(screen.getByTestId('you-streak')).toHaveTextContent('day in a row');
    expect(screen.getByTestId('you-longest')).toHaveTextContent('Longest12 days');
  });

  it('does not show a streak that a missed day has already ended', () => {
    // The stored current stays at 5 until somebody practises again; on the 30th it is long over.
    const stale = midGameState({
      dayStreak: { current: 5, longest: 5, lastDate: '2026-10-27' },
      practiceDays: ['2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27'],
    });
    render(<Harness state={stale} />);

    expect(screen.getByTestId('you-streak-days')).toHaveTextContent('0');
    expect(screen.getByTestId('you-streak')).toHaveTextContent('days in a row');
    // The best one is still on the record.
    expect(screen.getByTestId('you-longest')).toHaveTextContent('5 days');
  });

  it('draws the last seven days as inlays: practised ones lit, a missed day dark, today ringed', () => {
    render(<Harness state={midGameState()} />);

    const days = lastSevenDays(TODAY);
    expect(days).toEqual([
      '2026-10-24',
      '2026-10-25',
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
    ]);
    const lit = days.map((day) => screen.getByTestId(`day-${day}`).getAttribute('data-lit'));
    // The 24th is before the first practice day, the 27th and 29th were missed.
    expect(lit).toEqual(['false', 'true', 'true', 'false', 'true', 'false', 'true']);
    expect(screen.getByTestId(`day-${TODAY}`)).toHaveAttribute('data-today', 'true');
    expect(screen.getByTestId('day-2026-10-29')).toHaveAttribute('data-today', 'false');
    // Each says what it is without relying on its colour.
    expect(screen.getByTestId('day-2026-10-27')).toHaveAttribute('aria-label', 'Tue, not practised');
    expect(screen.getByTestId(`day-${TODAY}`)).toHaveAttribute('aria-label', 'Fri, today, practised');
  });

  it('shows the best answers in a row', () => {
    render(<Harness state={midGameState()} />);
    expect(screen.getByTestId('you-best-run')).toHaveTextContent('18');
  });

  it('lists the quiz bests: a score and its picks where played, and "Not played yet" where not', () => {
    render(<Harness state={midGameState()} />);

    const easy = screen.getByTestId('best-easy');
    expect(easy).toHaveTextContent('620');
    expect(within(easy).getByRole('img', { name: '3 of 3 picks' })).toBeInTheDocument();
    const medium = screen.getByTestId('best-medium');
    expect(medium).toHaveTextContent('340');
    expect(within(medium).getByRole('img', { name: '2 of 3 picks' })).toBeInTheDocument();
    expect(within(screen.getByTestId('best-hard')).getByText('Not played yet')).toBeInTheDocument();
  });
});

describe('the You tab: the pick case', () => {
  it('shows all 25 picks under a plain heading for each kind', () => {
    render(<Harness state={midGameState()} />);

    const case_ = screen.getByTestId('pick-case');
    expect(within(case_).getAllByRole('button')).toHaveLength(ACHIEVEMENTS.length);
    for (const heading of ['Learning', 'Quiz', 'Songs', 'Day streaks', 'Milestones']) {
      expect(within(case_).getByRole('heading', { name: heading })).toBeInTheDocument();
    }
    expect(screen.getByTestId('pick-count')).toHaveTextContent('4 of 25 earned');
    expect(screen.getByTestId('pick-group-songs')).toHaveTextContent('1 of 6');
  });

  it('strikes the earned ones in their material and smokes the rest', () => {
    render(<Harness state={midGameState()} />);

    const tierOf = (id: string) => screen.getByTestId(`pick-${id}`).querySelector('svg')?.getAttribute('data-tier');
    expect(tierOf('first-lesson')).toBe('celluloid');
    expect(tierOf('streak-25')).toBe('steel');
    expect(tierOf('days-30')).toBe('gold');
    expect(tierOf('streak-50')).toBe('locked');
    expect(tierOf('first-unit')).toBe('locked');
    expect(screen.getByTestId('pick-first-song')).toHaveAttribute('data-earned', 'true');
    expect(screen.getByTestId('pick-songs-5')).toHaveAttribute('data-earned', 'false');
  });

  it('names each pick for a screen reader, with how far along a locked one is', () => {
    render(<Harness state={midGameState()} />);

    expect(screen.getByRole('button', { name: 'First song, earned' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thirty songs, locked, 9 of 30' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fifteen songs, locked, 9 of 15' })).toBeInTheDocument();
    // An all-or-nothing one has no count to give.
    expect(screen.getByRole('button', { name: 'Flawless on hard, locked' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tuned up, locked' })).toBeInTheDocument();
  });

  it('opens an earned pick with the day it was earned', () => {
    render(<Harness state={midGameState()} />);

    fireEvent.click(screen.getByRole('button', { name: 'First song, earned' }));

    const sheet = screen.getByTestId('pick-sheet');
    expect(within(sheet).getByRole('heading', { name: 'First song' })).toBeInTheDocument();
    expect(sheet).toHaveTextContent('Play any song for 20 seconds.');
    expect(screen.getByTestId('pick-status')).toHaveTextContent('Earned 12 Oct 2026');
  });

  it('opens a locked pick with how to earn it and a bar of how far along you are', () => {
    render(<Harness state={midGameState()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Thirty songs, locked, 9 of 30' }));

    const sheet = screen.getByTestId('pick-sheet');
    expect(sheet).toHaveTextContent('Play 30 different songs.');
    expect(screen.getByTestId('pick-status')).toHaveTextContent('9 of 30 songs');
    const bar = within(sheet).getByRole('progressbar', { name: 'Progress: 9 of 30' });
    expect(bar).toHaveAttribute('aria-valuenow', '30');
  });

  it('says "Not earned yet" for a locked pick that has nothing to count', () => {
    render(<Harness state={midGameState()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tuned up, locked' }));

    expect(screen.getByTestId('pick-status')).toHaveTextContent('Not earned yet');
    expect(within(screen.getByTestId('pick-sheet')).queryByRole('progressbar')).toBeNull();
  });

  it('opens already pointing at a pick when the shell says so, and closes on Done', () => {
    render(<Harness state={midGameState()} initial="first-lesson" />);

    expect(screen.getByTestId('pick-sheet')).toHaveTextContent('First lesson');
    fireEvent.click(within(screen.getByTestId('pick-sheet')).getByRole('button', { name: 'Done' }));
    // The sheet slides away over a moment; with the shell's open id cleared it is on its way out.
    expect(screen.getByTestId('pick-sheet')).toHaveAttribute('data-state', 'closing');
  });

  it('closes on Escape', () => {
    render(<Harness state={midGameState()} initial="first-lesson" />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByTestId('pick-sheet')).toHaveAttribute('data-state', 'closing');
  });

  it('gives every pick a 44px target at the least', () => {
    render(<Harness state={midGameState()} />);
    for (const button of within(screen.getByTestId('pick-case')).getAllByRole('button')) {
      expect(button.className).toContain('min-h-[104px]');
    }
  });
});
