import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Riff } from '@/content';
import type { ChordShape } from '@/music';
import type { QuizQuestion } from '@/quiz/generateQuiz';
import type { FeedItem } from './generator';
import { CARD_VIEW_MS, cardView, useCardViewTracking } from './useCardViewTracking';

const analytics = vi.hoisted(() => ({ available: true, track: vi.fn() }));
vi.mock('@/cloud/analytics', () => ({
  analyticsAvailable: () => analytics.available,
  track: analytics.track,
}));

const riff = { id: 'riff-a', level: 3 } as Riff;
const chord = { id: 'chord-a', difficulty: 2 } as ChordShape;
const question = { id: 'quiz-a' } as QuizQuestion;

const riffCard: FeedItem = { kind: 'riff', id: 'riff-a', riff };
const chordCard: FeedItem = { kind: 'chord', id: 'chord-a', chord };
const quizCard: FeedItem = { kind: 'quiz', id: 'quiz-a', question };

beforeEach(() => {
  vi.useFakeTimers();
  analytics.available = true;
  analytics.track.mockClear();
});
afterEach(() => vi.useRealTimers());

describe('what a card says about itself', () => {
  it('is its kind and level, and a quiz card has no level', () => {
    expect(cardView(riffCard)).toEqual({ kind: 'riff', level: 3 });
    expect(cardView(chordCard)).toEqual({ kind: 'chord', level: 2 });
    expect(cardView(quizCard)).toEqual({ kind: 'quiz' });
  });
});

describe('feed card views', () => {
  it('reports a card once it has stayed on screen long enough', () => {
    renderHook(() => useCardViewTracking(riffCard));
    vi.advanceTimersByTime(CARD_VIEW_MS - 1);
    expect(analytics.track).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(analytics.track).toHaveBeenCalledWith('feed_card_view', { kind: 'riff', level: 3 });
    vi.advanceTimersByTime(CARD_VIEW_MS * 5);
    expect(analytics.track).toHaveBeenCalledTimes(1);
  });

  it('reports nothing for cards flicked past, however many there are', () => {
    const cards: FeedItem[] = Array.from({ length: 10 }, (_, index) => ({
      kind: 'chord',
      id: `c${index}`,
      chord: { ...chord, id: `c${index}` },
    }));
    const { rerender } = renderHook(({ item }) => useCardViewTracking(item), { initialProps: { item: cards[0] } });
    for (const card of cards.slice(1)) {
      vi.advanceTimersByTime(300);
      rerender({ item: card });
    }
    vi.advanceTimersByTime(CARD_VIEW_MS - 100);
    expect(analytics.track).not.toHaveBeenCalled();
  });

  it('reports each card that is stopped on, in turn, at most once per period', () => {
    const { rerender } = renderHook(({ item }) => useCardViewTracking(item), {
      initialProps: { item: riffCard as FeedItem | undefined },
    });
    vi.advanceTimersByTime(CARD_VIEW_MS + 1);
    rerender({ item: chordCard });
    vi.advanceTimersByTime(CARD_VIEW_MS + 1);
    rerender({ item: quizCard });
    vi.advanceTimersByTime(CARD_VIEW_MS + 1);

    expect(analytics.track.mock.calls).toEqual([
      ['feed_card_view', { kind: 'riff', level: 3 }],
      ['feed_card_view', { kind: 'chord', level: 2 }],
      ['feed_card_view', { kind: 'quiz' }],
    ]);
  });

  it('does not report a card seen only while the app was in the background', () => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    renderHook(() => useCardViewTracking(riffCard));
    vi.advanceTimersByTime(CARD_VIEW_MS + 1);
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    expect(analytics.track).not.toHaveBeenCalled();
  });

  it('does nothing with no card, or in a build without analytics', () => {
    renderHook(() => useCardViewTracking(undefined));
    analytics.available = false;
    renderHook(() => useCardViewTracking(riffCard));
    vi.advanceTimersByTime(CARD_VIEW_MS * 2);
    expect(analytics.track).not.toHaveBeenCalled();
  });
});
