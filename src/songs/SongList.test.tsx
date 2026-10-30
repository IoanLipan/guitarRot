import { useMemo, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SONGS } from '@/content';
import { EMPTY_FILTER, searchSongs, type SongFilter } from './searchSongs';
import { RISE_ROWS, SongList } from './SongList';

vi.mock('@/app/haptics', () => ({ tapHaptic: vi.fn() }));

/** The list with its filter held the way `Songs` holds it. */
function Harness({ onOpen = vi.fn() }: { onOpen?: (id: string) => void }) {
  const [filter, setFilter] = useState<SongFilter>(EMPTY_FILTER);
  const songs = useMemo(() => searchSongs(SONGS, filter), [filter]);
  return <SongList songs={songs} filter={filter} onFilterChange={setFilter} onOpen={(song) => onOpen(song.id)} />;
}

describe('the song list, as a screen', () => {
  it('is titled like every tab: a level-one heading in the display face, 48px', () => {
    render(<Harness />);

    const title = screen.getByRole('heading', { level: 1, name: 'Songs' });
    expect(title).toHaveClass('font-display', 'text-display', 'font-black');
  });

  describe('the search field', () => {
    it('is named, off autofill and spellcheck, and shows a search key on a phone keyboard', () => {
      render(<Harness />);

      const input = screen.getByRole('searchbox', { name: 'Search songs' });
      expect(input).toHaveAttribute('name', 'song-search');
      expect(input).toHaveAttribute('autocomplete', 'off');
      expect(input).toHaveAttribute('spellcheck', 'false');
      expect(input).toHaveAttribute('enterkeyhint', 'search');
    });

    it('has a placeholder in the faint ink at least, and ends it with an ellipsis', () => {
      render(<Harness />);

      const input = screen.getByRole('searchbox');
      expect(input.className).toContain('placeholder:text-ink-faint');
      expect(input.className).not.toMatch(/ink-dim\/70/);
      expect(input.getAttribute('placeholder')).toMatch(/…$/);
    });

    it('is 16px, which is what stops iOS zooming the page when it is tapped, and takes the one focus ring', () => {
      render(<Harness />);

      const input = screen.getByRole('searchbox');
      expect(input).toHaveClass('text-body');
      expect(input.className).not.toMatch(/outline-none/);
    });
  });

  describe('the count a screen reader hears', () => {
    it('is a status that says how many songs the list shows', () => {
      render(<Harness />);

      const status = screen.getByRole('status');
      expect(status).toHaveClass('sr-only');
      expect(status).toHaveTextContent(`${SONGS.length} songs`);
    });

    it('follows the filter and the search', async () => {
      render(<Harness />);
      const hard = SONGS.filter((song) => song.difficulty === 'hard').length;

      await userEvent.click(screen.getByTestId('filter-hard'));
      expect(screen.getByRole('status')).toHaveTextContent(`${hard} songs`);

      await userEvent.click(screen.getByTestId('filter-all'));
      await userEvent.type(screen.getByRole('searchbox'), 'greensleeves');
      expect(screen.getByRole('status')).toHaveTextContent('1 song');
      expect(screen.getByRole('status').textContent).not.toContain('songs');

      await userEvent.type(screen.getByRole('searchbox'), 'zzzz');
      expect(screen.getByRole('status')).toHaveTextContent('0 songs');
    });
  });

  describe('the filter chips', () => {
    it('are in sentence case, at a readable size, with no tracked capitals', () => {
      render(<Harness />);

      const chips = ['all', 'easy', 'medium', 'hard'].map((level) => screen.getByTestId(`filter-${level}`));
      expect(chips.map((chip) => chip.textContent)).toEqual(['All', 'Easy', 'Medium', 'Hard']);
      expect(screen.getByTestId('filter-movies')).toHaveTextContent('Movies');
      for (const chip of [...chips, screen.getByTestId('filter-movies')]) {
        expect(chip.className).not.toMatch(/uppercase|tracking-|text-xs/);
        expect(chip).toHaveClass('min-h-11', 'text-meta');
      }
    });

    it('set Movies apart with a gap, not a 1px line', () => {
      render(<Harness />);

      const row = screen.getByTestId('filter-row');
      expect(row.querySelector('.w-px')).toBeNull();
      expect(screen.getByTestId('filter-movies')).toHaveClass('ml-2');
      expect(row.children).toHaveLength(5);
    });
  });

  describe('a row', () => {
    it('gives the title the whole width: no pill beside it, the difficulty is a dot and a word in the line under it', () => {
      render(<Harness />);

      const row = screen.getByTestId('song-row-tom-dooley');
      const song = SONGS.find((candidate) => candidate.id === 'tom-dooley')!;
      const mark = within(row).getByTestId(`difficulty-${song.difficulty}`);

      expect(mark).toHaveTextContent('Easy');
      expect(mark.querySelector('[aria-hidden="true"]')).toHaveClass('rounded-full', 'h-2', 'w-2');
      // The dot's colour is the difficulty's own (the same three the pill used)...
      expect((mark.querySelector('[aria-hidden="true"]') as HTMLElement).style.background).toBe('var(--color-good)');
      // ...it sits in the meta line, with the artist, style and tempo...
      expect(mark.parentElement).toHaveTextContent(`${song.artist} · ${song.style} · ${song.bpm} BPM`);
      // ...and the title, a sibling of that line, truncates on the row's full width.
      const title = within(row).getByText(song.title);
      expect(title).toHaveClass('truncate');
      expect(title.parentElement).toBe(mark.parentElement?.parentElement);
      expect(row.querySelector('.rounded-full.px-2\\.5')).toBeNull();
    });

    it('has the three difficulty colours', () => {
      render(<Harness />);

      const colour = (difficulty: string) => {
        const mark = screen.getAllByTestId(`difficulty-${difficulty}`)[0]!;
        return (mark.querySelector('[aria-hidden="true"]') as HTMLElement).style.background;
      };
      expect(colour('easy')).toBe('var(--color-good)');
      expect(colour('medium')).toBe('var(--color-accent)');
      expect(colour('hard')).toBe('var(--color-bad)');
    });

    it('opens the song it names', async () => {
      const onOpen = vi.fn();
      render(<Harness onOpen={onOpen} />);

      await userEvent.click(screen.getByTestId('song-row-tom-dooley'));

      expect(onOpen).toHaveBeenCalledWith('tom-dooley');
    });

    it('rises in only for the first screenful: the first eight rows', () => {
      render(<Harness />);
      const rows = within(screen.getByTestId('song-list')).getAllByRole('listitem');

      expect(RISE_ROWS).toBe(8);
      expect(rows.length).toBeGreaterThan(RISE_ROWS);
      rows.forEach((row, index) => {
        if (index < RISE_ROWS) expect(row).toHaveClass('rise-in');
        else expect(row).not.toHaveClass('rise-in');
      });
    });

    it('has no hairline ring, only the tone step', () => {
      render(<Harness />);

      const row = screen.getByTestId('song-row-tom-dooley');
      expect(row).toHaveClass('bg-surface');
      expect(row.className).not.toMatch(/ring-/);
    });
  });
});
