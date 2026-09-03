import type { Difficulty, Song } from '@/content';

export type DifficultyFilter = Difficulty | 'all';

export type SongFilter = {
  query: string;
  difficulty: DifficultyFilter;
};

export const EMPTY_FILTER: SongFilter = { query: '', difficulty: 'all' };

/** Every word a song can be found by. */
function haystack(song: Song): string {
  return [song.title, song.artist, song.style, song.key, song.difficulty, ...song.tags]
    .join(' ')
    .toLowerCase();
}

/**
 * Filters the catalogue.
 *
 * Every whitespace-separated word in the query has to match somewhere, so
 * "easy folk" narrows rather than widens. Title matches sort first, which
 * is what makes typing a song's name feel like it found the song.
 */
export function searchSongs(songs: readonly Song[], filter: SongFilter): Song[] {
  const words = filter.query.trim().toLowerCase().split(/\s+/).filter((word) => word !== '');

  const matched = songs.filter((song) => {
    if (filter.difficulty !== 'all' && song.difficulty !== filter.difficulty) return false;
    const text = haystack(song);
    return words.every((word) => text.includes(word));
  });

  if (words.length === 0) return matched;

  const rank = (song: Song): number => {
    const title = song.title.toLowerCase();
    if (words.every((word) => title.startsWith(word))) return 0;
    if (words.every((word) => title.includes(word))) return 1;
    return 2;
  };

  // Ties keep catalogue order, so results never reshuffle between keystrokes.
  return matched
    .map((song, index) => ({ song, index, rank: rank(song) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.song);
}
