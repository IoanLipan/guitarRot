import { useEffect, useReducer, useRef, useState, type CSSProperties } from 'react';
import { getAchievement, rankTitle } from '@/progress';
import type { ProgressHandle } from '@/app/useProgress';
import { AchievementPick } from './Pick';
import { LevelEmblem } from './LevelEmblem';
import { awardReducer, initialAwardState, type AwardPhase } from './awardState';
import { useFocusTrap } from './useFocusTrap';

/** How long an unlock toast stays, and how long it takes to leave (see `.toast-enter` in index.css). */
export const TOAST_VISIBLE_MS = 3800;
export const TOAST_EXIT_MS = 220;
/** The "+20 XP" pill lives about as long as its animation (`.xp-pill`). */
export const PILL_MS = 1900;
/** A level-up ignores taps this long, so the tap that caused it cannot also dismiss it. */
export const LEVEL_UP_GUARD_MS = 700;

function UnlockToast({
  id,
  onOpen,
  onDone,
}: {
  id: string;
  onOpen: (id: string) => void;
  onDone: () => void;
}) {
  const achievement = getAchievement(id);
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const leave = setTimeout(() => setLeaving(true), TOAST_VISIBLE_MS);
    const done = setTimeout(() => doneRef.current(), TOAST_VISIBLE_MS + TOAST_EXIT_MS);
    return () => {
      clearTimeout(leave);
      clearTimeout(done);
    };
  }, []);

  if (achievement === undefined) return null;
  return (
    <button
      type="button"
      data-testid="unlock-toast"
      data-state={leaving ? 'leaving' : 'open'}
      onClick={() => {
        onOpen(id);
        doneRef.current();
      }}
      className="toast-enter pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-white/10 bg-surface-2 p-3 pr-4 text-left shadow-[0_14px_40px_rgba(0,0,0,0.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <AchievementPick id={id} earned size={44} className="shrink-0" />
      <span className="flex min-w-0 flex-col">
        <span className="text-[15px] leading-tight font-bold">Unlocked: {achievement.name}</span>
        <span className="text-[13px] leading-snug text-ink-dim">{achievement.howTo}</span>
      </span>
    </button>
  );
}

function LevelUp({ level, onContinue }: { level: number; onContinue: () => void }) {
  const shownAt = useRef(Date.now());
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(rootRef);
  const [emblem] = useState(() => (typeof window !== 'undefined' && window.innerHeight < 700 ? 150 : 196));

  useEffect(() => {
    buttonRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Level ${level} reached`}
      data-testid="level-up"
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-ground/[0.97] px-6 text-center tight:gap-2.5"
    >
      {/* A flat disc of amber behind the pick, not a glow: it grows in as the pick is drawn. */}
      <span
        aria-hidden="true"
        className="level-disc pointer-events-none absolute top-1/2 left-1/2 -mt-[210px] -ml-[210px] h-[420px] w-[420px] rounded-full bg-accent/[0.09]"
      />
      <p className="rise-in relative font-display text-3xl leading-none font-extrabold text-accent" style={{ '--delay': '900ms' } as CSSProperties}>
        Level up
      </p>
      <div className="relative">
        <LevelEmblem level={level} size={emblem} draw />
      </div>
      <p
        className="rise-in relative font-display text-5xl leading-none font-black"
        style={{ '--delay': '1000ms' } as CSSProperties}
        data-testid="level-up-title"
      >
        {rankTitle(level)}
      </p>
      <p className="rise-in relative text-base text-ink-dim" style={{ '--delay': '1100ms' } as CSSProperties}>
        You reached level {level}.
      </p>
      <button
        ref={buttonRef}
        type="button"
        data-testid="level-up-continue"
        onClick={() => {
          if (Date.now() - shownAt.current < LEVEL_UP_GUARD_MS) return;
          onContinue();
        }}
        className="rise-in press relative mt-3 flex min-h-13 w-full max-w-xs items-center justify-center rounded-full bg-accent px-6 text-lg font-extrabold text-ground"
        style={{ '--delay': '1000ms' } as CSSProperties}
      >
        Continue
      </button>
    </div>
  );
}

/**
 * Everything the game says out loud, mounted once for the whole app: a toast
 * from the top for each pick unlocked (one at a time, in order, tap to see it
 * in the case), a full-screen moment for reaching a level, and a small "+20 XP"
 * for what is not a quiz answer.
 *
 * It hears about awards from `subscribeAwards`, which misses none: the last
 * answer of a run and the run itself arrive together in one tap, and both are
 * queued. While a quiz run is on (`phase`) it holds its tongue; the results
 * screen presents what the run earned, and the level-up follows it.
 */
export function AwardLayer({
  progress,
  phase,
  onOpenPick,
}: {
  progress: Pick<ProgressHandle, 'subscribeAwards'>;
  phase: AwardPhase;
  /** A toast was tapped: show that pick. */
  onOpenPick: (achievementId: string) => void;
}) {
  const [state, dispatch] = useReducer(awardReducer, initialAwardState);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const { subscribeAwards } = progress;
  useEffect(
    () =>
      subscribeAwards((notice) => dispatch({ type: 'notice', notice, hold: phaseRef.current !== 'idle' })),
    [subscribeAwards],
  );

  // A run lets go: after its results, what the results showed is not said again; after a quit, it all is.
  const previous = useRef(phase);
  useEffect(() => {
    const before = previous.current;
    previous.current = phase;
    if (before === phase) return;
    if (before === 'results') dispatch({ type: 'release', presented: true });
    else if (before === 'running' && phase === 'idle') dispatch({ type: 'release', presented: false });
  }, [phase]);

  const pillKey = state.pill?.key;
  useEffect(() => {
    if (pillKey === undefined) return;
    const timer = setTimeout(() => dispatch({ type: 'pill-done', key: pillKey }), PILL_MS);
    return () => clearTimeout(timer);
  }, [pillKey]);

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.5rem)] z-[60] flex justify-center"
      >
        {state.toast !== null && (
          <UnlockToast
            key={state.toast.key}
            id={state.toast.id}
            onOpen={onOpenPick}
            onDone={() => dispatch({ type: 'toast-done' })}
          />
        )}
      </div>

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+6.25rem)] z-[60] flex justify-center tight:bottom-[calc(env(safe-area-inset-bottom)+5.25rem)]"
      >
        {state.pill !== null && (
          <p
            key={state.pill.key}
            data-testid="xp-pill"
            className="xp-pill flex h-10 items-center rounded-full bg-accent px-4 font-display text-2xl leading-none font-black text-ground shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
          >
            +{state.pill.xp} XP
          </p>
        )}
      </div>

      {state.levelUp !== null && (
        <LevelUp key={state.levelUp.key} level={state.levelUp.level} onContinue={() => dispatch({ type: 'level-done' })} />
      )}
    </>
  );
}
