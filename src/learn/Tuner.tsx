import { useEffect, useState } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, MicIcon, SpeakerIcon, StopIcon } from '@/ui/icons';
import { tapHaptic } from '@/app/haptics';
import { useMicPitch, type MicReading } from '@/app/useMicPitch';
import type { AudioEngine } from '@/audio';
import { fretToMidi, noteLabel, noteName, STANDARD_TUNING, stringNumber } from '@/music';

/** Within this many cents of the note counts as dead on. */
const IN_TUNE_CENTS = 5;
/** How long the string must stay in tune before we say so; a flicker through zero is not tuned. */
const IN_TUNE_HOLD_MS = 400;
/** The meter shows this far either side of the note. A half step is 100 cents, so this is the nearest note's whole catchment. */
const METER_RANGE_CENTS = 50;

/**
 * The string you are most likely tuning. Measured against the exact pitch, not
 * the rounded note, so an A string pulled 60 cents flat (G#2 + 40) still
 * resolves to the A string rather than to whichever string owns G#.
 */
function closestStringIndex(reading: MicReading): number {
  const exact = reading.midi + reading.cents / 100;
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  STANDARD_TUNING.forEach((open, index) => {
    const distance = Math.abs(open - exact);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

function formatCents(cents: number): string {
  const rounded = Math.round(cents);
  return `${rounded > 0 ? '+' : ''}${rounded} cents`;
}

export function Tuner({ engine }: { engine: AudioEngine }) {
  const { status, reading, start, stop } = useMicPitch();

  const inZone = reading !== null && Math.abs(reading.cents) < IN_TUNE_CENTS;
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!inZone) {
      setHeld(false);
      return;
    }
    const timer = setTimeout(() => setHeld(true), IN_TUNE_HOLD_MS);
    return () => clearTimeout(timer);
  }, [inZone]);
  const inTune = inZone && held;

  const closest = reading === null ? null : closestStringIndex(reading);
  const cents = reading?.cents ?? 0;
  const needle = Math.min(METER_RANGE_CENTS, Math.max(-METER_RANGE_CENTS, cents));
  const needlePercent = ((needle + METER_RANGE_CENTS) / (2 * METER_RANGE_CENTS)) * 100;
  const zonePercent = (IN_TUNE_CENTS / (2 * METER_RANGE_CENTS)) * 100 * 2;
  const needleColor = inZone ? 'var(--color-good)' : 'var(--color-accent)';

  function handleHear(stringIndex: number) {
    tapHaptic();
    engine.playNote(fretToMidi(STANDARD_TUNING, stringIndex, 0), { stringIndex });
  }

  function handleStart() {
    tapHaptic();
    void start();
  }

  function handleStop() {
    tapHaptic();
    stop();
  }

  let prompt: string | null = null;
  if (reading === null) {
    if (status === 'listening') prompt = 'Listening… play one string at a time.';
    else if (status === 'starting') prompt = 'Waiting for the microphone…';
    else prompt = 'Tap Start tuner, then play one string at a time.';
  }

  return (
    <div className="flex flex-col gap-6" data-testid="tuner">
      <section
        className="flex flex-col items-center gap-4 rounded-3xl bg-surface px-5 py-6"
        aria-live="polite"
      >
        <p
          data-testid="tuner-note"
          className="min-h-[1.1em] text-center text-6xl font-black tracking-tight transition-colors duration-200"
          style={{ color: inTune ? 'var(--color-good)' : 'var(--color-ink)' }}
        >
          {reading === null ? '—' : noteLabel(reading.midi)}
        </p>

        {reading === null ? (
          <p data-testid="tuner-prompt" className="text-center text-sm text-ink-dim">
            {prompt}
          </p>
        ) : (
          <div className="flex flex-col items-center gap-1 text-center text-sm text-ink-dim">
            <p data-testid="tuner-detail">
              {noteName(reading.midi, { withOctave: true })} · {reading.hz.toFixed(1)} Hz
            </p>
            <p data-testid="tuner-string">
              Closest string:{' '}
              <span className="font-bold text-ink">
                String {stringNumber(closest ?? 0)}
              </span>
            </p>
          </div>
        )}

        <div
          role="meter"
          aria-label="Tuning, in cents flat or sharp"
          aria-valuemin={-METER_RANGE_CENTS}
          aria-valuemax={METER_RANGE_CENTS}
          aria-valuenow={Math.round(needle)}
          aria-valuetext={reading === null ? 'No note detected' : formatCents(cents)}
          data-testid="tuner-meter"
          // overflow-x-clip: the needle's rail is slid sideways by up to half the meter, and its box
          // used to make the whole lesson scroll sideways.
          className="relative mt-2 h-14 w-full overflow-x-clip"
        >
          <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-surface-2" />
          {/* The target zone lights up green, and softly pulses, once the string is held in tune. */}
          <div
            data-testid="tuner-zone"
            data-lit={inTune ? 'true' : 'false'}
            className="tuner-zone absolute top-1/2 h-10 -translate-y-1/2 rounded-lg bg-good/20 ring-1 ring-good/60"
            style={{ left: `${50 - zonePercent / 2}%`, width: `${zonePercent}%` }}
          />
          {/* The needle rides a full-width rail that is slid across, so it moves by transform (the
              percentage is the meter's own width) and eases between readings instead of jumping. */}
          <div
            data-testid="tuner-needle-rail"
            className="tuner-needle absolute inset-0"
            style={{ transform: `translateX(${needlePercent}%)`, opacity: reading === null ? 0 : 1 }}
          >
            <div
              data-testid="tuner-needle"
              className="absolute top-1 bottom-1 left-0 w-1.5 -translate-x-1/2 rounded-full transition-colors duration-200"
              style={{
                background: needleColor,
                boxShadow: inZone ? '0 0 14px rgba(53,208,127,0.8)' : undefined,
              }}
            />
          </div>
        </div>
        <div className="-mt-2 flex w-full justify-between text-xs font-bold text-ink-dim">
          <span className="flex items-center gap-1">
            <ArrowLeftIcon size={14} />
            Flat
          </span>
          <span className="flex items-center gap-1">
            Sharp
            <ArrowRightIcon size={14} />
          </span>
        </div>

        <div className="flex min-h-14 flex-col items-center justify-center gap-1">
          {reading !== null && (
            <>
              {inTune ? (
                <p
                  data-testid="tuner-in-tune"
                  className="pop-in text-2xl font-black text-good"
                  style={{ textShadow: '0 0 24px rgba(53,208,127,0.5)' }}
                >
                  In tune
                </p>
              ) : (
                <p data-testid="tuner-hint" className="text-lg font-extrabold text-accent">
                  {inZone
                    ? 'Almost — hold it steady'
                    : cents < 0
                      ? 'Tighten (too low)'
                      : 'Loosen (too high)'}
                </p>
              )}
              <p data-testid="tuner-cents" className="text-sm text-ink-dim">
                {formatCents(cents)}
              </p>
            </>
          )}
        </div>
      </section>

      {status === 'denied' && (
        <p
          role="status"
          data-testid="tuner-denied"
          className="rounded-2xl bg-surface-2 px-4 py-3 text-sm leading-relaxed text-ink-dim"
        >
          guitarRot couldn't open your microphone. If you blocked it, allow microphone access for
          the app in your browser or phone settings, then tap Start tuner again. You can always tune
          by ear with the buttons below.
        </p>
      )}
      {status === 'unsupported' && (
        <p
          role="status"
          data-testid="tuner-unsupported"
          className="rounded-2xl bg-surface-2 px-4 py-3 text-sm leading-relaxed text-ink-dim"
        >
          This device doesn't let the app use a microphone, so the tuner can't listen. You can
          still tune by ear: tap a string below and match your guitar to it.
        </p>
      )}

      {status !== 'unsupported' &&
        (status === 'listening' ? (
          <button
            type="button"
            data-testid="tuner-stop"
            onClick={handleStop}
            className="press flex items-center justify-center gap-2.5 rounded-full bg-surface-2 px-6 py-3.5 text-base font-extrabold text-ink"
          >
            <StopIcon size={20} />
            Stop tuner
          </button>
        ) : (
          <button
            type="button"
            data-testid="tuner-start"
            disabled={status === 'starting'}
            onClick={handleStart}
            className="press flex items-center justify-center gap-2.5 rounded-full bg-accent px-6 py-3.5 text-base font-extrabold text-ground disabled:opacity-60"
          >
            <MicIcon size={20} />
            {status === 'starting' ? 'Starting…' : 'Start tuner'}
          </button>
        ))}

      <section className="flex flex-col gap-3">
        <h3 className="text-[13px] font-bold tracking-wider text-ink-dim uppercase">
          Hear each string
        </h3>
        <p className="text-sm text-ink-dim">
          Tune by ear: tap a string, play the same string on your guitar, and match the sound.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {STANDARD_TUNING.map((open, stringIndex) => {
            const isClosest = closest === stringIndex;
            return (
              <button
                key={stringIndex}
                type="button"
                data-testid={`hear-string-${stringIndex}`}
                data-closest={isClosest}
                aria-label={`Hear string ${stringNumber(stringIndex)}, ${noteLabel(open)}`}
                onClick={() => handleHear(stringIndex)}
                className={`press press-tile flex flex-col items-center gap-0.5 rounded-2xl px-2 py-4 ${
                  isClosest ? 'bg-accent/12 ring-2 ring-accent' : 'bg-surface ring-2 ring-transparent'
                }`}
              >
                <span className="flex items-center gap-1.5 text-xl font-extrabold">
                  {noteLabel(open)}
                  <SpeakerIcon size={16} className="text-ink-dim" />
                </span>
                <span className="text-xs text-ink-dim">String {stringNumber(stringIndex)}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default Tuner;
