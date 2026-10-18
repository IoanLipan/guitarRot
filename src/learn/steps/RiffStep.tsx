import type { AudioEngine } from '@/audio';
import { findRiff, type LessonStep } from '@/content';
import { PlayerPanel } from './PlayerPanel';
import { MissingContent, StepCaption, StepKicker } from './StepHeading';

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
    <div className="flex flex-col gap-5" data-testid="step-riff">
      <div className="flex flex-col gap-1.5">
        <StepKicker>Play it</StepKicker>
        {step.caption !== undefined && (
          <StepCaption>{step.caption}</StepCaption>
        )}
      </div>
      <PlayerPanel riff={riff} title={riff.title} engine={engine} />
    </div>
  );
}

export default RiffStep;
