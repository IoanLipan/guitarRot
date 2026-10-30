import { useEffect, useRef, useState } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, MicIcon, SpeakerIcon, StopIcon } from '@/ui/icons';
import { tapHaptic } from '@/app/haptics';
import { useMicPitch, type MicReading } from '@/app/useMicPitch';
import type { AudioEngine } from '@/audio';
import { fretToMidi, noteLabel, noteName, STANDARD_TUNING, stringNumber } from '@/music';
import { allStringsTuned, openStringOf, withTuned } from './tunedStrings';

/** Within this many cents of the note counts as dead on. */
const IN_TUNE_CENTS = 5;
/** How long the string must stay in tune before we say so; a flicker through zero is not tuned. */
const IN_TUNE_HOLD_MS = 400;
/**
 * A screen reader hears the tuner's verdict (in tune, too low, too high) no more often than this.
 * A reading changes many times a second; speech takes seconds, and one that keeps starting over is noise.
 */
export const ANNOUNCE_GAP_MS = 2500;
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

/**
 * What the live region says, given what the tuner is saying now: it follows the message, at most once
 * per `ANNOUNCE_GAP_MS`, and always with the latest one (a flicker between two verdicts inside the gap
 * is skipped, not read out). Silence clears it at once, so the next string's verdict is a change to hear.
 */
function useThrottledAnnouncement(message: string): string {
  const [announced, setAnnounced] = useState('');
  const lastRef = useRef(Number.NEGATIVE_INFINITY);
  useEffect(() => {
    if (message === announced) return;
    const wait = message === '' ? 0 : Math.max(0, lastRef.current + ANNOUNCE_GAP_MS - Date.now());
    const timer = setTimeout(() => {
      if (message !== '') lastRef.current = Date.now();
      setAnnounced(message);
    }, wait);
    return () => clearTimeout(timer);
  }, [message, announced]);
  return announced;
}

function formatCents(cents: number): string {
  const rounded = Math.round(cents);
  return `${rounded > 0 ? '+' : ''}${rounded} cents`;
}

export function Tuner({
  engine,
  onTunedAll,
}: {
  engine: AudioEngine;
  /** Called once, when all six open strings have been heard in tune since this tuner opened. */
  onTunedAll?: () => void;
}) {
  const { status, reading, start, stop } = useMicPitch();

  const inZone = reading !== null && Math.abs(reading.cents) < IN_TUNE_CENTS;
  // Which note has been held in the zone, not just whether one has: playing the next
  // string straight after the last, with no silence between, has to be held in tune
  // in its own right, and must not borrow the last one's hold for even a frame.
  const zoneMidi = inZone ? reading.midi : null;
  const [heldMidi, setHeldMidi] = useState<number | null>(null);
  useEffect(() => {
    if (zoneMidi === null) {
      setHeldMidi(null);
      return;
    }
    const timer = setTimeout(() => setHeldMidi(zoneMidi), IN_TUNE_HOLD_MS);
    return () => clearTimeout(timer);
  }, [zoneMidi]);
  const inTune = zoneMidi !== null && heldMidi === zoneMidi;

  // A session is this screen being open: tune the strings in any order, stop and
  // start the microphone between them, and it still counts. Refs, because nothing
  // is drawn from it; the only output is the one call when the sixth is in.
  const tunedRef = useRef<ReadonlySet<number>>(new Set());
  const reportedRef = useRef(false);
  const onTunedAllRef = useRef(onTunedAll);
  onTunedAllRef.current = onTunedAll;
  const tunedMidi = inTune && reading !== null ? reading.midi : null;
  useEffect(() => {
    if (tunedMidi === null || reportedRef.current) return;
    const stringIndex = openStringOf(tunedMidi);
    if (stringIndex === null) return;
    tunedRef.current = withTuned(tunedRef.current, stringIndex);
    if (allStringsTuned(tunedRef.current)) {
      reportedRef.current = true;
      onTunedAllRef.current?.();
    }
  }, [tunedMidi]);

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
    else prompt = 'Tap Start tuner to listen.';
  }

  // The one thing spoken: the verdict on the string, in the words on screen. Not the note, not the cents.
  const verdict =
    reading === null
      ? ''
      : inTune
        ? 'In tune'
        : inZone
          ? 'Almost, hold it steady'
          : cents < 0
            ? 'Tighten (too low)'
            : 'Loosen (too high)';
  const announcement = useThrottledAnnouncement(verdict);

  return (
    <div className="flex flex-col gap-4 tight:gap-3" data-testid="tuner">
      {/* The button comes first: on a short phone it must be on screen without a scroll, above the meter. */}
      {status !== 'unsupported' &&
        (status === 'listening' ? (
          <button
            type="button"
            data-testid="tuner-stop"
            onClick={handleStop}
            className="press flex min-h-12 items-center justify-center gap-2.5 rounded-full bg-surface-2 px-6 py-3 text-body font-extrabold text-ink"
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
            className="press flex min-h-12 items-center justify-center gap-2.5 rounded-full bg-accent px-6 py-3 text-body font-extrabold text-ground disabled:opacity-60"
          >
            <MicIcon size={20} />
            {status === 'starting' ? 'Starting…' : 'Start tuner'}
          </button>
        ))}

      {status === 'denied' && (
        <p
          role="status"
          data-testid="tuner-denied"
          className="rounded-2xl bg-surface-2 px-4 py-3 text-meta leading-relaxed text-ink-dim"
        >
          guitarRot couldn’t open your microphone. If you blocked it, allow microphone access for
          the app in your browser or phone settings, then tap Start tuner again. You can always tune
          by ear with the buttons below.
        </p>
      )}
      {status === 'unsupported' && (
        <p
          role="status"
          data-testid="tuner-unsupported"
          className="rounded-2xl bg-surface-2 px-4 py-3 text-meta leading-relaxed text-ink-dim"
        >
          This device doesn’t let the app use a microphone, so the tuner can’t listen. You can
          still tune by ear: tap a string below and match your guitar to it.
        </p>
      )}

      <section className="flex flex-col items-center gap-2 rounded-3xl bg-surface px-5 py-4 tight:gap-1.5 tight:py-2.5">
        {/* No reading is not a note: it says what to do, at title size, instead of a dash that reads as loading. */}
        <p
          data-testid="tuner-note"
          className={`flex h-10 items-center text-center transition-colors duration-200 ${
            reading === null ? 'text-title font-extrabold' : 'text-display leading-10 font-black tracking-tight'
          }`}
          style={{ color: inTune ? 'var(--color-good)' : 'var(--color-ink)' }}
        >
          {reading === null ? 'Play a string' : noteLabel(reading.midi)}
        </p>

        {/* One line either way (a prompt, or the reading's detail), so the card does not change height
            when the first note arrives. */}
        <div className="flex min-h-5 flex-wrap items-center justify-center gap-x-2 text-center text-meta text-ink-dim">
          {reading === null ? (
            <p data-testid="tuner-prompt">{prompt}</p>
          ) : (
            <>
              <p data-testid="tuner-detail">
                {noteName(reading.midi, { withOctave: true })} · {reading.hz.toFixed(1)} Hz
              </p>
              <span aria-hidden="true">·</span>
              <p data-testid="tuner-string">
                Closest: <span className="font-bold text-ink">String {stringNumber(closest ?? 0)}</span>
              </p>
            </>
          )}
        </div>

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
          className="relative mt-1 h-12 w-full overflow-x-clip tight:h-10"
        >
          <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-surface-2" />
          {/* The target zone lights up green once the string is held in tune, and holds still. */}
          <div
            data-testid="tuner-zone"
            data-lit={inTune ? 'true' : 'false'}
            className="tuner-zone absolute top-1/2 h-9 -translate-y-1/2 rounded-lg bg-good/20 ring-1 ring-good/60 tight:h-8"
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
              style={{ background: needleColor }}
            />
          </div>
        </div>
        <div className="flex w-full justify-between text-label font-semibold text-ink-dim">
          <span className="flex items-center gap-1">
            <ArrowLeftIcon size={14} />
            Flat
          </span>
          <span className="flex items-center gap-1">
            Sharp
            <ArrowRightIcon size={14} />
          </span>
        </div>

        {/* The verdict and how far off, on one line: not live, so a screen reader is not read every change of it. */}
        <div className="flex min-h-7 flex-wrap items-baseline justify-center gap-x-3">
          {reading !== null && (
            <>
              {inTune ? (
                <p data-testid="tuner-in-tune" className="pop-in text-title font-extrabold text-good">
                  In tune
                </p>
              ) : (
                <p data-testid="tuner-hint" className="text-lesson font-extrabold text-accent">
                  {verdict}
                </p>
              )}
              <p data-testid="tuner-cents" className="text-meta text-ink-dim">
                {formatCents(cents)}
              </p>
            </>
          )}
        </div>

        {/* The one live region: the verdict only, throttled (see useThrottledAnnouncement). */}
        <p aria-live="polite" aria-atomic="true" data-testid="tuner-live" className="sr-only">
          {announcement}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="label">Hear each string</h3>
        <p className="text-meta text-ink-dim tight:sr-only">
          Tune by ear: tap a string, play the same string on your guitar, and match the sound.
        </p>
        <div className="grid grid-cols-3 gap-2">
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
                className={`press press-tile flex flex-col items-center rounded-2xl px-2 py-2 tight:py-1.5 ${
                  isClosest ? 'bg-surface-3 ring-2 ring-accent' : 'bg-surface ring-2 ring-transparent'
                }`}
              >
                <span className="flex items-center gap-1.5 text-body font-extrabold">
                  {noteLabel(open)}
                  <SpeakerIcon size={16} className="text-ink-dim" />
                </span>
                <span className="text-label text-ink-dim">String {stringNumber(stringIndex)}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default Tuner;
