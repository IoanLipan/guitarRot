import { INSTRUMENTS, stringCountOf, type InstrumentId } from '@/music';
import { stagger } from '@/ui/motion';
import { tapHaptic } from './haptics';
import { InstrumentArt } from './InstrumentArt';
import { LogoMark, Wordmark } from './Logo';
import type { StartPlan } from './startPlan';
import { startLabel } from './startPlan';

export type StartChoice = 'learn' | 'feed';

/**
 * The first screen, and the fork: learn from the beginning (or where you left
 * off), or just scroll riffs. Either button is also the tap that switches web
 * audio on, so it doubles as the load step: the sound set downloads while
 * the tapped button reads "Loading sounds…".
 */
export function StartScreen({
  plan,
  loading,
  failed,
  chosen,
  sharedLink,
  onChoose,
  needsInstrument = false,
  onPickInstrument,
}: {
  plan: StartPlan;
  loading: boolean;
  failed: boolean;
  /** Which button was tapped last; it is the one that shows the loading or retry state. */
  chosen: StartChoice | null;
  /** The app was opened from a shared link: the second button opens that instead of the plain Feed. */
  sharedLink: boolean;
  onChoose: (choice: StartChoice) => void;
  /** A first run: nobody has said what they play yet, so that is asked before anything else. */
  needsInstrument?: boolean;
  onPickInstrument?: (instrument: InstrumentId) => void;
}) {
  if (needsInstrument && onPickInstrument !== undefined) {
    return <InstrumentChoice onPick={onPickInstrument} />;
  }

  const learnLabel = labelFor('learn', chosen, loading, failed, startLabel(plan));
  const feedLabel = labelFor('feed', chosen, loading, failed, sharedLink ? 'Open the shared link' : 'Just scroll riffs');
  // The tapped button is the one that is working: it keeps full brightness and shows the wheel.
  const learnBusy = loading && chosen === 'learn';
  const feedBusy = loading && chosen === 'feed';

  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-6 bg-ground p-8 text-center">
      {/* The pick drops in with a bounce, on the flat ground: nothing glows behind it. */}
      <LogoMark className="logo-drop h-32 w-auto" />
      <div className="flex flex-col items-center gap-2">
        <h1 className="rise-in" style={stagger(4, 70)}>
          <Wordmark className="text-5xl" />
        </h1>
        <p className="rise-in text-body font-semibold text-ink-dim" style={stagger(5, 70)}>
          Scroll less. Play more.
        </p>
      </div>

      {/* Web audio stays suspended until a real tap, so these buttons are also
          what switches the sound on. */}
      <div className="mt-4 flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          onClick={() => onChoose('learn')}
          // Until progress is read we cannot say "Start" or "Continue", and
          // guessing wrong would send a returning learner back to lesson 1.
          disabled={loading || plan.kind === 'loading'}
          data-testid="start-learn"
          aria-busy={learnBusy || undefined}
          style={stagger(6, 70)}
          className={`rise-in press flex min-h-14 items-center justify-center gap-2.5 rounded-full bg-accent px-8 py-3.5 text-lesson leading-tight font-extrabold text-ground ${
            learnBusy ? '' : 'disabled:opacity-60'
          }`}
        >
          {learnBusy && <Spinner />}
          {learnLabel}
        </button>
        <button
          type="button"
          onClick={() => onChoose('feed')}
          disabled={loading}
          data-testid="start-feed"
          aria-busy={feedBusy || undefined}
          style={stagger(7, 70)}
          className={`rise-in press flex min-h-12 items-center justify-center gap-2.5 rounded-full bg-surface-2 px-8 py-3 text-body font-bold text-ink ${
            feedBusy ? '' : 'disabled:opacity-60'
          }`}
        >
          {feedBusy && <Spinner />}
          {feedLabel}
        </button>
      </div>

      {failed && (
        <p role="alert" className="max-w-xs text-meta leading-relaxed text-ink-dim" data-testid="start-error">
          The sounds could not be loaded. Check your connection and try again.
        </p>
      )}
    </main>
  );
}

const STRING_WORDS: Record<number, string> = { 4: 'Four', 6: 'Six' };

/**
 * The first thing a new player is asked: guitar or ukulele. Two big cards, each
 * the instrument drawn standing up, so it can be answered without reading.
 * Picking one is the whole step; the usual start screen follows.
 */
function InstrumentChoice({ onPick }: { onPick: (instrument: InstrumentId) => void }) {
  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-6 bg-ground p-8 text-center tight:gap-4 tight:p-5">
      <LogoMark className="logo-drop h-24 w-auto tight:h-16" />
      <h1 className="rise-in" style={stagger(2, 70)}>
        <Wordmark className="text-5xl tight:text-4xl" />
      </h1>

      <section aria-labelledby="instrument-question" className="flex w-full max-w-xs flex-col items-center gap-4 tight:gap-3">
        <h2 id="instrument-question" className="rise-in text-title font-black" style={stagger(3, 70)}>
          What do you play?
        </h2>
        <div className="grid w-full grid-cols-2 gap-3">
          {INSTRUMENTS.map((instrument, index) => {
            const strings = stringCountOf(instrument);
            return (
              <button
                key={instrument.id}
                type="button"
                data-testid={`pick-${instrument.id}`}
                onClick={() => {
                  tapHaptic();
                  onPick(instrument.id);
                }}
                style={stagger(4 + index, 70)}
                className="rise-in press press-soft flex flex-col items-center gap-2 rounded-3xl bg-surface-2 px-3 pt-4 pb-3.5 tight:gap-1.5 tight:pt-3 tight:pb-3"
              >
                <InstrumentArt id={instrument.id} className="h-40 w-auto tight:h-28" />
                <span className="text-lesson font-extrabold">{instrument.name}</span>
                <span className="label -mt-1.5">{STRING_WORDS[strings] ?? strings} strings</span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

/** The wheel on a button that is working. It is the button's own text colour. */
function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4.5 w-4.5 shrink-0 animate-spin rounded-full border-[2.5px] border-current border-t-transparent"
    />
  );
}

function labelFor(
  button: StartChoice,
  chosen: StartChoice | null,
  loading: boolean,
  failed: boolean,
  idle: string,
): string {
  if (chosen !== button) return idle;
  if (loading) return 'Loading sounds…';
  if (failed) return 'Try again';
  return idle;
}
