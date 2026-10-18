import { useMemo } from 'react';
import type { AudioEngine } from '@/audio';
import { getSong, songToRiff, type LessonStep } from '@/content';
import { PlayerPanel } from './PlayerPanel';
import { MissingContent, StepKicker } from './StepHeading';

export function SongStep({
  step,
  engine,
}: {
  step: Extract<LessonStep, { kind: 'song' }>;
  engine: AudioEngine;
}) {
  const song = getSong(step.songId);
  // A chart song's riff is built, not stored; keep one object so the player
  // is created once per step rather than on every render.
  const riff = useMemo(() => (song === undefined ? undefined : songToRiff(song)), [song]);
  if (song === undefined || riff === undefined) return <MissingContent what={`song ${step.songId}`} />;

  return (
    <div className="flex flex-col gap-5" data-testid="step-song">
      <div className="flex flex-col gap-1.5">
        <StepKicker>Play a song</StepKicker>
        {step.caption !== undefined && (
          <p className="text-xl leading-snug font-bold">{step.caption}</p>
        )}
      </div>
      <PlayerPanel riff={riff} title={song.title} chart={song.chart} engine={engine} />
      <p className="text-sm leading-relaxed text-ink-dim">{song.about}</p>
    </div>
  );
}

export default SongStep;
