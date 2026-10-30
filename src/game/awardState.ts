import type { AwardNotice } from '@/app/useProgress';

/**
 * Whether a quiz run is on, which is when the layer must not talk over it:
 * 'running' while its questions are being answered, 'results' while its results
 * screen is up (and that screen shows everything the run earned itself).
 */
export type AwardPhase = 'idle' | 'running' | 'results';

export type AwardLayerState = {
  /** Unlocks waiting for their turn, oldest first. */
  toastQueue: string[];
  /** The unlock on screen. */
  toast: { key: number; id: string } | null;
  /** A level reached, waiting for the screen to be free. */
  levelPending: number | null;
  /** The level-up on screen. */
  levelUp: { key: number; level: number } | null;
  /** "+20 XP" on screen. */
  pill: { key: number; xp: number } | null;
  /** What arrived during a run, kept for when the run lets go. */
  held: { toasts: string[]; level: number | null };
  /** Counts everything shown, so each is a fresh element that plays its entrance. */
  serial: number;
};

export const initialAwardState: AwardLayerState = {
  toastQueue: [],
  toast: null,
  levelPending: null,
  levelUp: null,
  pill: null,
  held: { toasts: [], level: null },
  serial: 0,
};

export type AwardAction =
  | { type: 'notice'; notice: AwardNotice; hold: boolean }
  | { type: 'toast-done' }
  | { type: 'level-done' }
  | { type: 'pill-done'; key: number }
  /**
   * The run is over. `presented` means its results screen showed the picks it
   * unlocked, so their toasts would only say it twice; a run quit half way
   * showed nothing, and its unlocks are still owed. A level reached is owed either way.
   */
  | { type: 'release'; presented: boolean };

const maxLevel = (a: number | null, b: number | null): number | null =>
  a === null ? b : b === null ? a : Math.max(a, b);

/** One thing at a time: a level-up has the whole screen, so toasts wait behind it. */
function settle(state: AwardLayerState): AwardLayerState {
  let next = state;
  if (next.levelUp === null && next.levelPending !== null) {
    next = {
      ...next,
      levelUp: { key: next.serial + 1, level: next.levelPending },
      levelPending: null,
      serial: next.serial + 1,
    };
  }
  if (next.levelUp === null && next.toast === null && next.toastQueue.length > 0) {
    const [id, ...rest] = next.toastQueue;
    next = { ...next, toast: { key: next.serial + 1, id: id! }, toastQueue: rest, serial: next.serial + 1 };
  }
  return next;
}

export function awardReducer(state: AwardLayerState, action: AwardAction): AwardLayerState {
  switch (action.type) {
    case 'notice': {
      const { event, award } = action.notice;
      const reached = award.levelAfter > award.levelBefore ? award.levelAfter : null;
      if (action.hold) {
        return {
          ...state,
          held: {
            toasts: [...state.held.toasts, ...award.unlocked],
            level: maxLevel(state.held.level, reached),
          },
        };
      }
      // Quiz answers already say what they earned (a right answer lights up, a run has its results);
      // "+5 XP" after every one would be noise. Everything else gets the pill.
      const quiz = event.type === 'quiz-answer' || event.type === 'quiz-run';
      const showPill = !quiz && award.xp > 0;
      return settle({
        ...state,
        toastQueue: [...state.toastQueue, ...award.unlocked],
        levelPending: maxLevel(state.levelPending, reached),
        pill: showPill ? { key: state.serial + 1, xp: award.xp } : state.pill,
        serial: showPill ? state.serial + 1 : state.serial,
      });
    }
    case 'toast-done':
      return settle({ ...state, toast: null });
    case 'level-done':
      return settle({ ...state, levelUp: null });
    case 'pill-done':
      return state.pill?.key === action.key ? { ...state, pill: null } : state;
    case 'release':
      return settle({
        ...state,
        toastQueue: action.presented ? state.toastQueue : [...state.toastQueue, ...state.held.toasts],
        levelPending: maxLevel(state.levelPending, state.held.level),
        held: { toasts: [], level: null },
      });
  }
}
