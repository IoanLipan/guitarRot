import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { midGameState, TODAY } from './testState';
import { LevelChip } from './LevelChip';
import { describeDifficulty } from '@/quiz/difficultyCopy';

vi.mock('@/app/haptics', () => ({ tapHaptic: vi.fn() }));

describe('LevelChip', () => {
  it('names the level and the days in a row, and what it opens', () => {
    render(<LevelChip state={midGameState()} onOpen={vi.fn()} today={TODAY} />);

    expect(screen.getByRole('button', { name: 'Level 3, 1 day in a row. Open your progress' })).toBeInTheDocument();
  });

  it('shows the level and the streak as numbers in the display face, with a pick and a flame', () => {
    render(<LevelChip state={midGameState({ xp: 1000, dayStreak: { current: 5, longest: 5, lastDate: TODAY } })} onOpen={vi.fn()} today={TODAY} />);

    const chip = screen.getByTestId('level-chip');
    // Level 5 is where the pick turns to steel.
    expect(chip.querySelector('svg[data-tier="steel"]')).not.toBeNull();
    expect([...chip.querySelectorAll('.font-display')].map((node) => node.textContent)).toEqual(['5', '5']);
    expect(chip.querySelectorAll('svg')).toHaveLength(2);
  });

  it('counts a streak the missed day has ended as zero, not as the number stored', () => {
    render(
      <LevelChip
        state={midGameState({ dayStreak: { current: 8, longest: 8, lastDate: '2026-10-26' } })}
        onOpen={vi.fn()}
        today={TODAY}
      />,
    );

    expect(screen.getByRole('button')).toHaveAccessibleName('Level 3, 0 days in a row. Open your progress');
  });

  it('is at least 44px tall, and opens the You tab when tapped', () => {
    const onOpen = vi.fn();
    render(<LevelChip state={midGameState()} onOpen={onOpen} today={TODAY} />);

    const chip = screen.getByRole('button');
    expect(chip.className).toContain('h-11');
    fireEvent.click(chip);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

describe('describeDifficulty', () => {
  it('says what each difficulty asks, from the profile the questions are made from', () => {
    expect(describeDifficulty('easy')).toBe('Natural notes on the first 3 frets, open chords');
    expect(describeDifficulty('medium')).toBe('Every note up to fret 7, open chords and sevenths');
    expect(describeDifficulty('hard')).toBe('Every note up to fret 12, every chord, 6 answers');
  });
});
