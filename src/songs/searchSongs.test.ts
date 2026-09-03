import { describe, expect, it } from 'vitest';
import { SONGS } from '@/content';
import { EMPTY_FILTER, searchSongs } from './searchSongs';

const titles = (songs: { title: string }[]) => songs.map((song) => song.title);

describe('searchSongs', () => {
  it('returns the whole catalogue when nothing is asked for', () => {
    expect(searchSongs(SONGS, EMPTY_FILTER)).toHaveLength(SONGS.length);
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
