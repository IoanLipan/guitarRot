import { INSTRUMENTS, getInstrument, type InstrumentId } from '@/music';
import { GuitarIcon, UkuleleIcon } from '@/ui/icons';
import { tapHaptic } from './haptics';

/** The icon of an instrument, at the size a button carries one. */
export function InstrumentIcon({ id, size = 22 }: { id: InstrumentId; size?: number }) {
  return id === 'ukulele' ? <UkuleleIcon size={size} /> : <GuitarIcon size={size} />;
}

/**
 * The instrument you are learning, in one tap: a round 44px button, the same
 * as the settings gear it sits beside, drawn as the instrument now in use.
 * Tapping it moves to the other one. With two instruments that is the whole
 * choice; the Settings sheet lists them by name.
 *
 * Its name says both things a screen reader needs, which is which one is on
 * and what the button does: "Guitar. Switch to ukulele."
 */
export function InstrumentSwitch({
  instrument,
  onSwitch,
  className = '',
}: {
  instrument: InstrumentId;
  onSwitch: (next: InstrumentId) => void;
  className?: string;
}) {
  const current = getInstrument(instrument);
  const other = INSTRUMENTS.find((candidate) => candidate.id !== instrument) ?? current;
  return (
    <button
      type="button"
      onClick={() => {
        tapHaptic();
        onSwitch(other.id);
      }}
      aria-label={`${current.name}. Switch to ${other.name.toLowerCase()}`}
      data-testid="instrument-switch"
      data-instrument-switch=""
      data-instrument={instrument}
      className={`press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2/90 text-ink ${className}`}
    >
      <InstrumentIcon id={instrument} />
    </button>
  );
}
