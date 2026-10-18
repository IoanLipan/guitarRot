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
}: {
  plan: StartPlan;
  loading: boolean;
  failed: boolean;
  /** Which button was tapped last; it is the one that shows the loading or retry state. */
  chosen: StartChoice | null;
  /** The app was opened from a shared link: the second button opens that instead of the plain Feed. */
  sharedLink: boolean;
  onChoose: (choice: StartChoice) => void;
}) {
  const learnLabel = labelFor('learn', chosen, loading, failed, startLabel(plan));
  const feedLabel = labelFor('feed', chosen, loading, failed, sharedLink ? 'Open the shared link' : 'Just scroll riffs');

  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-6 bg-ground p-8 text-center">
      <LogoMark className="h-32 w-auto drop-shadow-[0_0_48px_rgba(255,176,32,0.35)]" />
      <div className="flex flex-col items-center gap-2">
        <h1>
          <Wordmark className="text-5xl" />
        </h1>
        <p className="text-base font-semibold text-ink-dim">Scroll less. Play more.</p>
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
          className="min-h-14 rounded-full bg-accent px-8 py-3.5 text-lg leading-tight font-extrabold text-ground shadow-[0_6px_18px_rgba(255,176,32,0.3)] active:scale-95 disabled:opacity-60 disabled:active:scale-100"
        >
          {learnLabel}
        </button>
        <button
          type="button"
          onClick={() => onChoose('feed')}
          disabled={loading}
          data-testid="start-feed"
          className="min-h-12 rounded-full bg-surface-2 px-8 py-3 text-base font-bold text-ink active:scale-95 disabled:opacity-60 disabled:active:scale-100"
        >
          {feedLabel}
        </button>
      </div>

      {failed && (
        <p role="alert" className="max-w-xs text-sm leading-relaxed text-ink-dim" data-testid="start-error">
          The sounds could not be loaded. Check your connection and try again.
        </p>
      )}
    </main>
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
