import type { AudioEngine } from '@/audio';
import type { LessonStep } from '@/content';
import { CheckStep } from './CheckStep';
import { ChordStep } from './ChordStep';
import { DrillStep } from './DrillStep';
import { ExplainStep } from './ExplainStep';
import { FretboardStep } from './FretboardStep';
import { ListenStep } from './ListenStep';
import { RiffStep } from './RiffStep';
import { SongStep } from './SongStep';
import { TunerStep } from './TunerStep';

/**
 * What a step asks of the learner before the lesson moves on.
 * - `open`: nothing; Next is always on.
 * - `required`: the question has to be answered (check) or the run finished (drill).
 * - `skippable`: playing it is the point, but it needs a guitar and a quiet room,
 *   so the footer offers Skip until it is done.
 */
export type StepGate = 'open' | 'required' | 'skippable';

export function stepGate(step: LessonStep): StepGate {
  switch (step.kind) {
    case 'check':
    case 'drill':
      return 'required';
    case 'listen':
      return 'skippable';
    default:
      return 'open';
  }
}

/**
 * Why Next is shut, in the words the button wears while it is: a grey "Next"
 * with no reason sends a learner hunting. `undefined` for a step that is never shut.
 */
export function gateReason(step: LessonStep): string | undefined {
  switch (step.kind) {
    case 'check':
      return 'Pick an answer';
    case 'drill':
      return `Answer ${step.count} to go on`;
    default:
      return undefined;
  }
}

/** The one screen a step becomes. Keyed by the caller so each step starts fresh. */
export function StepView({
  step,
  engine,
  onDone,
  onTunedAll,
}: {
  step: LessonStep;
  engine: AudioEngine;
  /** A gated step calls this when it has been satisfied. */
  onDone: () => void;
  /** The tuner step calls this when all six strings have been tuned. */
  onTunedAll?: () => void;
}) {
  switch (step.kind) {
    case 'explain':
      return <ExplainStep step={step} engine={engine} />;
    case 'fretboard':
      return <FretboardStep step={step} engine={engine} />;
    case 'chord':
      return <ChordStep step={step} engine={engine} />;
    case 'riff':
      return <RiffStep step={step} engine={engine} />;
    case 'song':
      return <SongStep step={step} engine={engine} />;
    case 'listen':
      return <ListenStep step={step} engine={engine} onDone={onDone} />;
    case 'tuner':
      return <TunerStep engine={engine} onTunedAll={onTunedAll} />;
    case 'drill':
      return <DrillStep step={step} engine={engine} onDone={onDone} />;
    case 'check':
      return <CheckStep step={step} onDone={onDone} />;
  }
}

export default StepView;
