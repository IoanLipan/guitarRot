import type { AudioEngine } from '@/audio';
import { Tuner } from '../Tuner';

/**
 * The tuner's own Start button is the learn tab's one amber button. Inside a
 * lesson the amber one is Next, so here it is quiet (the in-step action look:
 * dark, amber text, an amber hairline), and the readout is a notch smaller on
 * a short phone so the button is on screen without scrolling.
 */
const QUIET_START =
  '[&_[data-testid=tuner-start]]:bg-surface-2 [&_[data-testid=tuner-start]]:text-accent [&_[data-testid=tuner-start]]:ring-1 [&_[data-testid=tuner-start]]:ring-accent/40';
/** The tuner's own section head is tracked capitals; inside a lesson it is a sentence-case label like every other. */
const SENTENCE_CASE = '[&_h3]:text-label [&_h3]:font-semibold [&_h3]:tracking-normal [&_h3]:normal-case';
const COMPACT =
  'tight:[&_[data-testid=tuner]]:gap-4 tight:[&_[data-testid=tuner-note]]:text-5xl tight:[&_[data-testid=tuner]>section:first-child]:gap-2.5 tight:[&_[data-testid=tuner]>section:first-child]:py-4';

/** The ordinary tuner, in the lesson. Nothing here is graded, so Next is always on. */
export function TunerStep({ engine, onTunedAll }: { engine: AudioEngine; onTunedAll?: () => void }) {
  return (
    <div className={`flex flex-col gap-5 ${QUIET_START} ${SENTENCE_CASE} ${COMPACT}`} data-testid="step-tuner">
      <Tuner engine={engine} onTunedAll={onTunedAll} />
    </div>
  );
}

export default TunerStep;
