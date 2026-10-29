import { DIFFICULTIES, type Song } from '@/content';
import { tapHaptic } from '@/app/haptics';
import { SearchIcon } from '@/ui/icons';
import { stagger } from '@/ui/motion';
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
            <SearchIcon size={18} />
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
                className={`press min-h-11 rounded-full px-4 text-xs font-extrabold tracking-wider uppercase narrow:px-3 ${
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
            {songs.map((song, index) => (
              <li key={song.id} className="rise-in" style={stagger(index, 38, 12)}>
                <button
                  type="button"
                  onClick={() => {
                    tapHaptic();
                    onOpen(song);
                  }}
                  data-testid={`song-row-${song.id}`}
                  className="press press-soft flex w-full items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-left ring-1 ring-white/5"
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

export default SongList;
