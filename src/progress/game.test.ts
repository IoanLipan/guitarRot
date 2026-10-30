import { describe, expect, it } from 'vitest';
import { SONGS } from '@/content';
import { ACHIEVEMENTS, courseUnits } from './achievements';
import {
  BASE_POINTS,
  MAX_MULTIPLIER,
  RUN_LENGTH,
  XP,
  applyGameEvent,
  comboMultiplier,
  finishRun,
  newRun,
  runEvent,
  runStars,
  scoreAnswer,
  type GameEvent,
} from './game';
import { levelForXp, xpForLevel } from './levels';
import { emptyProgressState, type ProgressState, type QuizDifficulty } from './types';

/** Local noon on a day of 2026, so the date it falls on is the same in every time zone. */
const at = (month: number, day: number, hour = 12): Date => new Date(2026, month - 1, day, hour);
const OCT_30 = at(10, 30);

function apply(state: ProgressState, event: GameEvent, now: Date = OCT_30) {
  return applyGameEvent(state, event, now);
}

/** A state that has already practiced today, so the first-practice bonus is out of the way. */
function warm(patch: Partial<ProgressState> = {}): ProgressState {
  return {
    ...emptyProgressState(),
    practiceDays: ['2026-10-30'],
    dayStreak: { current: 1, longest: 1, lastDate: '2026-10-30' },
    ...patch,
  };
}

describe('the XP table', () => {
  it('pays what the game says it pays', () => {
    expect(XP.quizCorrect).toEqual({ easy: 5, medium: 10, hard: 15, practice: 5 });
    expect(XP.runStar).toBe(10);
    expect(XP.runPerfect).toBe(25);
    expect(XP.lesson).toBe(50);
    expect(XP.songFirst).toBe(20);
    expect(XP.songRepeat).toBe(5);
    expect(XP.firstPracticeOfDay).toBe(10);
    expect(XP.tunedAll).toBe(15);
  });
});

describe('comboMultiplier', () => {
  it.each([
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 2],
    [4, 2],
    [5, 2],
    [6, 3],
    [8, 3],
    [9, 4],
    [10, 4],
    [40, 4],
  ])('after %i right in a row the next answer is x%i', (before, multiplier) => {
    expect(comboMultiplier(before)).toBe(multiplier);
  });

  it('is capped at 4', () => {
    expect(MAX_MULTIPLIER).toBe(4);
    expect(comboMultiplier(1000)).toBe(4);
  });
});

describe('scoreAnswer', () => {
  function play(difficulty: QuizDifficulty, answers: readonly boolean[]) {
    let run = newRun();
    return answers.map((correct) => {
      const scored = scoreAnswer(run, correct, difficulty);
      run = scored.run;
      return scored;
    });
  }

  it('pays the base for the first three, then doubles for the next three, and so on', () => {
    const points = play('easy', Array<boolean>(10).fill(true)).map((scored) => scored.points);
    expect(points).toEqual([10, 10, 10, 20, 20, 20, 30, 30, 30, 40]);
  });

  it('adds up a perfect run: 220 easy, 440 medium, 660 hard', () => {
    const total = (difficulty: QuizDifficulty) =>
      play(difficulty, Array<boolean>(RUN_LENGTH).fill(true)).at(-1)?.run.score;
    expect(total('easy')).toBe(220);
    expect(total('medium')).toBe(440);
    expect(total('hard')).toBe(660);
  });

  it('bases points on the difficulty', () => {
    expect(BASE_POINTS).toEqual({ easy: 10, medium: 20, hard: 30 });
    expect(play('hard', [true])[0]?.points).toBe(30);
  });

  it('reports the combo after each answer, and the multiplier the next one will earn', () => {
    const [first, second, third, fourth] = play('easy', [true, true, true, true]);
    expect([first?.combo, second?.combo, third?.combo, fourth?.combo]).toEqual([1, 2, 3, 4]);
    expect([first?.multiplier, second?.multiplier, third?.multiplier, fourth?.multiplier]).toEqual([1, 1, 1, 2]);
    // The third right answer is still paid at x1, but the fourth will be x2.
    expect(third?.nextMultiplier).toBe(2);
    expect(second?.nextMultiplier).toBe(1);
  });

  it('scores nothing for a wrong answer and breaks the combo', () => {
    const scored = play('medium', [true, true, true, true, false, true]);
    expect(scored[4]).toMatchObject({ points: 0, multiplier: 1, combo: 0, nextMultiplier: 1 });
    // After the miss the multiplier starts over.
    expect(scored[5]?.points).toBe(20);
    expect(scored[5]?.combo).toBe(1);
  });

  it('counts answered and correct, and does not touch the run it was given', () => {
    const before = newRun();
    const { run } = scoreAnswer(before, true, 'easy');
    expect(run).toEqual({ answered: 1, correct: 1, combo: 1, score: 10 });
    expect(before).toEqual({ answered: 0, correct: 0, combo: 0, score: 0 });
  });
});

describe('runStars', () => {
  it.each([
    [0, 0],
    [4, 0],
    [5, 1],
    [7, 1],
    [8, 2],
    [9, 2],
    [10, 3],
  ])('%i right is %i stars', (correct, stars) => {
    expect(runStars(correct)).toBe(stars);
  });
});

describe('finishRun', () => {
  function runOf(correctAnswers: number, difficulty: QuizDifficulty = 'easy') {
    let run = newRun();
    for (let i = 0; i < RUN_LENGTH; i += 1) run = scoreAnswer(run, i < correctAnswers, difficulty).run;
    return finishRun(run);
  }

  it('reports the score, the stars and whether it was perfect', () => {
    expect(runOf(10)).toEqual({ correct: 10, total: 10, score: 220, stars: 3, perfect: true });
    expect(runOf(9)).toMatchObject({ correct: 9, stars: 2, perfect: false });
    expect(runOf(5)).toMatchObject({ stars: 1, perfect: false });
    expect(runOf(4)).toMatchObject({ stars: 0 });
  });

  it('turns into the event that records it', () => {
    expect(runEvent('hard', runOf(8, 'hard'))).toEqual({
      type: 'quiz-run',
      difficulty: 'hard',
      correct: 8,
      total: 10,
      score: runOf(8, 'hard').score,
    });
  });
});

describe('applyGameEvent: quiz answers', () => {
  it('keeps the answer streak, the daily tally and the review schedule just as applyAnswer does', () => {
    const { state } = apply(emptyProgressState(), {
      type: 'quiz-answer',
      correct: true,
      itemId: 'note-s0f3',
      mode: 'practice',
    });
    expect(state.streak).toEqual({ current: 1, longest: 1, lastActiveDate: '2026-10-30' });
    expect(state.daily['2026-10-30']).toEqual({ date: '2026-10-30', answered: 1, correct: 1 });
    expect(state.srs['note-s0f3']?.dueAt).toBe(OCT_30.getTime() + 24 * 60 * 60 * 1000);
  });

  it('breaks the answer streak on a miss and keeps the longest', () => {
    let { state } = apply(warm(), { type: 'quiz-answer', correct: true, mode: 'practice' });
    ({ state } = apply(state, { type: 'quiz-answer', correct: true, mode: 'practice' }));
    ({ state } = apply(state, { type: 'quiz-answer', correct: false, mode: 'practice' }));
    expect(state.streak).toMatchObject({ current: 0, longest: 2 });
  });

  it.each([
    ['easy', 5],
    ['medium', 10],
    ['hard', 15],
    ['practice', 5],
  ] as const)('pays a right %s answer %i xp', (mode, xp) => {
    expect(apply(warm(), { type: 'quiz-answer', correct: true, mode }).award.xp).toBe(xp);
  });

  it('pays nothing for a wrong one', () => {
    const { award, state } = apply(warm(), { type: 'quiz-answer', correct: false, mode: 'hard' });
    expect(award.xp).toBe(0);
    expect(state.xp).toBe(0);
  });

  it('records the answer on the state it returns', () => {
    const { state, award } = apply(warm({ xp: 40 }), { type: 'quiz-answer', correct: true, mode: 'medium' });
    expect(state.xp).toBe(50);
    expect(award).toMatchObject({ xp: 10, levelBefore: 1, levelAfter: 1, firstOfDay: false });
  });
});

describe('applyGameEvent: the practice day', () => {
  it('pays 10 for the first practice of the day, once', () => {
    const first = apply(emptyProgressState(), { type: 'quiz-answer', correct: true, mode: 'easy' });
    expect(first.award).toMatchObject({ xp: 5 + 10, firstOfDay: true, dayStreak: 1 });
    expect(first.state.practiceDays).toEqual(['2026-10-30']);

    const second = apply(first.state, { type: 'quiz-answer', correct: true, mode: 'easy' });
    expect(second.award).toMatchObject({ xp: 5, firstOfDay: false, dayStreak: 1 });
    expect(second.state.practiceDays).toEqual(['2026-10-30']);
  });

  it('pays it on a wrong answer too: showing up is the point', () => {
    const { award } = apply(emptyProgressState(), { type: 'quiz-answer', correct: false, mode: 'hard' });
    expect(award.xp).toBe(10);
  });

  it('counts every kind of event as practice', () => {
    const events: GameEvent[] = [
      { type: 'quiz-answer', correct: false, mode: 'practice' },
      { type: 'quiz-run', difficulty: 'easy', correct: 0, total: 10, score: 0 },
      { type: 'lesson-done', lessonId: 'strings' },
      { type: 'song-played', songId: 'amazing-grace' },
      { type: 'tuned-all' },
    ];
    for (const event of events) {
      expect(apply(emptyProgressState(), event).award.firstOfDay).toBe(true);
    }
  });

  it('extends the day streak the next day and pays the bonus again', () => {
    const day1 = apply(emptyProgressState(), { type: 'tuned-all' }, at(10, 30));
    const day2 = apply(day1.state, { type: 'tuned-all' }, at(10, 31));
    expect(day2.award).toMatchObject({ firstOfDay: true, dayStreak: 2, xp: XP.tunedAll + XP.firstPracticeOfDay });
    expect(day2.state.dayStreak).toEqual({ current: 2, longest: 2, lastDate: '2026-10-31' });
  });

  it('carries the streak across the end of a month and a year', () => {
    let { state } = apply(emptyProgressState(), { type: 'tuned-all' }, at(1, 30));
    ({ state } = apply(state, { type: 'tuned-all' }, at(1, 31)));
    const { award } = apply(state, { type: 'tuned-all' }, at(2, 1));
    expect(award.dayStreak).toBe(3);

    const newYear = apply(
      { ...emptyProgressState(), dayStreak: { current: 4, longest: 4, lastDate: '2026-12-31' }, practiceDays: ['2026-12-31'] },
      { type: 'tuned-all' },
      new Date(2027, 0, 1, 9),
    );
    expect(newYear.award.dayStreak).toBe(5);
  });

  it('starts the streak over at 1 after a gap, and remembers the longest', () => {
    let { state } = apply(emptyProgressState(), { type: 'tuned-all' }, at(10, 20));
    ({ state } = apply(state, { type: 'tuned-all' }, at(10, 21)));
    const { award, state: after } = apply(state, { type: 'tuned-all' }, at(10, 23));
    expect(award.dayStreak).toBe(1);
    expect(after.dayStreak).toEqual({ current: 1, longest: 2, lastDate: '2026-10-23' });
  });

  it('goes by the local date: 23:30 and 00:30 are consecutive days', () => {
    const late = apply(emptyProgressState(), { type: 'tuned-all' }, new Date(2026, 9, 30, 23, 30));
    const early = apply(late.state, { type: 'tuned-all' }, new Date(2026, 9, 31, 0, 30));
    expect(early.award).toMatchObject({ firstOfDay: true, dayStreak: 2 });
  });

  it('leaves the day streak alone when the clock reads earlier than the last practice', () => {
    const ahead = warm({ dayStreak: { current: 6, longest: 6, lastDate: '2026-11-05' }, practiceDays: ['2026-11-05'] });
    const { state } = apply(ahead, { type: 'tuned-all' });
    expect(state.dayStreak).toEqual({ current: 6, longest: 6, lastDate: '2026-11-05' });
  });

  it('unlocks the day-streak achievements on the day they are reached', () => {
    let state = emptyProgressState();
    const unlocked: string[][] = [];
    for (const day of [28, 29, 30]) {
      const result = apply(state, { type: 'quiz-answer', correct: false, mode: 'practice' }, at(9, day));
      state = result.state;
      unlocked.push(result.award.unlocked);
    }
    expect(unlocked).toEqual([[], [], ['days-3']]);
    expect(state.achievements['days-3']).toBe('2026-09-30');
  });
});

describe('applyGameEvent: quiz runs', () => {
  const run = (patch: Partial<Extract<GameEvent, { type: 'quiz-run' }>> = {}): GameEvent => ({
    type: 'quiz-run',
    difficulty: 'medium',
    correct: 10,
    total: 10,
    score: 440,
    ...patch,
  });

  it.each([
    [10, 30 + 25],
    [9, 20],
    [8, 20],
    [7, 10],
    [5, 10],
    [4, 0],
    [0, 0],
  ])('pays %i right out of 10 %i xp', (correct, xp) => {
    expect(apply(warm(), run({ correct })).award.xp).toBe(xp);
  });

  it('records the run: score, stars and the count', () => {
    const { state } = apply(warm(), run({ correct: 8, score: 250 }));
    expect(state.quizBests.medium).toEqual({ best: 250, stars: 2, runs: 1 });
    expect(state.quizBests.easy).toEqual({ best: 0, stars: 0, runs: 0 });
  });

  it('calls a higher score a new best, and only a higher one', () => {
    const first = apply(warm(), run({ correct: 8, score: 250 }));
    expect(first.award.newBest).toBe(true);

    const lower = apply(first.state, run({ correct: 6, score: 120 }));
    expect(lower.award.newBest).toBe(false);
    expect(lower.state.quizBests.medium).toEqual({ best: 250, stars: 2, runs: 2 });

    const equal = apply(lower.state, run({ correct: 8, score: 250 }));
    expect(equal.award.newBest).toBe(false);

    const higher = apply(equal.state, run({ correct: 9, score: 300 }));
    expect(higher.award.newBest).toBe(true);
    expect(higher.state.quizBests.medium).toEqual({ best: 300, stars: 2, runs: 4 });
  });

  it('keeps the best stars, not the latest', () => {
    const great = apply(warm(), run({ correct: 10 })).state;
    expect(apply(great, run({ correct: 5, score: 50 })).state.quizBests.medium.stars).toBe(3);
  });

  it('does not set newBest on events that are not runs', () => {
    expect(apply(warm(), { type: 'tuned-all' }).award).not.toHaveProperty('newBest');
  });

  it('unlocks the perfect-run achievement for that difficulty and no other', () => {
    const { award } = apply(warm(), run({ difficulty: 'hard', correct: 10, score: 660 }));
    expect(award.unlocked).toEqual(['perfect-hard']);
  });

  it('unlocks the run-count achievements at 5 and 25', () => {
    let state = warm();
    const unlockedAt: number[] = [];
    for (let n = 1; n <= 25; n += 1) {
      const result = apply(state, run({ difficulty: n % 2 === 0 ? 'easy' : 'hard', correct: 3, score: 30 }));
      state = result.state;
      if (result.award.unlocked.length > 0) unlockedAt.push(n);
    }
    expect(unlockedAt).toEqual([5, 25]);
  });

  it('ignores a run that is not RUN_LENGTH questions, so a 1-for-1 cannot pass for a perfect one', () => {
    const before = warm();
    const { state, award } = apply(before, run({ total: 1, correct: 1, score: 10 }));
    expect(state).toBe(before);
    expect(award).toMatchObject({ xp: 0, unlocked: [], firstOfDay: false });
  });

  it('keeps nonsense out of the numbers', () => {
    const { state, award } = apply(warm(), run({ correct: 99, score: -50 }));
    expect(state.quizBests.medium).toEqual({ best: 0, stars: 3, runs: 1 });
    expect(award.xp).toBe(55);
    expect(apply(warm(), run({ correct: Number.NaN, score: Number.NaN })).award.xp).toBe(0);
  });
});

describe('applyGameEvent: lessons', () => {
  it('pays 50 the first time a lesson is finished and records it', () => {
    const { state, award } = apply(warm(), { type: 'lesson-done', lessonId: 'strings' });
    expect(award.xp).toBe(50);
    expect(state.lessonsDone).toEqual(['strings']);
    expect(award.unlocked).toEqual(['first-lesson']);
  });

  it('pays nothing the second time', () => {
    const once = apply(warm(), { type: 'lesson-done', lessonId: 'strings' }).state;
    const again = apply(once, { type: 'lesson-done', lessonId: 'strings' });
    expect(again.award).toMatchObject({ xp: 0, unlocked: [] });
    expect(again.state.lessonsDone).toEqual(['strings']);
    expect(again.state.xp).toBe(50);
  });

  it('ignores a lesson with no id', () => {
    const before = warm();
    expect(apply(before, { type: 'lesson-done', lessonId: '' }).state).toBe(before);
  });

  it('unlocks a unit when its last lesson is finished', () => {
    const [first, ...rest] = courseUnits()[0]?.lessonIds ?? [];
    const result = apply(warm({ lessonsDone: rest }), { type: 'lesson-done', lessonId: first ?? '' });
    expect(result.award.unlocked).toEqual(['first-lesson', 'first-unit']);
  });
});

describe('applyGameEvent: songs', () => {
  const play = (songId: string): GameEvent => ({ type: 'song-played', songId });

  it('pays 20 the first time a song is ever played', () => {
    const { award, state } = apply(warm(), play('amazing-grace'));
    expect(award.xp).toBe(20);
    expect(state.songsPlayed).toEqual(['amazing-grace']);
    expect(award.unlocked).toEqual(['first-song']);
  });

  it('pays nothing for the same song again on the same day', () => {
    const once = apply(warm(), play('amazing-grace')).state;
    const again = apply(once, play('amazing-grace'));
    expect(again.award.xp).toBe(0);
    expect(again.state.songsPlayed).toEqual(['amazing-grace']);
  });

  it('pays 5 for that song on a later day, and again nothing the same day', () => {
    const day1 = apply(emptyProgressState(), play('amazing-grace'), at(10, 29)).state;
    const day2 = apply(day1, play('amazing-grace'), at(10, 30));
    expect(day2.award.xp).toBe(XP.songRepeat + XP.firstPracticeOfDay);
    expect(apply(day2.state, play('amazing-grace'), at(10, 30)).award.xp).toBe(0);
  });

  it('pays 20 for each new song, each day it is played the first time', () => {
    const a = apply(warm(), play('amazing-grace')).state;
    const b = apply(a, play('greensleeves'));
    expect(b.award.xp).toBe(20);
    expect(b.state.songsPlayed).toEqual(['amazing-grace', 'greensleeves']);
    expect(b.state.songsToday).toEqual({ date: '2026-10-30', ids: ['amazing-grace', 'greensleeves'] });
  });

  it('counts a song once however often it is played', () => {
    let state = warm();
    for (const day of [26, 27, 28]) state = apply(state, play('amazing-grace'), at(10, day)).state;
    expect(state.songsPlayed).toEqual(['amazing-grace']);
  });

  it('unlocks the song-count achievements at 5, 15 and 30 different songs', () => {
    let state = warm();
    const unlockedAt: Record<number, string[]> = {};
    SONGS.slice(0, 30).forEach((song, index) => {
      const result = apply(state, play(song.id));
      state = result.state;
      const real = result.award.unlocked.filter((id) => id.startsWith('songs-') || id === 'first-song');
      if (real.length > 0) unlockedAt[index + 1] = real;
    });
    expect(unlockedAt).toEqual({ 1: ['first-song'], 5: ['songs-5'], 15: ['songs-15'], 30: ['songs-30'] });
  });

  it('ignores a song with no id', () => {
    const before = warm();
    expect(apply(before, play('')).state).toBe(before);
  });
});

describe('applyGameEvent: the tuner', () => {
  it('pays 15 for tuning all six strings, and unlocks the milestone', () => {
    const { award, state } = apply(warm(), { type: 'tuned-all' });
    expect(award.xp).toBe(15);
    expect(award.unlocked).toEqual(['tuned-up']);
    expect(state.tunedAllDate).toBe('2026-10-30');
  });

  it('pays once a day', () => {
    const once = apply(warm(), { type: 'tuned-all' }).state;
    expect(apply(once, { type: 'tuned-all' }, at(10, 30, 20)).award.xp).toBe(0);
  });

  it('pays again the next day', () => {
    const once = apply(warm(), { type: 'tuned-all' }).state;
    const next = apply(once, { type: 'tuned-all' }, at(10, 31));
    expect(next.award.xp).toBe(XP.tunedAll + XP.firstPracticeOfDay);
    expect(next.award.unlocked).toEqual([]);
  });
});

describe('applyGameEvent: levels and unlocks', () => {
  it('reports the level before and after when an event carries across a boundary', () => {
    const { award } = apply(warm({ xp: 95 }), { type: 'quiz-answer', correct: true, mode: 'hard' });
    expect(award).toMatchObject({ xp: 15, levelBefore: 1, levelAfter: 2 });
  });

  it('can jump more than one level at once', () => {
    const { award } = apply(warm({ xp: 90 }), { type: 'lesson-done', lessonId: 'a' });
    expect(award).toMatchObject({ levelBefore: 1, levelAfter: 2 });
    const big = apply(warm({ xp: xpForLevel(3) - 10 }), { type: 'lesson-done', lessonId: 'a' });
    expect(big.award.levelAfter).toBe(3);
  });

  it('unlocks the level achievements on the event that reaches the level', () => {
    const five = apply(warm({ xp: xpForLevel(5) - 5 }), { type: 'quiz-answer', correct: true, mode: 'practice' });
    expect(five.award.unlocked).toEqual(['first-correct', 'level-5']);
    const ten = apply(warm({ xp: xpForLevel(10) - 5, achievements: { 'level-5': '2026-01-01' } }), {
      type: 'quiz-answer',
      correct: true,
      mode: 'practice',
    });
    expect(ten.award.unlocked).toEqual(['first-correct', 'level-10']);
  });

  it('lists several unlocks from one event in catalogue order', () => {
    const state = warm({ streak: { current: 9, longest: 9, lastActiveDate: null } });
    const { award } = apply(state, { type: 'quiz-answer', correct: true, mode: 'practice' });
    expect(award.unlocked).toEqual(['first-correct', 'streak-10']);
    const order = ACHIEVEMENTS.map((achievement) => achievement.id);
    expect(award.unlocked).toEqual([...award.unlocked].sort((a, b) => order.indexOf(a) - order.indexOf(b)));
  });

  it('unlocks each achievement once, dated the day it was earned', () => {
    const first = apply(warm(), { type: 'quiz-answer', correct: true, mode: 'practice' }, at(10, 30));
    expect(first.state.achievements['first-correct']).toBe('2026-10-30');

    const later = apply(first.state, { type: 'quiz-answer', correct: true, mode: 'practice' }, at(11, 2));
    expect(later.award.unlocked).toEqual([]);
    expect(later.state.achievements['first-correct']).toBe('2026-10-30');
  });

  it('also unlocks, on the next event, an achievement the state already earns but never recorded', () => {
    // As when an update adds an achievement to the catalogue: nothing is recorded for it yet.
    const { award } = apply(warm({ tunedAllDate: '2026-09-01' }), { type: 'quiz-answer', correct: false, mode: 'practice' });
    expect(award.unlocked).toEqual(['tuned-up']);
  });
});

describe('applyGameEvent: guarantees', () => {
  it('does not change the state it is given', () => {
    const before = warm({ lessonsDone: ['x'], songsPlayed: ['a'] });
    const snapshot = structuredClone(before);
    for (const event of [
      { type: 'quiz-answer', correct: true, itemId: 'note-s0f3', mode: 'easy' },
      { type: 'quiz-run', difficulty: 'easy', correct: 10, total: 10, score: 220 },
      { type: 'lesson-done', lessonId: 'y' },
      { type: 'song-played', songId: 'b' },
      { type: 'tuned-all' },
    ] satisfies GameEvent[]) {
      apply(before, event);
    }
    expect(before).toEqual(snapshot);
  });

  it('never takes xp away, never un-unlocks, and keeps its lists sorted and unique', () => {
    // A long, mixed, seeded history across eight weeks.
    let seed = 7;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const songs = SONGS.map((song) => song.id);
    const lessons = courseUnits().flatMap((unit) => unit.lessonIds);
    let state = emptyProgressState();
    let day = 0;

    for (let step = 0; step < 600; step += 1) {
      if (random() < 0.15) day += 1 + Math.floor(random() * 3);
      const now = new Date(2026, 8, 1 + day, 10);
      const pick = random();
      const event: GameEvent =
        pick < 0.5
          ? { type: 'quiz-answer', correct: random() < 0.7, itemId: `note-s${step % 6}f${step % 4}`, mode: 'medium' }
          : pick < 0.6
            ? { type: 'quiz-run', difficulty: 'easy', correct: Math.floor(random() * 11), total: 10, score: Math.floor(random() * 230) }
            : pick < 0.75
              ? { type: 'lesson-done', lessonId: lessons[Math.floor(random() * lessons.length)] ?? 'x' }
              : pick < 0.95
                ? { type: 'song-played', songId: songs[Math.floor(random() * songs.length)] ?? 'x' }
                : { type: 'tuned-all' };

      const result = applyGameEvent(state, event, now);
      expect(result.award.xp).toBeGreaterThanOrEqual(0);
      expect(result.state.xp).toBe(state.xp + result.award.xp);
      expect(result.award.levelAfter).toBe(levelForXp(result.state.xp));
      expect(result.award.levelAfter).toBeGreaterThanOrEqual(result.award.levelBefore);
      for (const id of Object.keys(state.achievements)) expect(result.state.achievements).toHaveProperty(id);
      expect(result.state.practiceDays).toEqual([...new Set(result.state.practiceDays)].sort());
      state = result.state;
    }

    expect(state.xp).toBeGreaterThan(0);
    expect(state.dayStreak.longest).toBeGreaterThanOrEqual(state.dayStreak.current);
  });
});
