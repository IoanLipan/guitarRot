import { useMemo, useState } from 'react';
import type { AudioEngine } from '@/audio';
import { getSong, songPlayableOn, songsFor } from '@/content';
import { useInstrument } from '@/instrument';
import { EMPTY_FILTER, searchSongs, type SongFilter } from './searchSongs';
import { SongList } from './SongList';
import { SongPlayer } from './SongPlayer';

/**
 * The song browser, or the player for the open song. Which song is open is
 * owned by the caller (`openSongId`), not by this component: it unmounts when
 * another tab is shown, and the open song has to survive that. A shared link
 * simply starts the caller with a song already open.
 */
export function Songs({
  engine,
  openSongId,
  onOpenSongChange,
  onSongPlayed,
}: {
  engine: AudioEngine;
  openSongId: string | null;
  onOpenSongChange: (songId: string | null) => void;
  /** Told when a song has been heard long enough to count as played; see `SongPlayer`. */
  onSongPlayed?: (songId: string) => void;
}) {
  const { id: instrument } = useInstrument();
  const [filter, setFilter] = useState<SongFilter>(EMPTY_FILTER);

  // Only what this instrument can play is listed, searched and opened.
  const playable = useMemo(() => songsFor(instrument), [instrument]);
  const results = useMemo(() => searchSongs(playable, filter), [playable, filter]);
  const found = openSongId === null ? undefined : getSong(openSongId);
  const selected = found !== undefined && songPlayableOn(found, instrument) ? found : undefined;

  if (selected !== undefined) {
    return (
      <SongPlayer
        song={selected}
        engine={engine}
        onBack={() => onOpenSongChange(null)}
        onPlayed={onSongPlayed}
      />
    );
  }

  return (
    <SongList
      songs={results}
      filter={filter}
      onFilterChange={setFilter}
      onOpen={(song) => onOpenSongChange(song.id)}
    />
  );
}

export default Songs;
