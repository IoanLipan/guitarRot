import { useState } from 'react';
import { Feed } from '@/feed/Feed';
import { Learn } from '@/learn/Learn';
import { Quiz } from '@/quiz/Quiz';
import { TabBar, type TabId } from './TabBar';
import { useAudioEngine } from './useAudioEngine';
import { useProgress } from './useProgress';

export function AppShell() {
  const { ready, engine, start } = useAudioEngine();
  const progress = useProgress();
  const [tab, setTab] = useState<TabId>('feed');

  if (!ready || engine === null) {
    return (
      <main className="flex h-dvh flex-col items-center justify-center gap-4 bg-ground p-8 text-center">
        <h1 className="text-4xl font-black tracking-tight">guitarRot</h1>
        <p className="max-w-xs text-sm text-ink-dim">
          Phones keep audio suspended until you touch the screen.
        </p>
        <button
          type="button"
          onClick={() => void start()}
          className="rounded-full bg-accent px-8 py-4 text-lg font-extrabold text-ground active:scale-95"
        >
          Tap to start
        </button>
      </main>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-ground">
      {/* min-h-0 lets this pane actually shrink, so its own scrollers work
          instead of the whole page growing past the viewport. */}
      <main className="min-h-0 flex-1 overflow-hidden pt-[env(safe-area-inset-top)]">
        {tab === 'feed' && <Feed engine={engine} progress={progress} />}
        {tab === 'learn' && <Learn engine={engine} />}
        {tab === 'quiz' && <Quiz progress={progress} />}
      </main>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}

export default AppShell;
