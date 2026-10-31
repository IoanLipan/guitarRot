import type { AudioEngine } from '@/audio';
import { findRiff, type LessonStep } from '@/content';
import { PlayerPanel } from './PlayerPanel';
import { MissingContent, StepCaption } from './StepHeading';

export function RiffStep({
  step,
  engine,
}: {
  step: Extract<LessonStep, { kind: 'riff' }>;
  engine: AudioEngine;
}) {
  const riff = findRiff(step.riffId);
  if (riff === undefined) return <MissingContent what={`riff ${step.riffId}`} />;

  return (
    <div className="flex flex-col gap-5 tight:gap-3" data-testid="step-riff">
      {step.caption !== undefined && <StepCaption>{step.caption}</StepCaption>}
      <PlayerPanel riff={riff} title={riff.title} engine={engine} />
    </div>
  );
}

export default RiffStep;
