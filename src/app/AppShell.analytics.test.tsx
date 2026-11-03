import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { getToneProfile, type AudioEngine } from '@/audio';
import { ASK_AFTER_MS } from '@/cloud/ConsentSheet';
import { emptyProgressState } from '@/progress';
import { fakeProgressHandle, returningState } from './testkit';
import type { ProgressHandle } from './useProgress';

// The shell with usage analytics in the build. The analytics API is a spy; everything the shell hosts that
// these tests do not touch is a stand-in.
const world = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const state = { available: true, consent: 'unset' as 'granted' | 'denied' | 'unset' };
  return {
    state,
    listeners,
    progress: null as unknown as ProgressHandle,
    engine: null as unknown as AudioEngine,
    track: vi.fn(),
    trackScreen: vi.fn(),
    setAnalyticsUserProperties: vi.fn(),
    setAnalyticsConsent: vi.fn((granted: boolean) => {
      state.consent = granted ? 'granted' : 'denied';
      listeners.forEach((listener) => listener());
    }),
  };
});

vi.mock('@/cloud/analytics', () => ({
  analyticsAvailable: () => world.state.available,
  analyticsConsent: () => world.state.consent,
  subscribeAnalyticsConsent: (listener: () => void) => {
    world.listeners.add(listener);
    return () => world.listeners.delete(listener);
  },
  track: world.track,
  trackScreen: world.trackScreen,
  setAnalyticsUserProperties: world.setAnalyticsUserProperties,
  setAnalyticsConsent: world.setAnalyticsConsent,
}));
vi.mock('@/audio', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/audio')>()),
  wakeAudio: vi.fn(),
}));
vi.mock('./useProgress', () => ({ useProgress: () => world.progress }));
vi.mock('./useAudioEngine', async () => {
  const { useState: useStateInMock } = await import('react');
  return {
    useAudioEngine: () => {
      const [engine, setEngine] = useStateInMock<AudioEngine | null>(null);
      return {
        ready: engine !== null,
        engine,
        loading: false,
        failed: false,
        start: async () => setEngine(world.engine),
      };
    },
  };
});
vi.mock('@/feed/Feed', () => ({ Feed: () => <div data-testid="feed-screen" /> }));
// A song list with two buttons: open a song, and play it for long enough to count.
vi.mock('@/songs', () => ({
  Songs: ({
    openSongId,
    onOpenSongChange,
    onSongPlayed,
  }: {
    openSongId: string | null;
    onOpenSongChange: (id: string | null) => void;
    onSongPlayed: (id: string) => void;
  }) => (
    <div data-testid="songs-screen">
      <button type="button" onClick={() => onOpenSongChange('ode-to-joy')}>
        open song
      </button>
      <button type="button" onClick={() => onSongPlayed('ode-to-joy')}>
        play song
      </button>
      <button type="button" onClick={() => onOpenSongChange(null)}>
        close song
      </button>
      <span>{openSongId}</span>
    </div>
  ),
}));

const { AppShell } = await import('./AppShell');

function fakeEngine(): AudioEngine {
  return {
    backend: 'synth',
    unlocked: true,
    tone: getToneProfile('clean'),
    setTone: vi.fn(),
    init: vi.fn(),
    unlock: vi.fn(),
    playNote: vi.fn(),
    strum: vi.fn(),
    stopAll: vi.fn(),
    dispose: vi.fn(),
  };
}

async function openApp() {
  render(<AppShell />);
  await act(async () => {
    fireEvent.click(screen.getByTestId('start-feed'));
  });
}

const tab = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const screens = () => world.trackScreen.mock.calls.map(([name]) => name);

describe('the app shell and usage analytics', () => {
  beforeEach(() => {
    world.engine = fakeEngine();
    world.progress = fakeProgressHandle();
    world.state.available = true;
    world.state.consent = 'granted';
    world.listeners.clear();
    for (const spy of [world.track, world.trackScreen, world.setAnalyticsUserProperties, world.setAnalyticsConsent]) spy.mockClear();
    window.history.replaceState(null, '', '/');
  });
  afterEach(() => cleanup());

  it('reports each screen the person moves through, once, from the first one', async () => {
    await openApp();
    expect(screens()).toEqual(['feed']);

    tab('Songs');
    fireEvent.click(screen.getByText('open song'));
    fireEvent.click(screen.getByTestId('open-settings'));
    expect(world.trackScreen.mock.calls).toEqual([
      ['feed', 'feed', undefined],
      ['songs', 'songs', undefined],
      ['song', 'songs', { song_id: 'ode-to-joy' }],
      ['settings', 'settings', undefined],
    ]);
  });

  it('reports a song played, with the instrument, from the same callback that pays the XP', async () => {
    await openApp();
    tab('Songs');
    fireEvent.click(screen.getByText('play song'));
    expect(world.track).toHaveBeenCalledWith('song_play', { song_id: 'ode-to-joy', instrument: 'guitar' });
    expect(world.progress.record).toHaveBeenCalledWith({ type: 'song-played', songId: 'ode-to-joy' });
  });

  it('reports an instrument switch made in Settings, to the new instrument', async () => {
    await openApp();
    fireEvent.click(screen.getByTestId('open-settings'));
    fireEvent.click(screen.getByTestId('instrument-ukulele'));
    expect(world.track).toHaveBeenCalledWith('instrument_switch', { to: 'ukulele' });
    expect(world.track.mock.calls.filter(([name]) => name === 'instrument_switch')).toHaveLength(1);
  });

  it('sets the instrument and level band as user properties', async () => {
    await openApp();
    expect(world.setAnalyticsUserProperties).toHaveBeenCalledWith({ instrument: 'guitar', level_bucket: '1-2' });
  });

  describe('the first-run question', () => {
    it('is asked once the app is up and the instrument is chosen', async () => {
      world.state.consent = 'unset';
      await openApp();
      expect(screen.queryByTestId('consent-sheet')).toBeNull();
      expect(await screen.findByTestId('consent-sheet', undefined, { timeout: ASK_AFTER_MS + 2000 })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Share usage' }));
      expect(world.setAnalyticsConsent).toHaveBeenCalledWith(true);
      // Having said yes, the screen it began on is reported as well as the ones to come.
      expect(screens()).toEqual(['feed', 'feed']);
    });

    it('is not asked of someone who has not yet chosen an instrument', async () => {
      world.state.consent = 'unset';
      world.progress = fakeProgressHandle({ state: emptyProgressState() });
      render(<AppShell />);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, ASK_AFTER_MS + 400));
      });
      expect(screen.queryByTestId('consent-sheet')).toBeNull();
    });

    it('waits while Settings is open, and comes when it closes', async () => {
      world.state.consent = 'unset';
      await openApp();
      fireEvent.click(screen.getByTestId('open-settings'));
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, ASK_AFTER_MS + 400));
      });
      expect(screen.queryByTestId('consent-sheet')).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Done' }));
      expect(await screen.findByTestId('consent-sheet', undefined, { timeout: ASK_AFTER_MS + 2000 })).toBeInTheDocument();
    });

    it('is not asked again once it has been answered', async () => {
      world.state.consent = 'denied';
      await openApp();
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, ASK_AFTER_MS + 400));
      });
      expect(screen.queryByTestId('consent-sheet')).toBeNull();
    });
  });

  describe('Settings', () => {
    it('has the switch, showing the choice, and it turns analytics off', async () => {
      world.state.consent = 'granted';
      await openApp();
      fireEvent.click(screen.getByTestId('open-settings'));

      const toggle = screen.getByRole('switch', { name: 'Share usage statistics' });
      expect(toggle).toHaveAttribute('aria-checked', 'true');
      fireEvent.click(toggle);
      expect(world.setAnalyticsConsent).toHaveBeenCalledWith(false);
      await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'false'));
    });
  });

  describe('in a build without analytics', () => {
    it('shows no question and no switch, and reports nothing', async () => {
      world.state.available = false;
      world.state.consent = 'unset';
      world.progress = fakeProgressHandle({ state: returningState() });
      await openApp();

      tab('Songs');
      fireEvent.click(screen.getByText('open song'));
      fireEvent.click(screen.getByText('play song'));
      fireEvent.click(screen.getByTestId('open-settings'));
      expect(screen.queryByRole('switch')).toBeNull();
      expect(screen.queryByTestId('usage-setting')).toBeNull();

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, ASK_AFTER_MS + 400));
      });
      expect(screen.queryByTestId('consent-sheet')).toBeNull();
      expect(world.trackScreen).not.toHaveBeenCalled();
      expect(world.setAnalyticsUserProperties).not.toHaveBeenCalled();
      // The only event the shell itself raises is the song, and the API ignores it without a build to send it.
      expect(world.track.mock.calls.map(([name]) => name)).toEqual(['song_play']);
    });
  });
});
