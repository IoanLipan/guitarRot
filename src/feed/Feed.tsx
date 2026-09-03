import { useCallback, useEffect, useRef, useState } from 'react';
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

export function Feed({ engine, progress }: { engine: AudioEngine; progress: ProgressHandle }) {
  const cursorRef = useRef<FeedCursor>(emptyCursor());
  const [items, setItems] = useState<FeedItem[]>(() => {
    const page = generateFeedPage(PAGE_SIZE, cursorRef.current);
    cursorRef.current = page.cursor;
    return page.items;
  });

  const { activeIndex, containerRef, cardProps, scrollToCard } = useActiveCard(items.length);

  const extend = useCallback(() => {
    const page = generateFeedPage(PAGE_SIZE, cursorRef.current);
    cursorRef.current = page.cursor;
    setItems((current) => [...current, ...page.items]);
  }, []);

  // The feed never ends: as the active card approaches the tail, generate more.
  useEffect(() => {
    if (activeIndex >= items.length - PREFETCH_WITHIN) extend();
  }, [activeIndex, items.length, extend]);

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
