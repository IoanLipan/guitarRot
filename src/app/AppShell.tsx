import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { Style, StatusBar } from '@capacitor/status-bar';
import { getToneProfile } from '@/audio';
import { analyticsAvailable, track } from '@/cloud/analytics';
import { AccountSheet } from '@/cloud/AccountSheet';
import { OpenAccountSheetProvider, type AccountSheetIntent } from '@/cloud/AccountSheetContext';
import { useAccount } from '@/cloud/AccountProvider';
import { ConsentSheet } from '@/cloud/ConsentSheet';
import { useAnalyticsConsent } from '@/cloud/useAnalyticsConsent';
import { SyncContext, useCloudSync } from '@/cloud/useCloudSync';
import { courseFor, getSong, riffsFor, songPlayableOn } from '@/content';
import { InstrumentProvider } from '@/instrument';
import { LeaderboardSync } from '@/leaderboard/LeaderboardSync';
import type { InstrumentId } from '@/music';
import { Feed } from '@/feed/Feed';
import { AwardLayer } from '@/game/AwardLayer';
import type { AwardPhase } from '@/game/awardState';
import { YouTab } from '@/game/YouTab';
import { Learn } from '@/learn/Learn';
import { placeAtLesson, placeWithoutLesson, START_PLACE, type LearnPlace } from '@/learn/learnPlace';
import { Quiz, type QuizApi } from '@/quiz/Quiz';
import { readShareTarget, resolveShareTarget, sharedInstrument, type SharedContent } from '@/share';
import { Songs } from '@/songs';
import { InstrumentSwitch } from './InstrumentSwitch';
import { SettingsSheet } from './SettingsSheet';
import { StartScreen, type StartChoice } from './StartScreen';
import { planStart } from './startPlan';
import { TabBar, tabDirection, type TabId } from './TabBar';
import { useAppLifecycle } from './useAppLifecycle';
import { useAudioEngine } from './useAudioEngine';
import { backAction, minimizeApp, useBackButton, type QuizLayer } from './useBackButton';
import { useProgress } from './useProgress';
import { useSaveNudge } from './useSaveNudge';
import { useUsageTracking } from './useUsageTracking';
import { useWakeAudio } from './useWakeAudio';
import { GearIcon } from '@/ui/icons';
import { useViewTransition } from '@/ui/motion';
import { AndroidAppBanner } from './AndroidAppBanner';

export function AppShell() {
  const { ready, engine, loading, failed, start } = useAudioEngine();
  const progress = useProgress();
  // Signed in, the progress is kept in step with the account (nothing happens otherwise); the You tab shows how it stands.
  const sync = useCloudSync(progress);
  const [tab, setTab] = useState<TabId>('feed');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shared, setShared] = useState<SharedContent | null>(null);
  const [chosen, setChosen] = useState<StartChoice | null>(null);
  // What each tab was showing. Tabs unmount when another is shown, so their
  // place is kept here: coming back to Learn or Songs finds the same lesson,
  // step and song, and Back knows what there is to close.
  const [learnPlace, setLearnPlace] = useState<LearnPlace>(START_PLACE);
  const [openSongId, setOpenSongId] = useState<string | null>(null);
  // The pick open in the You tab. Owned here because an unlock toast can send you to it.
  const [openPickId, setOpenPickId] = useState<string | null>(null);
  // The one account sheet (create an account, sign in, pick a username). It opens over any screen, the start screen
  // included, from the You tab, Settings, the start screen's link and the one-time offer; owned here so Back can close it.
  const account = useAccount();
  const [accountIntent, setAccountIntent] = useState<AccountSheetIntent | null>(null);
  // Where the Quiz tab is (its mode select, a run, a run's results), and its handle for Back and for leaving mid-run.
  const [quizLayer, setQuizLayer] = useState<QuizLayer>('select');
  const quizApiRef = useRef<QuizApi | null>(null);

  // Moving between tabs slides the content the way you moved, as a View
  // Transition where the browser has them (the tab unmounts, so the old
  // picture has to be a snapshot) and with no animation where it does not.
  const paneRef = useRef<HTMLDivElement>(null);
  const transition = useViewTransition();
  function changeTab(next: TabId) {
    if (next === tab) return;
    const go = () => transition(() => setTab(next), { element: paneRef.current, direction: tabDirection(tab, next) });
    // A quiz run in progress is not thrown away by a stray tap on a tab: the Quiz tab asks first.
    if (tab === 'quiz' && quizApiRef.current?.guardLeave(go) === true) return;
    go();
  }

  /** An unlock toast was tapped: the You tab, open on that pick. */
  function showPick(achievementId: string) {
    setOpenPickId(achievementId);
    changeTab('you');
  }

  // A run holds the game's toasts back while it is on; its results show what it earned.
  const awardPhase: AwardPhase = quizLayer === 'run' ? 'running' : quizLayer === 'results' ? 'results' : 'idle';

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
      if (resolved.tab === 'songs') setOpenSongId(resolved.song.id);
    }
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  const toneId = progress.state.settings.toneId;
  const instrumentId = progress.state.settings.instrument;
  const refocusSwitch = useRef(false);
  useEffect(() => {
    if (!refocusSwitch.current) return;
    refocusSwitch.current = false;
    document.querySelector<HTMLElement>('[data-instrument-switch]')?.focus({ preventScroll: true });
  }, [instrumentId]);

  /**
   * Moves the app to the other instrument. Sound stops (a riff that was playing is the
   * wrong instrument's), the open song or lesson is closed if the new instrument has no
   * such thing, and the content panes below are keyed by instrument so the Feed deals a
   * new deck and the tuner and quiz start clean. Progress, XP and streaks are not touched.
   */
  function switchInstrument(next: InstrumentId) {
    if (next === instrumentId) return;
    track('instrument_switch', { to: next });
    // The switch in Learn's header is inside the panes that are remounted, so keyboard focus on it would be lost.
    refocusSwitch.current = document.activeElement?.hasAttribute('data-instrument-switch') === true;
    engine?.stopAll();
    progress.setInstrument(next);
    setOpenSongId((id) => {
      const song = id === null ? undefined : getSong(id);
      return song !== undefined && songPlayableOn(song, next) ? id : null;
    });
    setLearnPlace((place) =>
      place.lessonId !== null && !courseFor(next).some((lesson) => lesson.id === place.lessonId)
        ? placeWithoutLesson(place)
        : place,
    );
  }

  const instrumentSwitch = <InstrumentSwitch instrument={instrumentId} onSwitch={switchInstrument} />;

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

  // Off screen: silence, suspend the audio clock, save. On screen: resume.
  useAppLifecycle({ engine, flushProgress: progress.flush });

  // And while it is on screen, any touch revives audio that something else
  // suspended. See useWakeAudio.
  useWakeAudio(engine !== null);

  useBackButton(() => {
    if (!ready) {
      // The sheet over the start screen goes first; with nothing open Back leaves the app.
      if (accountIntent !== null) setAccountIntent(null);
      else minimizeApp();
      return;
    }
    switch (
      backAction({
        settingsOpen,
        tab,
        lessonOpen: learnPlace.lessonId !== null,
        songOpen: openSongId !== null,
        pickOpen: openPickId !== null,
        accountSheetOpen: accountIntent !== null,
        quizLayer,
      })
    ) {
      case 'close-settings':
        setSettingsOpen(false);
        break;
      case 'close-account':
        setAccountIntent(null);
        break;
      case 'close-lesson':
        setLearnPlace(placeWithoutLesson);
        break;
      case 'close-song':
        setOpenSongId(null);
        break;
      case 'close-pick':
        setOpenPickId(null);
        break;
      case 'quiz-back':
        quizApiRef.current?.back();
        break;
      case 'go-to-feed':
        changeTab('feed');
        break;
      case 'minimize':
        minimizeApp();
        break;
    }
  });

  // What the person does, for the opt-in usage analytics (a no-op without a Firebase config or without consent).
  useUsageTracking({
    active: ready && engine !== null,
    tab,
    settingsOpen,
    learnPlace,
    openSongId,
    instrumentId,
    progress,
  });

  // The one-time "Save your progress" offer, after the first lesson or badge: only for somebody signed out, and only at a
  // calm moment (never in a lesson or a quiz run, over Settings, a pick or another question).
  const consent = useAnalyticsConsent();
  const calm =
    ready &&
    engine !== null &&
    progress.loaded &&
    progress.state.settings.instrumentChosen &&
    !(tab === 'learn' && learnPlace.lessonId !== null) &&
    !(tab === 'quiz' && quizLayer !== 'select') &&
    !settingsOpen &&
    openPickId === null &&
    accountIntent === null &&
    !(analyticsAvailable() && consent === 'unset');
  useSaveNudge({
    subscribeAwards: progress.subscribeAwards,
    signedOut: account.status === 'signed-out',
    calm,
    onShow: () => setAccountIntent('nudge'),
  });

  const plan = planStart(progress.loaded, progress.state.lessonsDone, courseFor(instrumentId));
  // A lesson has its own close button and its own Next bar, and needs every pixel of height: no tab bar, no gear.
  const inLesson = tab === 'learn' && learnPlace.lessonId !== null;

  /**
   * The start screen's two buttons. Where to land is decided now, while the
   * start screen is still up, so the first screen after the sounds load is
   * already the right one and no other tab mounts (and starts a riff) on the way.
   */
  function begin(choice: StartChoice) {
    setChosen(choice);
    if (choice === 'learn') {
      setTab('learn');
      setLearnPlace(
        plan.kind === 'first' || plan.kind === 'continue'
          ? placeAtLesson(plan.lesson.id)
          : plan.kind === 'empty'
            ? // No course for this instrument yet: land where Learn has something to do.
              { ...START_PLACE, section: 'tuner' }
            : START_PLACE,
      );
    } else {
      // Opened from a shared link: that link already chose the tab, and the instrument it is for.
      setTab(shared?.tab ?? 'feed');
      if (shared !== null) {
        const wanted = sharedInstrument(shared, instrumentId);
        if (wanted !== instrumentId) progress.setInstrument(wanted);
      }
    }
    void start();
  }

  const accountSheet =
    account.status === 'disabled' ? null : <AccountSheet intent={accountIntent} onClose={() => setAccountIntent(null)} />;

  if (!ready || engine === null) {
    return (
      <OpenAccountSheetProvider value={setAccountIntent}>
        <AndroidAppBanner floating />
        <StartScreen
          plan={plan}
          loading={loading}
          failed={failed}
          chosen={chosen}
          sharedLink={shared !== null}
          onChoose={begin}
          needsInstrument={progress.loaded && !progress.state.settings.instrumentChosen}
          onPickInstrument={progress.setInstrument}
          // An instrument with no riffs yet has a feed of chords and quizzes: say so on the button.
          feedLabel={riffsFor(instrumentId).length === 0 ? 'Just scroll chords' : undefined}
          // For a new phone: somebody who already has an account signs in here, and their progress comes back.
          onSignIn={account.status === 'signed-out' ? () => setAccountIntent('sign-in') : undefined}
        />
        {accountSheet}
      </OpenAccountSheetProvider>
    );
  }

  return (
    <SyncContext.Provider value={sync}>
    <OpenAccountSheetProvider value={setAccountIntent}>
    <InstrumentProvider id={instrumentId}>
      <div className="flex h-dvh flex-col bg-ground">
        <AndroidAppBanner />
        {/* min-h-0 lets this pane actually shrink, so its own scrollers work
            instead of the whole page growing past the viewport. */}
        <main className="relative min-h-0 flex-1 overflow-hidden pt-[env(safe-area-inset-top)]">
          <div ref={paneRef} key={instrumentId} className="h-full">
            {tab === 'feed' && (
              <Feed
                engine={engine}
                progress={progress}
                initialItem={shared?.tab === 'feed' ? shared.item : undefined}
              />
            )}
            {tab === 'songs' && (
              <Songs
                engine={engine}
                openSongId={openSongId}
                onOpenSongChange={setOpenSongId}
                onSongPlayed={(songId) => {
                  track('song_play', { song_id: songId, instrument: instrumentId });
                  progress.record({ type: 'song-played', songId });
                }}
              />
            )}
            {tab === 'learn' && (
              <Learn
                engine={engine}
                progress={progress}
                place={learnPlace}
                onPlaceChange={setLearnPlace}
                onTunedAll={() => progress.record({ type: 'tuned-all' })}
                onOpenYou={() => changeTab('you')}
                instrumentSwitch={instrumentSwitch}
              />
            )}
            {tab === 'quiz' && (
              <Quiz engine={engine} progress={progress} onLayerChange={setQuizLayer} apiRef={quizApiRef} />
            )}
            {tab === 'you' && (
              <YouTab
                progress={progress}
                openPickId={openPickId}
                onOpenPickChange={setOpenPickId}
              />
            )}
          </div>

          {/* The switch rides the gear's row. The gear is 16px from the edge. On the Feed the share icon
              takes the next slot (68px) and the switch the one after (120px); on the Songs list it is the
              next slot. Learn sets it beside its section tabs, and an open song has a Share pill there instead. */}
          {(tab === 'feed' || (tab === 'songs' && openSongId === null)) && (
            <InstrumentSwitch
              instrument={instrumentId}
              onSwitch={switchInstrument}
              className={`absolute top-[calc(env(safe-area-inset-top)+0.75rem)] z-20 ${
                tab === 'feed' ? 'right-[7.5rem]' : 'right-[4.25rem]'
              }`}
            />
          )}

          {!inLesson && (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              data-testid="open-settings"
              className="press absolute top-[calc(env(safe-area-inset-top)+0.75rem)] right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-surface-2/90 text-ink"
            >
              <GearIcon size={22} />
            </button>
          )}
        </main>

        {!inLesson && <TabBar active={tab} onChange={changeTab} />}

        <AwardLayer progress={progress} phase={awardPhase} onOpenPick={showPick} />

        {/* Asked once, after the instrument choice, and never over a lesson, a run or Settings. */}
        <ConsentSheet
          ready={
            progress.loaded &&
            progress.state.settings.instrumentChosen &&
            !inLesson &&
            !settingsOpen &&
            quizLayer !== 'run' &&
            accountIntent === null
          }
        />

        {accountSheet}

        {/* Keeps a leaderboard entry up to date with the XP earned; nothing at all without an account on the board. */}
        <LeaderboardSync progress={progress} />

        <SettingsSheet
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          engine={engine}
          progress={progress}
          onInstrumentChange={switchInstrument}
          onOpenAccount={() => {
            setSettingsOpen(false);
            // Somebody with no account is taken straight to the sheet that makes one; an account is looked at in the You tab.
            if (account.status === 'signed-out') setAccountIntent('sign-up');
            else changeTab('you');
          }}
        />
      </div>
    </InstrumentProvider>
    </OpenAccountSheetProvider>
    </SyncContext.Provider>
  );
}

export default AppShell;
