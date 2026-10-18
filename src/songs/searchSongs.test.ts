import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, SONGS, type Difficulty, type Song } from '@/content';
import { EMPTY_FILTER, searchSongs } from './searchSongs';

const titles = (songs: { title: string }[]) => songs.map((song) => song.title);

/** A song that differs from the first catalogue entry only in what the test is about. */
function fixture(id: string, difficulty: Difficulty, extra: Partial<Song> = {}): Song {
  return { ...SONGS[0]!, id, title: id, difficulty, tags: [], ...extra };
}

describe('searchSongs', () => {
  it('returns the whole catalogue when nothing is asked for', () => {
    expect(searchSongs(SONGS, EMPTY_FILTER)).toHaveLength(SONGS.length);
  });

  describe('order', () => {
    it('opens the catalogue with the easiest songs and ends with the hardest', () => {
      const results = searchSongs(SONGS, EMPTY_FILTER);
      const levels = results.map((song) => DIFFICULTIES.indexOf(song.difficulty));

      expect(results[0]?.difficulty).toBe('easy');
      expect(levels).toEqual([...levels].sort((a, b) => a - b));
      expect(results.at(-1)?.difficulty).toBe('hard');
    });

    it('keeps catalogue order within a difficulty', () => {
      const results = searchSongs(SONGS, EMPTY_FILTER);

      for (const level of DIFFICULTIES) {
        const positions = results
          .filter((song) => song.difficulty === level)
          .map((song) => SONGS.indexOf(song));
        expect(positions).toEqual([...positions].sort((a, b) => a - b));
      }
    });

    it('sorts easy, medium, hard whatever order the songs arrive in', () => {
      const songs = [
        fixture('h1', 'hard'),
        fixture('m1', 'medium'),
        fixture('e1', 'easy'),
        fixture('h2', 'hard'),
        fixture('e2', 'easy'),
        fixture('m2', 'medium'),
      ];

      expect(searchSongs(songs, EMPTY_FILTER).map((song) => song.id)).toEqual([
        'e1',
        'e2',
        'm1',
        'm2',
        'h1',
        'h2',
      ]);
    });

    it('does not reorder the array it is given', () => {
      const songs = [fixture('h1', 'hard'), fixture('e1', 'easy')];
      searchSongs(songs, EMPTY_FILTER);
      expect(songs.map((song) => song.id)).toEqual(['h1', 'e1']);
    });

    it('lets a title match outrank difficulty once you are searching', () => {
      const songs = [
        fixture('easy-one', 'easy', { tags: ['galloping'] }),
        fixture('Gallop in E', 'hard'),
      ];

      expect(
        searchSongs(songs, { ...EMPTY_FILTER, query: 'gallop' }).map((song) => song.id),
      ).toEqual(['Gallop in E', 'easy-one']);
    });

    it('orders by difficulty among songs whose titles match equally well', () => {
      const songs = [
        fixture('Blue hard', 'hard'),
        fixture('Blue medium', 'medium'),
        fixture('Blue easy', 'easy'),
      ];

      expect(
        searchSongs(songs, { ...EMPTY_FILTER, query: 'blue' }).map((song) => song.id),
      ).toEqual(['Blue easy', 'Blue medium', 'Blue hard']);
    });
  });

  it('finds a song by title, case-insensitively', () => {
    expect(titles(searchSongs(SONGS, { ...EMPTY_FILTER, query: 'tom doo' }))).toContain(
      'Tom Dooley',
    );
    expect(titles(searchSongs(SONGS, { ...EMPTY_FILTER, query: 'GREENSLEEVES' }))).toEqual([
      'Greensleeves',
    ]);
  });

  it('finds songs by style, key and tag', () => {
    expect(searchSongs(SONGS, { ...EMPTY_FILTER, query: 'bluegrass' }).length).toBeGreaterThan(0);
    expect(searchSongs(SONGS, { ...EMPTY_FILTER, query: 'waltz' }).length).toBeGreaterThan(1);
    expect(searchSongs(SONGS, { ...EMPTY_FILTER, query: 'metal' }).length).toBeGreaterThan(0);
  });

  it('narrows on each extra word rather than widening', () => {
    const folk = searchSongs(SONGS, { ...EMPTY_FILTER, query: 'folk' });
    const easyFolk = searchSongs(SONGS, { ...EMPTY_FILTER, query: 'folk easy' });

    expect(easyFolk.length).toBeLessThanOrEqual(folk.length);
    expect(easyFolk.every((song) => song.difficulty === 'easy')).toBe(true);
  });

  it('filters by difficulty independently of the query', () => {
    const hard = searchSongs(SONGS, { query: '', difficulty: 'hard' });

    expect(hard.length).toBeGreaterThan(0);
    expect(hard.every((song) => song.difficulty === 'hard')).toBe(true);
  });

  it('combines the difficulty filter with the query', () => {
    const results = searchSongs(SONGS, { query: 'traditional', difficulty: 'easy' });
    expect(results.every((song) => song.artist === 'Traditional')).toBe(true);
    expect(results.every((song) => song.difficulty === 'easy')).toBe(true);
  });

  it('sorts a title match above a tag match', () => {
    // "House of the Rising Sun" is titled it; other songs merely carry the tag.
    const results = searchSongs(SONGS, { ...EMPTY_FILTER, query: 'house' });
    expect(results[0]?.title).toBe('House of the Rising Sun');
  });

  it('returns nothing for a query that matches nothing', () => {
    expect(searchSongs(SONGS, { ...EMPTY_FILTER, query: 'polka dubstep' })).toEqual([]);
  });
});
