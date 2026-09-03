import { DIFFICULTIES, type Song } from '@/content';
import { tapHaptic } from '@/app/haptics';
import { DifficultyPill } from './DifficultyPill';
import type { DifficultyFilter, SongFilter } from './searchSongs';

const FILTERS: readonly DifficultyFilter[] = ['all', ...DIFFICULTIES];

export function SongList({
  songs,
  filter,
  onFilterChange,
  onOpen,
}: {
  songs: readonly Song[];
  filter: SongFilter;
  onFilterChange: (filter: SongFilter) => void;
  onOpen: (song: Song) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-ground">
      <div className="shrink-0 px-5 pt-4 pb-3">
        <h2 className="mb-3 text-2xl font-black">Songs</h2>

        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-dim"
          >
            <SearchIcon />
          </span>
          <input
            type="search"
            value={filter.query}
            onChange={(event) => onFilterChange({ ...filter, query: event.target.value })}
            placeholder="Search songs, styles, keys…"
            aria-label="Search songs"
            data-testid="song-search"
            className="w-full rounded-full bg-surface-2 py-3 pr-4 pl-10 text-[15px] text-ink placeholder:text-ink-dim/70 focus:ring-2 focus:ring-accent/70 focus:outline-none"
          />
        </div>

        <div className="mt-3 flex gap-2" role="group" aria-label="Filter by difficulty">
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
                className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold tracking-wider uppercase active:scale-95 ${
                  isActive ? 'bg-accent text-ground' : 'bg-surface-2 text-ink-dim'
                }`}
              >
                {level}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6" data-testid="song-list">
        {songs.length === 0 ? (
          <p className="pt-10 text-center text-sm text-ink-dim">
            Nothing matches that. Try a style, a key, or clear the filters.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {songs.map((song) => (
              <li key={song.id}>
                <button
                  type="button"
                  onClick={() => {
                    tapHaptic();
                    onOpen(song);
                  }}
                  data-testid={`song-row-${song.id}`}
                  className="flex w-full items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-left ring-1 ring-white/5 active:scale-[0.99]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold">{song.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-ink-dim">
                      {song.artist} · {song.style} · {song.bpm} BPM
                    </span>
                  </span>
                  <DifficultyPill difficulty={song.difficulty} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default SongList;
