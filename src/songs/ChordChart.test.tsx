import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { SongChart } from '@/content';
import { ChordChart } from './ChordChart';

// "-" is a hold: the bar keeps the chord of the one before it.
const chart: SongChart = {
  sections: [
    { label: 'Verse', bars: ['Am', '-', 'C', 'G'] },
    { label: 'Chorus', bars: ['G', '-'] },
  ],
} as unknown as SongChart;

describe('ChordChart', () => {
  it('names each bar for a reader: its number and its chord', () => {
    render(<ChordChart chart={chart} activeBar={null} onBarTap={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Bar 1, Am' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bar 2, Am' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bar 3, C' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bar 5, G' })).toBeInTheDocument();
  });

  it('says which bars are looped with aria-pressed', () => {
    render(<ChordChart chart={chart} activeBar={null} loopRange={{ start: 1, end: 2 }} onBarTap={vi.fn()} />);
    expect(screen.getByTestId('chart-bar-0')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('chart-bar-1')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('chart-bar-2')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('chart-bar-3')).toHaveAttribute('aria-pressed', 'false');
  });

  it('taps a bar by its index', () => {
    const onBarTap = vi.fn();
    render(<ChordChart chart={chart} activeBar={null} onBarTap={onBarTap} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bar 3, C' }));
    expect(onBarTap).toHaveBeenCalledWith(2);
  });

  describe('a repeated bar', () => {
    it('reads at full ink, like any other bar: it is not dimmed', () => {
      render(<ChordChart chart={chart} activeBar={null} onBarTap={vi.fn()} />);
      const repeat = screen.getByTestId('chart-bar-1');
      const plain = screen.getByTestId('chart-bar-0');
      expect(repeat.className).toContain('text-ink');
      expect(repeat.className).not.toMatch(/text-ink-dim|\/45/);
      expect(plain.className).toContain('text-ink');
    });

    it('is marked by a dashed edge and the repeat sign instead', () => {
      render(<ChordChart chart={chart} activeBar={null} onBarTap={vi.fn()} />);
      const repeat = screen.getByTestId('chart-bar-1');
      expect(repeat).toHaveAttribute('data-repeat', 'true');
      expect(repeat.className).toContain('border-dashed');
      expect(repeat.querySelector('[data-testid="repeat-sign"]')).not.toBeNull();
      expect(screen.getByTestId('chart-bar-0').className).not.toContain('border-dashed');
      expect(screen.getByTestId('chart-bar-0').querySelector('[data-testid="repeat-sign"]')).toBeNull();
    });

    it('keeps the repeat sign out of the reading: it is a mark, not a word', () => {
      render(<ChordChart chart={chart} activeBar={null} onBarTap={vi.fn()} />);
      for (const sign of screen.getAllByTestId('repeat-sign')) expect(sign).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('uses the line token for the edges, not a raw hex', () => {
    render(<ChordChart chart={chart} activeBar={null} onBarTap={vi.fn()} />);
    expect(screen.getByTestId('chart-bar-2').className).toContain('border-line');
    expect(screen.getByTestId('chart-bar-2').className).not.toContain('#');
  });

  it('rounds its tiles at 16: rounded-2xl', () => {
    render(<ChordChart chart={chart} activeBar={null} onBarTap={vi.fn()} />);
    expect(screen.getByTestId('chart-bar-2').className).toContain('rounded-2xl');
  });

  it('titles its sections in sentence case, with the quiet label style', () => {
    render(<ChordChart chart={chart} activeBar={null} />);
    const heading = screen.getByRole('heading', { name: 'Verse' });
    expect(heading.className).toContain('label');
    expect(heading.className).not.toMatch(/uppercase|tracking/);
  });

  it('is only a picture without a tap handler: no buttons to tap', () => {
    render(<ChordChart chart={chart} activeBar={0} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByTestId('chart-bar-0')).toHaveAttribute('aria-label', 'Bar 1, Am');
    expect(screen.getByTestId('chart-bar-0')).toHaveAttribute('aria-current', 'true');
  });

  it('marks the playing bar amber', () => {
    render(<ChordChart chart={chart} activeBar={2} onBarTap={vi.fn()} />);
    expect(screen.getByTestId('chart-bar-2')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('chart-bar-2').className).toContain('bg-accent');
  });
});
