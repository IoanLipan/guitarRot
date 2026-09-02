import { useState } from 'react';
import type { AudioEngine } from '@/audio';
import type { ProgressHandle } from '@/app/useProgress';
import { ChordCard } from './ChordCard';
import { buildFeedItems, type FeedItem } from './feedItems';
import { QuizCard } from './QuizCard';
import { RiffCard } from './RiffCard';

export function Feed({ engine, progress }: { engine: AudioEngine; progress: ProgressHandle }) {
  const [items] = useState<FeedItem[]>(() => buildFeedItems());

  return (
    <div className="h-full snap-y snap-mandatory overflow-y-auto">
      {items.map((item) => (
        <div key={item.id} className="h-full snap-start">
          {item.kind === 'riff' && <RiffCard riff={item.riff} engine={engine} />}
          {item.kind === 'chord' && <ChordCard chord={item.chord} engine={engine} />}
          {item.kind === 'quiz' && (
            <QuizCard question={item.question} onAnswered={progress.recordAnswer} />
          )}
        </div>
      ))}
    </div>
  );
}

export default Feed;
