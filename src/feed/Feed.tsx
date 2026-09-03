import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { AudioEngine } from '@/audio';
import type { ProgressHandle } from '@/app/useProgress';
import { ChordCard } from './ChordCard';
import { emptyCursor, generateFeedPage, type FeedCursor, type FeedItem } from './generator';
import { QuizCard } from './QuizCard';
import { RiffCard } from './RiffCard';
import { useActiveCard } from './useActiveCard';

/** Cards fetched per page, and how close to the end triggers the next one. */
const PAGE_SIZE = 8;
const PREFETCH_WITHIN = 3;
/**
 * An endless feed that only ever appends grows without bound: every card
 * scrolled past stays mounted, holding its SVGs forever. The spec calls for
 * a rolling window, so cards well behind the viewport get dropped.
 */
const MAX_CARDS = 30;
const PRUNE_CHUNK = 10;
/** Never prune closer than this to the active card. */
const PRUNE_SAFETY = 3;

export function Feed({ engine, progress }: { engine: AudioEngine; progress: ProgressHandle }) {
  const cursorRef = useRef<FeedCursor>(emptyCursor());
  const [items, setItems] = useState<FeedItem[]>(() => {
    const page = generateFeedPage(PAGE_SIZE, cursorRef.current);
    cursorRef.current = page.cursor;
    return page.items;
  });

  const { activeIndex, containerRef, cardProps, scrollToCard, shiftActiveIndex } = useActiveCard(
    items.length,
  );
  /** Height to claw back from the scroller after cards are dropped. */
  const scrollDebtRef = useRef(0);

  const extend = useCallback(() => {
    const page = generateFeedPage(PAGE_SIZE, cursorRef.current);
    cursorRef.current = page.cursor;
    setItems((current) => [...current, ...page.items]);
  }, []);

  // The feed never ends: as the active card approaches the tail, generate more.
  useEffect(() => {
    if (activeIndex >= items.length - PREFETCH_WITHIN) extend();
  }, [activeIndex, items.length, extend]);

  // ...and drop what's far enough behind that it can't be scrolled back to
  // in one gesture.
  useEffect(() => {
    if (items.length <= MAX_CARDS) return;
    if (activeIndex < PRUNE_CHUNK + PRUNE_SAFETY) return;

    // Every card is exactly one scroller tall, so the content above the
    // viewport shrinks by a known amount and the scroll position can be
    // corrected exactly — otherwise the feed would jump under the thumb.
    scrollDebtRef.current = PRUNE_CHUNK * (containerRef.current?.clientHeight ?? 0);
    setItems((current) => current.slice(PRUNE_CHUNK));
    shiftActiveIndex(-PRUNE_CHUNK);
  }, [items.length, activeIndex, containerRef, shiftActiveIndex]);

  // Before the browser paints the shortened list, take the removed height
  // back out of scrollTop.
  useLayoutEffect(() => {
    const debt = scrollDebtRef.current;
    if (debt === 0) return;
    scrollDebtRef.current = 0;
    const scroller = containerRef.current;
    if (scroller !== null) scroller.scrollTop = Math.max(0, scroller.scrollTop - debt);
  }, [items, containerRef]);

  return (
    <div
      ref={containerRef}
      className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain"
      data-testid="feed-scroller"
    >
      {items.map((item, index) => (
        <div key={item.id} {...cardProps(index)} className="h-full snap-start">
          {item.kind === 'riff' && (
            <RiffCard riff={item.riff} engine={engine} isActive={index === activeIndex} />
          )}
          {item.kind === 'chord' && <ChordCard chord={item.chord} engine={engine} />}
          {item.kind === 'quiz' && (
            <QuizCard
              question={item.question}
              engine={engine}
              onAnswered={progress.recordAnswer}
              onAdvance={() => scrollToCard(index + 1)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default Feed;
