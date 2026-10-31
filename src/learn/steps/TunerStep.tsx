import type { AudioEngine } from '@/audio';
import { Tuner } from '../Tuner';

/**
 * The tuner's own Start button is the learn tab's one amber button. Inside a
 * lesson the amber one is Next, so here it is quiet (the in-step action look:
 * dark, amber text, an amber hairline). That is the only thing the lesson
 * changes: the tuner's own markup already puts Start above the meter, keeps its
 * headings in sentence case, and compacts itself under `tight:`.
 */
const QUIET_START =
  '[&_[data-testid=tuner-start]]:bg-surface-2 [&_[data-testid=tuner-start]]:text-accent [&_[data-testid=tuner-start]]:ring-1 [&_[data-testid=tuner-start]]:ring-accent/40';

/** The ordinary tuner, in the lesson. Nothing here is graded, so Next is always on. */
export function TunerStep({ engine, onTunedAll }: { engine: AudioEngine; onTunedAll?: () => void }) {
  return (
    <div className={QUIET_START} data-testid="step-tuner">
      <Tuner engine={engine} onTunedAll={onTunedAll} />
    </div>
  );
}

export default TunerStep;
