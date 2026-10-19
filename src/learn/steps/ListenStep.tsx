import { useEffect, useRef, useState } from 'react';
import { successHaptic, tapHaptic } from '@/app/haptics';
import { useMicPitch } from '@/app/useMicPitch';
import type { AudioEngine } from '@/audio';
import type { LessonStep } from '@/content';
import {
  fretToMidi,
  noteLabel,
  STANDARD_TUNING,
  stringNumber,
  type FretPosition,
} from '@/music';
import type { FretMarker } from '@/render';
import { Neck } from './Neck';
import { RichText } from './RichText';
import { StepCaption, StepKicker } from './StepHeading';

/** How long the right pitch has to be held before it counts: a pluck passing through is not a played note. */
const HOLD_MS = 250;
/** How long the target note is played for when you tap Hear it. */
const HEAR_MS = 1200;
/**
 * The phone's own speaker is next to its microphone. After Hear it, listen to
 * nothing until the sound has died, or the app "hears" itself and ticks the
 * note off before you have touched the guitar.
 */
const DEAF_AFTER_HEAR_MS = 1800;
/** How long "Got it" stays up before the next note is asked for. */
const GOT_IT_MS = 900;

/** The detector can land an octave off; the right note in the wrong octave still counts. */
function sameNote(heard: number, target: number): boolean {
  return heard === target || Math.abs(heard - target) === 12;
}

function whereToPlay(position: FretPosition): string {
  const fret = position.fret === 0 ? 'open' : `fret ${position.fret}`;
  return `string ${stringNumber(position.stringIndex)}, ${fret}`;
}

/**
 * Play each target on your own guitar, one at a time, and the microphone
 * checks it. The mic is optional: no guitar to hand, a noisy room or a refused
 * permission all end at the Skip button, which the lesson always offers.
 */
export function ListenStep({
  step,
  engine,
  onDone,
}: {
  step: Extract<LessonStep, { kind: 'listen' }>;
  engine: AudioEngine;
  onDone: () => void;
}) {
  const mic = useMicPitch();
  /** Targets come in order, so "how many are ticked" is also "which is next". */
  const [ticked, setTicked] = useState(0);
  const [deaf, setDeaf] = useState(false);
  /** False right after a match when the next target is the same note: wait for the string to go quiet first. */
  const [armed, setArmed] = useState(true);
  const [gotIt, setGotIt] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const total = step.targets.length;
  const complete = ticked >= total;
  const target = complete ? undefined : step.targets[ticked];
  const targetMidi =
    target === undefined ? undefined : fretToMidi(STANDARD_TUNING, target.stringIndex, target.fret);

  const heard = mic.reading?.midi;
  const hearing = heard !== undefined && targetMidi !== undefined && sameNote(heard, targetMidi);

  function later(run: () => void, ms: number) {
    timers.current.push(setTimeout(run, ms));
  }

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  // The string has to go quiet (or change) once before the same note can count again.
  useEffect(() => {
    if (!hearing) setArmed(true);
  }, [hearing]);

  // Holding the right pitch for HOLD_MS ticks the target. The timer lives and
  // dies with the condition, so a reading that wobbles off the note restarts it.
  const matching = hearing && armed && !deaf && mic.status === 'listening';
  useEffect(() => {
    if (!matching || target === undefined || targetMidi === undefined) return;
    const timer = setTimeout(() => {
      successHaptic();
      setGotIt(noteLabel(targetMidi));
      later(() => setGotIt(null), GOT_IT_MS);
      const next = step.targets[ticked + 1];
      const nextMidi =
        next === undefined ? undefined : fretToMidi(STANDARD_TUNING, next.stringIndex, next.fret);
      setArmed(!(nextMidi !== undefined && (nextMidi - targetMidi) % 12 === 0));
      setTicked((count) => count + 1);
    }, HOLD_MS);
    return () => clearTimeout(timer);
  }, [matching, target, targetMidi, ticked, step.targets]);

  // All played: tell the lesson, and let go of the microphone.
  const { stop } = mic;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    if (!complete) return;
    onDoneRef.current();
    stop();
  }, [complete, stop]);

  function handleHear() {
    if (targetMidi === undefined || target === undefined) return;
    tapHaptic();
    engine.playNote(targetMidi, { stringIndex: target.stringIndex, duration: HEAR_MS / 1000 });
    setDeaf(true);
    later(() => setDeaf(false), DEAF_AFTER_HEAR_MS);
  }

  function handleMic() {
    tapHaptic();
    if (mic.status === 'listening') mic.stop();
    else void mic.start();
  }

  const markers: FretMarker[] = step.targets.map((position, index) => ({
    ...position,
    tone: index < ticked ? 'correct' : index === ticked ? 'root' : 'ghost',
  }));
  const fretRange: [number, number] = [0, Math.max(4, ...step.targets.map((p) => p.fret + 1))];

  return (
    <div className="flex flex-col gap-4" data-testid="step-listen">
      <div className="flex flex-col gap-1.5">
        <StepKicker>Your turn</StepKicker>
        <StepCaption>{step.caption}</StepCaption>
      </div>

      {complete || target === undefined || targetMidi === undefined ? (
        <div
          className="flex flex-col items-center gap-1 rounded-3xl bg-good/12 px-5 py-7 text-center"
          data-testid="listen-complete"
        >
          <p className="text-3xl font-black text-good">✓ Played</p>
          <p className="text-sm text-ink-dim">
            {total === 1 ? 'That note' : `All ${total} notes`} heard. Nicely done.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 rounded-3xl bg-surface px-5 py-5 text-center">
          <ol className="flex w-full gap-1.5" aria-label="Notes to play" data-testid="listen-progress">
            {step.targets.map((_, index) => (
              <li
                key={index}
                data-state={index < ticked ? 'done' : index === ticked ? 'current' : 'todo'}
                className="h-1.5 flex-1 rounded-full transition-colors"
                style={{
                  background:
                    index < ticked
                      ? 'var(--color-good)'
                      : index === ticked
                        ? 'var(--color-accent)'
                        : 'var(--color-surface-2)',
                }}
              />
            ))}
          </ol>
          <p className="mt-2 text-xs font-bold tracking-wider text-ink-dim uppercase tabular-nums">
            Note {ticked + 1} of {total}
          </p>
          <p className="text-3xl leading-tight font-black" data-testid="listen-target">
            <RichText>{`Play ${noteLabel(targetMidi)}`}</RichText>
          </p>
          <p className="text-base text-ink-dim" data-testid="listen-where">
            {whereToPlay(target)}
          </p>
        </div>
      )}

      {!complete && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleHear}
              data-testid="listen-hear"
              className="flex h-13 items-center justify-center gap-2 rounded-full bg-surface-2 text-base font-extrabold active:scale-95"
            >
              <span aria-hidden="true">♪</span> Hear it
            </button>
            {mic.status !== 'unsupported' && (
              <button
                type="button"
                onClick={handleMic}
                disabled={mic.status === 'starting'}
                data-testid="listen-mic"
                aria-pressed={mic.status === 'listening'}
                className={`flex h-13 items-center justify-center gap-2 rounded-full text-base font-extrabold active:scale-95 disabled:opacity-60 ${
                  mic.status === 'listening' ? 'bg-accent text-ground' : 'bg-surface-2'
                }`}
              >
                {mic.status === 'listening'
                  ? 'Stop listening'
                  : mic.status === 'starting'
                    ? 'Starting…'
                    : 'Listen for me'}
              </button>
            )}
          </div>

          <p
            className="min-h-10 text-center text-sm leading-relaxed text-ink-dim"
            role="status"
            aria-live="polite"
            data-testid="listen-status"
          >
            {gotIt !== null ? (
              <strong className="text-good">Got it: {gotIt}</strong>
            ) : mic.status === 'denied' ? (
              "The microphone isn't available, so nothing can hear you. Play along on your own and tap Skip."
            ) : mic.status === 'starting' ? (
              'Waiting for the microphone…'
            ) : mic.status === 'unsupported' ? (
              "This device can't listen. Play along on your own and tap Skip."
            ) : mic.status === 'listening' ? (
              !armed ? (
                'Same note again: let the string go quiet, then play it again.'
              ) : mic.reading !== null ? (
                <>
                  I hear <strong className="text-ink">{noteLabel(mic.reading.midi)}</strong>
                </>
              ) : (
                'Listening… play the note.'
              )
            ) : (
              'Tap Listen for me and play it, or just play along and tap Skip.'
            )}
          </p>
        </div>
      )}

      {/* After the prompt and its buttons, not before: on a phone a long
          caption plus the board pushed "Hear it" and "Listen for me" under
          the footer. The board is the reference; the buttons are the task. */}
      <Neck
        fretRange={fretRange}
        markers={markers}
        focus={target ?? null}
        maxHeight={170}
        ariaLabel="Where to play"
      />
    </div>
  );
}

export default ListenStep;
