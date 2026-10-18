import { DIFFICULTIES, type Difficulty, type Song } from '@/content';

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
 * Filters and orders the catalogue.
 *
 * Every whitespace-separated word in the query has to match somewhere, so
 * "easy folk" narrows rather than widens.
 *
 * Order, most important first:
 * 1. How well the title matches the query (starts with it, contains it, or
 *    only another field matched), which is what makes typing a song's name
 *    feel like it found the song. Everything ties here with no query.
 * 2. Difficulty, easiest first: a beginner opening the tab should meet
 *    songs they can play, not a wall of the hardest ones.
 * 3. Catalogue order, so results never reshuffle between keystrokes.
 */
export function searchSongs(songs: readonly Song[], filter: SongFilter): Song[] {
  const words = filter.query.trim().toLowerCase().split(/\s+/).filter((word) => word !== '');

  const matched = songs.filter((song) => {
    if (filter.difficulty !== 'all' && song.difficulty !== filter.difficulty) return false;
    const text = haystack(song);
    return words.every((word) => text.includes(word));
  });

  const titleRank = (song: Song): number => {
    if (words.length === 0) return 0;
    const title = song.title.toLowerCase();
    if (words.every((word) => title.startsWith(word))) return 0;
    if (words.every((word) => title.includes(word))) return 1;
    return 2;
  };

  return matched
    .map((song, index) => ({
      song,
      index,
      rank: titleRank(song),
      level: DIFFICULTIES.indexOf(song.difficulty),
    }))
    .sort((a, b) => a.rank - b.rank || a.level - b.level || a.index - b.index)
    .map((entry) => entry.song);
}
