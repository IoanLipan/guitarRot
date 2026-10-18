import type { AudioEngine } from '@/audio';
import { Tuner } from '../Tuner';
import { StepKicker } from './StepHeading';

/** The ordinary tuner, in the lesson. Nothing here is graded, so Next is always on. */
export function TunerStep({ engine }: { engine: AudioEngine }) {
  return (
    <div className="flex flex-col gap-5" data-testid="step-tuner">
      <StepKicker>Tune up</StepKicker>
      <Tuner engine={engine} />
    </div>
  );
}

export default TunerStep;
