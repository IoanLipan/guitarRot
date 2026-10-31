import type { ReactNode } from 'react';
import { DIFFICULTIES, type Difficulty, type Song } from '@/content';
import { tapHaptic } from '@/app/haptics';
import { SearchIcon } from '@/ui/icons';
import { stagger } from '@/ui/motion';
import type { DifficultyFilter, SongFilter } from './searchSongs';

const FILTERS: readonly DifficultyFilter[] = ['all', ...DIFFICULTIES];

/** Only the first screenful of rows rises in, one after another; a long list never makes you wait for its tail. */
export const RISE_ROWS = 8;

/** The same three colours the difficulty pill uses (DifficultyPill.tsx), as a dot. */
const DOT_COLORS: Record<Difficulty, string> = {
  easy: 'var(--color-good)',
  medium: 'var(--color-accent)',
  hard: 'var(--color-bad)',
};

/** "easy" is a value; "Easy" is what the screen says. */
function sentenceCase(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** How many songs the list shows, as a sentence a screen reader can say. */
function countText(count: number): string {
  return `${count} ${count === 1 ? 'song' : 'songs'}`;
}

// min-w-11: the shortest word, All, still makes a 44px target.
const CHIP = 'press min-h-11 min-w-11 shrink-0 rounded-full px-4 text-meta font-bold narrow:px-3';

export function SongList({
  songs,
  filter,
  onFilterChange,
  onOpen,
  instrumentSwitch,
}: {
  songs: readonly Song[];
  filter: SongFilter;
  onFilterChange: (filter: SongFilter) => void;
  onOpen: (song: Song) => void;
  /** The quick instrument switch, in the title row beside the settings gear. */
  instrumentSwitch?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-ground">
      {/* The same title every tab has: display face, 48px, the same padding above (see Learn, Quiz). */}
      <div className="shrink-0 px-5 pt-8 pb-3 tight:pt-5">
        {/* The gear floats over this corner (see AppShell); the instrument switch stops just short of it. */}
        <div className="mb-4 flex items-center justify-between gap-3 pr-12 tight:mb-3">
          <h1 className="font-display text-display font-black">Songs</h1>
          {instrumentSwitch}
        </div>

        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-dim"
          >
            <SearchIcon size={18} />
          </span>
          <input
            type="search"
            name="song-search"
            value={filter.query}
            onChange={(event) => onFilterChange({ ...filter, query: event.target.value })}
            placeholder="Search songs, styles, keys…"
            aria-label="Search songs"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            data-testid="song-search"
            // 16px: a smaller field makes iOS Safari zoom the page in when it is tapped.
            className="w-full rounded-full bg-surface-2 py-3 pr-4 pl-10 text-body text-ink placeholder:text-ink-faint"
          />
        </div>

        {/* Five chips are wider than a 320px phone, so the row scrolls sideways
            instead of wrapping or squeezing; overscroll-x-contain keeps a swipe
            that runs out of chips from chaining into the page. */}
        <div
          className="-mx-5 mt-2 flex gap-2 overflow-x-auto overscroll-x-contain px-5 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label="Filter songs"
          data-testid="filter-row"
        >
          {FILTERS.map((level) => {
            const isActive = filter.difficulty === level;
            return (
              <button
                key={level}
                type="button"
                aria-pressed={isActive}
                data-testid={`filter-${level}`}
                onClick={() => {
                  tapHaptic();
                  onFilterChange({ ...filter, difficulty: level });
                }}
                className={`${CHIP} ${isActive ? 'bg-accent text-ground' : 'bg-surface-2 text-ink-dim'}`}
              >
                {sentenceCase(level)}
              </button>
            );
          })}
          {/* Movies is not a level: a wider gap sets it apart from the four that are, where a line used to. */}
          <button
            type="button"
            aria-pressed={filter.movies}
            data-testid="filter-movies"
            onClick={() => {
              tapHaptic();
              onFilterChange({ ...filter, movies: !filter.movies });
            }}
            className={`${CHIP} ml-2 ${filter.movies ? 'bg-accent text-ground' : 'bg-surface-2 text-ink-dim'}`}
          >
            Movies
          </button>
        </div>

        {/* Said, not shown: what the filter and the search left, so they are not typed into silence. */}
        <p role="status" data-testid="song-count" className="sr-only">
          {countText(songs.length)}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6" data-testid="song-list">
        {songs.length === 0 ? (
          <p className="pt-10 text-center text-meta text-ink-dim">
            Nothing matches that. Try a style, a key, or clear the filters.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {songs.map((song, index) => {
              const rises = index < RISE_ROWS;
              return (
                <li key={song.id} className={rises ? 'rise-in' : undefined} style={rises ? stagger(index, 38, 12) : undefined}>
                  <button
                    type="button"
                    onClick={() => {
                      tapHaptic();
                      onOpen(song);
                    }}
                    data-testid={`song-row-${song.id}`}
                    className="press press-soft flex w-full items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      {/* The title has the row to itself: the difficulty moved into the line under it. */}
                      <span className="block truncate text-body font-bold">{song.title}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-label text-ink-dim">
                        <span
                          data-testid={`difficulty-${song.difficulty}`}
                          className="flex shrink-0 items-center gap-1.5 font-bold text-ink"
                        >
                          <span
                            aria-hidden="true"
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: DOT_COLORS[song.difficulty] }}
                          />
                          {sentenceCase(song.difficulty)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">
                          {song.artist} · {song.style} · {song.bpm} BPM
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default SongList;
