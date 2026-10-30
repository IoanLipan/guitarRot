import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Award, GameEvent } from '@/progress';
import type { AwardNotice } from '@/app/useProgress';
import { NO_AWARD } from '@/app/testkit';
import { AwardLayer, LEVEL_UP_GUARD_MS, PILL_MS, TOAST_EXIT_MS, TOAST_VISIBLE_MS } from './AwardLayer';
import { awardReducer, initialAwardState, type AwardPhase } from './awardState';

vi.mock('@/app/haptics', () => ({ tapHaptic: vi.fn() }));

let serial = 0;
function notice(event: GameEvent, award: Partial<Award>): AwardNotice {
  serial += 1;
  return { id: serial, event, award: { ...NO_AWARD, ...award } };
}

const answer: GameEvent = { type: 'quiz-answer', correct: true, mode: 'practice', itemId: 'note-s1f1' };
const song: GameEvent = { type: 'song-played', songId: 'tom-dooley' };

/** A progress handle whose awards the test sends by hand. */
function wire() {
  let listener: (value: AwardNotice) => void = () => {};
  const subscribeAwards = vi.fn((next: (value: AwardNotice) => void) => {
    listener = next;
    return () => {};
  });
  return { subscribeAwards, send: (value: AwardNotice) => act(() => listener(value)) };
}

function mount(phase: AwardPhase = 'idle') {
  const progress = wire();
  const onOpenPick = vi.fn();
  const view = render(<AwardLayer progress={progress} phase={phase} onOpenPick={onOpenPick} />);
  const setPhase = (next: AwardPhase) =>
    view.rerender(<AwardLayer progress={progress} phase={next} onOpenPick={onOpenPick} />);
  return { ...progress, onOpenPick, setPhase, ...view };
}

describe('the award reducer', () => {
  const send = (state = initialAwardState, hold = false, value: AwardNotice = notice(answer, { unlocked: ['first-correct'] })) =>
    awardReducer(state, { type: 'notice', notice: value, hold });

  it('shows one unlock at a time and queues the rest in the order they came', () => {
    const state = send(initialAwardState, false, notice(answer, { unlocked: ['first-correct', 'streak-10'] }));

    expect(state.toast?.id).toBe('first-correct');
    expect(state.toastQueue).toEqual(['streak-10']);
    const next = awardReducer(state, { type: 'toast-done' });
    expect(next.toast?.id).toBe('streak-10');
    expect(awardReducer(next, { type: 'toast-done' }).toast).toBeNull();
  });

  it('gives a level the whole screen first and holds the toasts behind it', () => {
    const state = send(
      initialAwardState,
      false,
      notice(answer, { unlocked: ['level-5'], levelBefore: 4, levelAfter: 5 }),
    );

    expect(state.levelUp?.level).toBe(5);
    expect(state.toast).toBeNull();
    expect(state.toastQueue).toEqual(['level-5']);
    const done = awardReducer(state, { type: 'level-done' });
    expect(done.levelUp).toBeNull();
    expect(done.toast?.id).toBe('level-5');
  });

  it('says "+XP" for what is not a quiz answer, and keeps quiet about answers', () => {
    expect(send(initialAwardState, false, notice(song, { xp: 20 })).pill?.xp).toBe(20);
    expect(send(initialAwardState, false, notice(answer, { xp: 5 })).pill).toBeNull();
    expect(send(initialAwardState, false, notice({ type: 'quiz-run', difficulty: 'easy', correct: 9, total: 10, score: 200 }, { xp: 40 })).pill).toBeNull();
    expect(send(initialAwardState, false, notice(song, { xp: 0 })).pill).toBeNull();
  });

  it('keeps what arrives during a run for later instead of showing it', () => {
    const held = send(initialAwardState, true, notice(answer, { unlocked: ['first-correct'], levelBefore: 2, levelAfter: 3 }));

    expect(held.toast).toBeNull();
    expect(held.levelUp).toBeNull();
    expect(held.held).toEqual({ toasts: ['first-correct'], level: 3 });
  });

  it('after results: drops the unlocks the results showed, and still owes the level', () => {
    const held = send(initialAwardState, true, notice(answer, { unlocked: ['first-correct'], levelBefore: 2, levelAfter: 3 }));
    const released = awardReducer(held, { type: 'release', presented: true });

    expect(released.toast).toBeNull();
    expect(released.toastQueue).toEqual([]);
    expect(released.levelUp?.level).toBe(3);
    expect(released.held).toEqual({ toasts: [], level: null });
  });

  it('after a quit: owes everything the run unlocked, level first', () => {
    const held = send(initialAwardState, true, notice(answer, { unlocked: ['first-correct', 'streak-10'], levelBefore: 2, levelAfter: 3 }));
    const released = awardReducer(held, { type: 'release', presented: false });

    expect(released.levelUp?.level).toBe(3);
    expect(released.toastQueue).toEqual(['first-correct', 'streak-10']);
  });

  it('shows only the highest of several levels reached while held', () => {
    let state = send(initialAwardState, true, notice(answer, { levelBefore: 2, levelAfter: 3 }));
    state = send(state, true, notice(answer, { levelBefore: 3, levelAfter: 4 }));
    expect(awardReducer(state, { type: 'release', presented: true }).levelUp?.level).toBe(4);
  });

  it('clears a pill only when it is the one that was showing', () => {
    const state = send(initialAwardState, false, notice(song, { xp: 20 }));
    const key = state.pill!.key;
    expect(awardReducer(state, { type: 'pill-done', key: key + 1 }).pill).not.toBeNull();
    expect(awardReducer(state, { type: 'pill-done', key }).pill).toBeNull();
  });
});

describe('AwardLayer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows an unlock from the top with the pick and its name, and then goes away by itself', () => {
    const { send } = mount();

    send(notice(song, { xp: 20, unlocked: ['first-song'] }));

    const toast = screen.getByTestId('unlock-toast');
    expect(toast).toHaveTextContent('Unlocked: First song');
    expect(toast).toHaveTextContent('Play any song for 20 seconds.');
    expect(toast.querySelector('svg')).toHaveAttribute('data-tier', 'celluloid');

    act(() => void vi.advanceTimersByTime(TOAST_VISIBLE_MS + 10));
    expect(screen.getByTestId('unlock-toast')).toHaveAttribute('data-state', 'leaving');
    act(() => void vi.advanceTimersByTime(TOAST_EXIT_MS));
    expect(screen.queryByTestId('unlock-toast')).toBeNull();
  });

  it('shows two awards that land in one tap as two toasts, in order, one at a time', () => {
    const { send } = mount();

    // The last answer of a run and its run: both arrive in the same tick.
    send(notice(answer, { unlocked: ['streak-10'] }));
    send(notice({ type: 'quiz-run', difficulty: 'easy', correct: 10, total: 10, score: 220 }, { unlocked: ['perfect-easy'] }));

    expect(screen.getAllByTestId('unlock-toast')).toHaveLength(1);
    expect(screen.getByTestId('unlock-toast')).toHaveTextContent('Unlocked: Ten in a row');

    act(() => void vi.advanceTimersByTime(TOAST_VISIBLE_MS + TOAST_EXIT_MS + 10));

    expect(screen.getAllByTestId('unlock-toast')).toHaveLength(1);
    expect(screen.getByTestId('unlock-toast')).toHaveTextContent('Unlocked: Flawless on easy');
  });

  it('opens the pick when its toast is tapped, and takes the toast away', () => {
    const { send, onOpenPick } = mount();
    send(notice(song, { unlocked: ['first-song'] }));

    fireEvent.click(screen.getByTestId('unlock-toast'));

    expect(onOpenPick).toHaveBeenCalledWith('first-song');
    expect(screen.queryByTestId('unlock-toast')).toBeNull();
  });

  it('is announced politely, in a region that stays put', () => {
    mount();
    const regions = screen.getAllByRole('status');
    expect(regions.length).toBeGreaterThanOrEqual(1);
    for (const region of regions) expect(region).toHaveAttribute('aria-live', 'polite');
  });

  it('says "+20 XP" for a song, and removes it when its moment is over', () => {
    const { send } = mount();

    send(notice(song, { xp: 20 }));
    expect(screen.getByTestId('xp-pill')).toHaveTextContent('+20 XP');

    act(() => void vi.advanceTimersByTime(PILL_MS + 10));
    expect(screen.queryByTestId('xp-pill')).toBeNull();
  });

  it('says nothing for XP that came from a quiz answer', () => {
    const { send } = mount();
    send(notice(answer, { xp: 5 }));
    expect(screen.queryByTestId('xp-pill')).toBeNull();
  });

  it('opens a full-screen level-up with the rank, and one button to go on', () => {
    const { send } = mount();

    send(notice(song, { xp: 20, levelBefore: 3, levelAfter: 4 }));

    const overlay = screen.getByTestId('level-up');
    expect(overlay).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByTestId('level-up-title')).toHaveTextContent('Open-Mic Regular');
    expect(overlay).toHaveTextContent('You reached level 4.');
    expect(screen.getByRole('img', { name: 'Level 4, Open-Mic Regular' })).toBeInTheDocument();
    // The pick draws its own outline.
    expect(overlay.querySelector('path.level-draw')).not.toBeNull();
    expect(screen.getByTestId('level-up-continue')).toHaveFocus();
  });

  it('ignores the tap that caused the level-up for a moment, then lets Continue through', () => {
    const { send } = mount();
    send(notice(song, { xp: 20, levelBefore: 3, levelAfter: 4 }));

    fireEvent.click(screen.getByTestId('level-up-continue'));
    expect(screen.getByTestId('level-up')).toBeInTheDocument();

    act(() => void vi.advanceTimersByTime(LEVEL_UP_GUARD_MS + 10));
    fireEvent.click(screen.getByTestId('level-up-continue'));
    expect(screen.queryByTestId('level-up')).toBeNull();
  });

  it('puts the unlock toast after the level-up that came with it', () => {
    const { send } = mount();
    send(notice(song, { xp: 20, levelBefore: 4, levelAfter: 5, unlocked: ['level-5'] }));

    expect(screen.getByTestId('level-up')).toBeInTheDocument();
    expect(screen.queryByTestId('unlock-toast')).toBeNull();

    act(() => void vi.advanceTimersByTime(LEVEL_UP_GUARD_MS + 10));
    fireEvent.click(screen.getByTestId('level-up-continue'));

    expect(screen.getByTestId('unlock-toast')).toHaveTextContent('Unlocked: Level 5');
  });

  describe('while a quiz run is on', () => {
    it('holds its toasts and its level-up back, however many come', () => {
      const { send } = mount('running');

      send(notice(answer, { unlocked: ['first-correct'] }));
      send(notice(answer, { unlocked: ['streak-10'], levelBefore: 2, levelAfter: 3 }));

      expect(screen.queryByTestId('unlock-toast')).toBeNull();
      expect(screen.queryByTestId('level-up')).toBeNull();
    });

    it('leaves the toasts to the results screen, and shows the level-up once the player moves on from it', () => {
      const { send, setPhase } = mount('running');
      send(notice(answer, { unlocked: ['first-correct'], levelBefore: 2, levelAfter: 3 }));
      send(notice({ type: 'quiz-run', difficulty: 'easy', correct: 10, total: 10, score: 220 }, { unlocked: ['perfect-easy'] }));

      setPhase('results');
      expect(screen.queryByTestId('level-up')).toBeNull();
      expect(screen.queryByTestId('unlock-toast')).toBeNull();

      // Play again or Change difficulty: the results are gone.
      setPhase('idle');
      expect(screen.getByTestId('level-up-title')).toHaveTextContent('Riff Apprentice');
      act(() => void vi.advanceTimersByTime(LEVEL_UP_GUARD_MS + 10));
      fireEvent.click(screen.getByTestId('level-up-continue'));
      // What the results screen showed is not announced a second time.
      expect(screen.queryByTestId('unlock-toast')).toBeNull();
    });

    it('shows the level-up over a new run when the player goes straight from results to Play again', () => {
      const { send, setPhase } = mount('running');
      send(notice(answer, { levelBefore: 2, levelAfter: 3 }));
      setPhase('results');

      setPhase('running');

      expect(screen.getByTestId('level-up')).toBeInTheDocument();
    });

    it('gives back what a quit run unlocked, since nothing showed it', () => {
      const { send, setPhase } = mount('running');
      send(notice(answer, { unlocked: ['first-correct'] }));
      expect(screen.queryByTestId('unlock-toast')).toBeNull();

      setPhase('idle');

      expect(screen.getByTestId('unlock-toast')).toHaveTextContent('Unlocked: Right on the note');
    });

    it('stops holding for awards after the run, so the next unlock is shown at once', () => {
      const { send, setPhase } = mount('running');
      setPhase('results');
      setPhase('idle');

      send(notice(song, { unlocked: ['first-song'] }));

      expect(screen.getByTestId('unlock-toast')).toHaveTextContent('Unlocked: First song');
    });
  });
});
