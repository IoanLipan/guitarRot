import { useEffect, useMemo, useState } from 'react';
import type { AudioEngine } from '@/audio';
import { SONGS, getSong } from '@/content';
import { EMPTY_FILTER, searchSongs, type SongFilter } from './searchSongs';
import { SongList } from './SongList';
import { SongPlayer } from './SongPlayer';

export function Songs({
  engine,
  /** Song a shared link asked for; opens straight into the player. */
  openSongId = null,
}: {
  engine: AudioEngine;
  openSongId?: string | null;
}) {
  const [filter, setFilter] = useState<SongFilter>(EMPTY_FILTER);
  const [selectedId, setSelectedId] = useState<string | null>(openSongId);

  // A second shared link arriving while the tab is already open should still
  // move the screen to the song it names.
  useEffect(() => {
    if (openSongId !== null) setSelectedId(openSongId);
  }, [openSongId]);

  const results = useMemo(() => searchSongs(SONGS, filter), [filter]);
  const selected = selectedId === null ? undefined : getSong(selectedId);

  if (selected !== undefined) {
    return <SongPlayer song={selected} engine={engine} onBack={() => setSelectedId(null)} />;
  }

  return (
    <SongList
      songs={results}
      filter={filter}
      onFilterChange={setFilter}
      onOpen={(song) => setSelectedId(song.id)}
    />
  );
}

export default Songs;
