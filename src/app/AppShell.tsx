import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { Style, StatusBar } from '@capacitor/status-bar';
import { getToneProfile } from '@/audio';
import { Feed } from '@/feed/Feed';
import { Learn } from '@/learn/Learn';
import { Quiz } from '@/quiz/Quiz';
import { readShareTarget, resolveShareTarget, type SharedContent } from '@/share';
import { Songs } from '@/songs';
import { SettingsSheet } from './SettingsSheet';
import { TabBar, type TabId } from './TabBar';
import { useAudioEngine } from './useAudioEngine';
import { useProgress } from './useProgress';

export function AppShell() {
  const { ready, engine, start } = useAudioEngine();
  const progress = useProgress();
  const [tab, setTab] = useState<TabId>('feed');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shared, setShared] = useState<SharedContent | null>(null);

  // A shared link (`/?p=riff:blues-shuffle-e`) opens on the card it names.
  // The parameter is stripped once read, so a later reload is an ordinary
  // launch rather than one pinned forever to somebody else's link.
  useEffect(() => {
    const target = readShareTarget(window.location.search);
    if (target === null) return;
    const resolved = resolveShareTarget(target);
    if (resolved !== null) {
      setShared(resolved);
      setTab(resolved.tab);
    }
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  const toneId = progress.state.settings.toneId;

  // Apply the stored tone once both the engine and saved settings exist —
  // the engine boots on the default, and progress loads a tick later.
  useEffect(() => {
    if (engine === null || !progress.loaded) return;
    engine.setTone(getToneProfile(toneId));
  }, [engine, progress.loaded, toneId]);

  // Native chrome, once, once there's something real on screen to reveal.
  // launchAutoHide is off in capacitor.config.ts specifically so the splash
  // never drops the user before this component has painted its first frame.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void StatusBar.setStyle({ style: Style.Dark });
    void StatusBar.setBackgroundColor({ color: '#0b0b0f' }).catch(() => {
      // iOS has no concept of a status bar background colour; expected to reject there.
    });
    void SplashScreen.hide();
  }, []);

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
      <main className="relative min-h-0 flex-1 overflow-hidden pt-[env(safe-area-inset-top)]">
        {tab === 'feed' && (
          <Feed
            engine={engine}
            progress={progress}
            initialItem={shared?.tab === 'feed' ? shared.item : undefined}
          />
        )}
        {tab === 'songs' && (
          <Songs engine={engine} openSongId={shared?.tab === 'songs' ? shared.song.id : null} />
        )}
        {tab === 'learn' && <Learn engine={engine} />}
        {tab === 'quiz' && <Quiz engine={engine} progress={progress} />}

        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          data-testid="open-settings"
          className="absolute top-[calc(env(safe-area-inset-top)+0.75rem)] right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-ground/55 text-lg backdrop-blur-md active:scale-95"
        >
          <GearIcon />
        </button>
      </main>

      <TabBar active={tab} onChange={setTab} />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        engine={engine}
        progress={progress}
      />
    </div>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="var(--color-ink)" strokeWidth="1.8" />
      <path
        d="M12 3.4v2.2M12 18.4v2.2M20.6 12h-2.2M5.6 12H3.4M18.1 5.9l-1.6 1.6M7.5 16.5l-1.6 1.6M18.1 18.1l-1.6-1.6M7.5 7.5L5.9 5.9"
        stroke="var(--color-ink)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default AppShell;
