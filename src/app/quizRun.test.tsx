import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  RUN_LENGTH,
  STORAGE_KEY,
  finishRun,
  newRun,
  runEvent,
  scoreAnswer,
  type ProgressState,
  type QuizDifficulty,
} from '@/progress';
import { generateQuestion } from '@/quiz';
import { useProgress, type AwardNotice } from './useProgress';

/**
 * A whole quiz run, driven the way the run screen drives it: questions from
 * `generateQuestion`, each answer scored with `scoreAnswer`, recorded as a
 * quiz-answer event, and the run's end recorded as a quiz-run. It goes through
 * the real hook and storage with no screen in between, which is what shows
 * the engine holds together on its own (the screen's own tests are in
 * src/quiz/QuizRun.test.tsx).
 */
async function playRun(difficulty: QuizDifficulty, wrongAt: readonly number[] = []) {
  const hook = renderHook(() => useProgress());
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));

  const heard: AwardNotice[] = [];
  act(() => {
    hook.result.current.subscribeAwards((notice) => heard.push(notice));
  });

  let run = newRun();
  let state: ProgressState = hook.result.current.state;
  act(() => {
    for (let index = 0; index < RUN_LENGTH; index += 1) {
      const question = generateQuestion(difficulty);
      const correct = !wrongAt.includes(index);
      // A question the player gets wrong is answered with an option that is not the answer.
      const picked = correct ? question.correctAnswer : (question.options.find((o) => o !== question.correctAnswer) ?? '');
      run = scoreAnswer(run, picked === question.correctAnswer, difficulty).run;
      hook.result.current.record({ type: 'quiz-answer', correct, itemId: question.id, mode: difficulty });
    }
  });

  let finishAward;
  act(() => {
    finishAward = hook.result.current.record(runEvent(difficulty, finishRun(run)));
  });
  state = hook.result.current.state;
  return { hook, run, state, heard, finishAward: finishAward! };
}

describe('a quiz run, end to end', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('pays a perfect hard run: 15 an answer, 10 for the day, 30 for the stars and 25 for perfection', async () => {
    const { state, run, finishAward } = await playRun('hard');

    expect(run.score).toBe(660);
    expect(finishAward).toMatchObject({ xp: 55, newBest: true, unlocked: ['perfect-hard'] });
    expect(state.xp).toBe(10 * 15 + 10 + 55);
    expect(state.quizBests.hard).toEqual({ best: 660, stars: 3, runs: 1 });
    expect(state.quizBests.easy.runs).toBe(0);
  });

  it('tells a watcher about the last answer and the run itself, separately', async () => {
    const { heard } = await playRun('hard');

    const last = heard[heard.length - 1];
    const answerBeforeIt = heard[heard.length - 2];
    expect(last?.event.type).toBe('quiz-run');
    expect(answerBeforeIt?.event).toMatchObject({ type: 'quiz-answer', mode: 'hard' });
    // The tenth answer in a row is where the streak achievement lands.
    expect(answerBeforeIt?.award.unlocked).toEqual(['streak-10']);
    expect(heard[0]?.award.unlocked).toEqual(['first-correct']);
  });

  it('keeps the answer streak, the daily tally and the review schedule going as it does in free practice', async () => {
    const { state } = await playRun('medium');

    expect(state.streak.longest).toBe(10);
    expect(Object.values(state.daily)[0]).toMatchObject({ answered: 10, correct: 10 });
    expect(Object.keys(state.srs).length).toBeGreaterThan(0);
  });

  it('pays a run with misses by its stars, and scores the combo only on the answers that follow a streak', async () => {
    const { state, run, finishAward } = await playRun('easy', [4, 5]);

    // 8 right: two stars. Right, right, right, x2, wrong, wrong, then x1 again.
    expect(finishAward).toMatchObject({ xp: 20, newBest: true, unlocked: [] });
    expect(run).toMatchObject({ answered: 10, correct: 8 });
    expect(run.score).toBe(10 + 10 + 10 + 20 + 0 + 0 + 10 + 10 + 10 + 20);
    expect(state.quizBests.easy).toEqual({ best: run.score, stars: 2, runs: 1 });
    // 8 right answers at 5, the day's 10, and the run's 20.
    expect(state.xp).toBe(8 * 5 + 10 + 20);
  });

  it('survives a reload: the run is on disk once saved', async () => {
    const { hook } = await playRun('easy');
    act(() => hook.result.current.flush());

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as ProgressState;
    expect(saved.quizBests.easy.runs).toBe(1);
    expect(saved.achievements).toHaveProperty('perfect-easy');
  });
});
