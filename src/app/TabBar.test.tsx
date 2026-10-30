import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TabBar } from './TabBar';

vi.mock('./haptics', () => ({ tapHaptic: vi.fn() }));

describe('TabBar', () => {
  it('lists the five tabs in order and marks the active one', () => {
    render(<TabBar active="songs" onChange={vi.fn()} />);

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Feed',
      'Songs',
      'Learn',
      'Quiz',
      'You',
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

  it('draws more than a bare square or circle on Feed, Quiz and You', () => {
    // Feed is a card with a play mark (and the next card behind it); Quiz is a
    // circled question mark; You is a guitar pick with a peak in it. Either
    // way, several shapes, not one.
    for (const name of ['Feed', 'Quiz', 'You']) {
      const icon = iconOf(name);
      expect(icon.children.length).toBeGreaterThanOrEqual(name === 'You' ? 2 : 3);
      cleanup();
    }
  });

  it('slides one indicator across five tabs, a fifth of the bar each', () => {
    render(<TabBar active="you" onChange={vi.fn()} />);

    const pill = screen.getByTestId('tab-indicator');
    expect(pill.className).toContain('w-1/5');
    expect(pill.style.transform).toBe('translateX(400%)');
  });

  it('keeps all five tabs at least 44px wide on the smallest phone, 320px across', () => {
    // 320 / 5 = 64px a tab; the bar must not give any of them a minimum that adds up past that.
    render(<TabBar active="feed" onChange={vi.fn()} />);
    for (const button of screen.getAllByRole('button')) {
      expect(button.className).toContain('flex-1');
      expect(button.className).not.toMatch(/\bmin-w-/);
    }
  });
});

function iconOf(name: string): SVGElement {
  render(<TabBar active="feed" onChange={vi.fn()} />);
  const svg = screen.getByRole('button', { name }).querySelector('svg');
  if (svg === null) throw new Error(`no icon on the ${name} tab`);
  return svg;
}
