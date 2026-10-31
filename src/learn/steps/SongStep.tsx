import { useMemo } from 'react';
import type { AudioEngine } from '@/audio';
import { getSong, songToRiff, type LessonStep } from '@/content';
import { useInstrument } from '@/instrument';
import { PlayerPanel } from './PlayerPanel';
import { MissingContent, StepCaption } from './StepHeading';

export function SongStep({
  step,
  engine,
}: {
  step: Extract<LessonStep, { kind: 'song' }>;
  engine: AudioEngine;
}) {
  const { id: instrument } = useInstrument();
  const song = getSong(step.songId);
  // A chart song's riff is built, not stored; keep one object so the player
  // is created once per step rather than on every render. It is built with the
  // chord shapes of the instrument the lesson is for.
  const riff = useMemo(() => (song === undefined ? undefined : songToRiff(song, instrument)), [song, instrument]);
  if (song === undefined || riff === undefined) return <MissingContent what={`song ${step.songId}`} />;

  return (
    <div className="flex flex-col gap-5 tight:gap-3" data-testid="step-song">
      {step.caption !== undefined && <StepCaption>{step.caption}</StepCaption>}
      <PlayerPanel riff={riff} title={song.title} chart={song.chart} engine={engine} />
      <p className="text-meta text-ink-dim">{song.about}</p>
    </div>
  );
}

export default SongStep;
