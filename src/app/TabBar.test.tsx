import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TabBar } from './TabBar';

vi.mock('./haptics', () => ({ tapHaptic: vi.fn() }));

describe('TabBar', () => {
  it('lists the four tabs in order and marks the active one', () => {
    render(<TabBar active="songs" onChange={vi.fn()} />);

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Feed',
      'Songs',
      'Learn',
      'Quiz',
    ]);
    expect(screen.getByRole('button', { name: 'Songs' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Feed' })).not.toHaveAttribute('aria-current');
  });

  it('reports the tab that was tapped', () => {
    const onChange = vi.fn();
    render(<TabBar active="feed" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Quiz' }));

    expect(onChange).toHaveBeenCalledWith('quiz');
  });

  it('draws more than a bare square or circle on Feed and Quiz', () => {
    // Feed is a card with a play mark (and the next card behind it); Quiz is a
    // circled question mark. Either way, several shapes, not one.
    for (const name of ['Feed', 'Quiz']) {
      const icon = iconOf(name);
      expect(icon.children.length).toBeGreaterThanOrEqual(3);
      cleanup();
    }
  });
});

function iconOf(name: string): SVGElement {
  render(<TabBar active="feed" onChange={vi.fn()} />);
  const svg = screen.getByRole('button', { name }).querySelector('svg');
  if (svg === null) throw new Error(`no icon on the ${name} tab`);
  return svg;
}
