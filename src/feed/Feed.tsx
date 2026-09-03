import { useState } from 'react';
import type { AudioEngine } from '@/audio';
import type { ProgressHandle } from '@/app/useProgress';
import { ChordCard } from './ChordCard';
import { buildFeedItems, type FeedItem } from './feedItems';
import { QuizCard } from './QuizCard';
import { RiffCard } from './RiffCard';
import { useActiveCard } from './useActiveCard';

export function Feed({ engine, progress }: { engine: AudioEngine; progress: ProgressHandle }) {
  const [items] = useState<FeedItem[]>(() => buildFeedItems());
  const { activeIndex, containerRef, cardProps, scrollToCard } = useActiveCard(items.length);

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
              onAdvance={() => scrollToCard(Math.min(index + 1, items.length - 1))}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default Feed;
