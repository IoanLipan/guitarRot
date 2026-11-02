import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { getToneProfile, type AudioEngine } from '@/audio';
import { AccountContext } from '@/cloud/AccountProvider';
import { NUDGE_DELAY_MS, NUDGE_KEY } from './useSaveNudge';
import { ProfileContext } from '@/cloud/ProfileProvider';
import type { AccountApi, AccountUser, ProfileState } from '@/cloud/types';
import { emptyProgressState } from '@/progress';
import { NO_AWARD, fakeProgressHandle, returningState } from './testkit';
import type { AwardNotice, ProgressHandle } from './useProgress';

// The shell with accounts: the start screen's way in, the one account sheet from every door, and the one-time offer.
const world = vi.hoisted(() => ({
  progress: null as unknown as ProgressHandle,
  engine: null as unknown as AudioEngine,
  backButton: null as null | (() => void),
  minimizeApp: vi.fn(() => Promise.resolve()),
  awards: new Set<(notice: AwardNotice) => void>(),
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
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async (name: string, callback: () => void) => {
      if (name === 'backButton') world.backButton = callback;
      return { remove: vi.fn(async () => undefined) };
    }),
    minimizeApp: world.minimizeApp,
    addEventListener: vi.fn(),
  },
}));
vi.mock('@capacitor/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@capacitor/core')>();
  return { ...original, Capacitor: { ...original.Capacitor, isNativePlatform: () => true } };
});
vi.mock('@capacitor/splash-screen', () => ({ SplashScreen: { hide: vi.fn(() => Promise.resolve()) } }));
vi.mock('@capacitor/status-bar', () => ({
  StatusBar: { setStyle: vi.fn(), setBackgroundColor: vi.fn(() => Promise.resolve()) },
  Style: { Dark: 'DARK' },
}));
vi.mock('@capacitor/haptics', () => ({
  Haptics: { impact: vi.fn() },
  ImpactStyle: { Light: 'LIGHT' },
}));
vi.mock('@/feed/Feed', () => ({ Feed: () => <div data-testid="feed-screen" /> }));
vi.mock('@/cloud/usernames', () => ({ checkUsername: vi.fn(async () => 'available'), freeUsernames: vi.fn(async () => []) }));

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

const actions = {
  signUpWithEmail: vi.fn(),
  signInWithEmail: vi.fn(),
  sendPasswordReset: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithApple: vi.fn(),
  setUsername: vi.fn(),
  signOut: vi.fn(),
  deleteAccount: vi.fn(),
};

const ADA: AccountUser = { uid: 'u1', email: 'ada@example.com', displayName: 'ada_l', providers: ['password'], emailVerified: false };
const SIGNED_OUT = { status: 'signed-out', user: null } as const;
const NO_PROFILE: ProfileState = { status: 'unknown', username: null };

function withAccount(api: Partial<AccountApi>, children: ReactNode, profile: ProfileState = NO_PROFILE) {
  return (
    <ProfileContext.Provider value={profile}>
      <AccountContext.Provider value={{ ...SIGNED_OUT, ...actions, ...api } as AccountApi}>{children}</AccountContext.Provider>
    </ProfileContext.Provider>
  );
}

/** A progress handle whose awards the test sends by hand. */
function progressWithAwards(state = returningState()): ProgressHandle {
  world.awards.clear();
  return fakeProgressHandle({
    state,
    subscribeAwards: vi.fn((listener: (notice: AwardNotice) => void) => {
      world.awards.add(listener);
      return () => void world.awards.delete(listener);
    }),
  });
}

function earn(event: AwardNotice['event'], award = { ...NO_AWARD, xp: 20 }) {
  act(() => {
    for (const listener of [...world.awards]) listener({ id: 1, event, award });
  });
}

const LESSON_DONE: AwardNotice['event'] = { type: 'lesson-done', lessonId: 'any' };
const pressBack = () => act(() => world.backButton?.());

async function openApp(ui: ReactNode, button = 'start-feed') {
  render(ui);
  await act(async () => {
    fireEvent.click(screen.getByTestId(button));
  });
}

beforeEach(() => {
  world.engine = fakeEngine();
  world.progress = progressWithAwards();
  world.backButton = null;
  world.minimizeApp.mockClear();
  window.history.replaceState(null, '', '/');
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  for (const fn of Object.values(actions)) fn.mockReset();
  localStorage.clear();
});

describe('the start screen', () => {
  it('has a quiet "I already have an account" for somebody signed out, and it opens sign-in over the start screen', async () => {
    render(withAccount({}, <AppShell />));
    const link = screen.getByTestId('start-sign-in');
    expect(link).toHaveTextContent('I already have an account');

    fireEvent.click(link);

    expect(screen.getByTestId('account-sheet')).toBeInTheDocument();
    expect(screen.getByTestId('account-sheet-title')).toHaveTextContent('Sign in');
    // Still the start screen behind it, not yet in the app.
    expect(screen.getByTestId('start-feed')).toBeInTheDocument();
  });

  it('is on the first question (guitar or ukulele) of a new phone as well', () => {
    world.progress = progressWithAwards(emptyProgressState());
    render(withAccount({}, <AppShell />));
    expect(screen.getByRole('heading', { name: 'What do you play?' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('start-sign-in'));
    expect(screen.getByTestId('account-sheet-title')).toHaveTextContent('Sign in');
  });

  it('is not there once signed in, while the account is being read, or in a build without accounts', () => {
    const { unmount } = render(withAccount({ status: 'signed-in', user: ADA }, <AppShell />));
    expect(screen.queryByTestId('start-sign-in')).toBeNull();
    unmount();

    const loading = render(withAccount({ status: 'loading', user: null }, <AppShell />));
    expect(screen.queryByTestId('start-sign-in')).toBeNull();
    loading.unmount();

    render(<AppShell />);
    expect(screen.queryByTestId('start-sign-in')).toBeNull();
    expect(screen.queryByTestId('account-sheet')).toBeNull();
  });

  it('closes the sheet on Back before it leaves the app', async () => {
    render(withAccount({}, <AppShell />));
    await act(async () => undefined);
    fireEvent.click(screen.getByTestId('start-sign-in'));
    expect(screen.getByTestId('account-sheet')).toHaveAttribute('data-state', 'open');

    pressBack();
    expect(screen.getByTestId('account-sheet')).toHaveAttribute('data-state', 'closing');
    expect(world.minimizeApp).not.toHaveBeenCalled();

    pressBack();
    expect(world.minimizeApp).toHaveBeenCalledTimes(1);
  });

  it('carries on into the app after signing in: the sheet closes and the link goes', async () => {
    actions.signInWithEmail.mockResolvedValue(undefined);
    // The account changes as sign-in finishes, the way the provider would tell the app.
    function Harness() {
      const [account, setAccount] = useState<Partial<AccountApi>>({});
      actions.signInWithEmail.mockImplementation(async () => {
        setAccount({ status: 'signed-in', user: ADA });
      });
      return withAccount(account, <AppShell />, account.status === 'signed-in' ? { status: 'ready', username: 'ada_l' } : NO_PROFILE);
    }
    render(<Harness />);

    fireEvent.click(screen.getByTestId('start-sign-in'));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByLabelText('Password', { selector: 'input' }), { target: { value: 'secret12' } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('account-submit'));
    });

    expect(actions.signInWithEmail).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'secret12' });
    expect(screen.getByTestId('account-sheet')).toHaveAttribute('data-state', 'closing');
    expect(screen.queryByTestId('start-sign-in')).toBeNull();
    // The two real choices are still there to carry on with.
    expect(screen.getByTestId('start-learn')).toBeInTheDocument();
    expect(screen.getByTestId('start-feed')).toBeInTheDocument();
  });
});

describe('the one-time "save your progress" offer', () => {
  it('appears a moment after the first lesson is finished and the person is back on a calm screen', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await openApp(withAccount({}, <AppShell />));
    expect(screen.getByTestId('feed-screen')).toBeInTheDocument();

    earn(LESSON_DONE);
    expect(screen.queryByTestId('account-sheet')).toBeNull();
    await act(() => vi.advanceTimersByTimeAsync(NUDGE_DELAY_MS + 50));

    expect(screen.getByTestId('account-sheet')).toBeInTheDocument();
    expect(screen.getByTestId('account-sheet-title')).toHaveTextContent('Save your progress');
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with email' })).toBeInTheDocument();
    expect(localStorage.getItem(NUDGE_KEY)).not.toBeNull();
  });

  it('appears after the first badge too', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await openApp(withAccount({}, <AppShell />));
    earn({ type: 'quiz-answer', correct: true, mode: 'practice' }, { ...NO_AWARD, xp: 5, unlocked: ['first-answer'] });
    await act(() => vi.advanceTimersByTimeAsync(NUDGE_DELAY_MS + 50));
    expect(screen.getByTestId('account-sheet-title')).toHaveTextContent('Save your progress');
  });

  it('never appears again after "Not now", even after another win', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await openApp(withAccount({}, <AppShell />));
    earn(LESSON_DONE);
    await act(() => vi.advanceTimersByTimeAsync(NUDGE_DELAY_MS + 50));
    fireEvent.click(screen.getByTestId('nudge-not-now'));
    await act(() => vi.advanceTimersByTimeAsync(500));

    earn(LESSON_DONE, { ...NO_AWARD, xp: 20, unlocked: ['another'] });
    await act(() => vi.advanceTimersByTimeAsync(NUDGE_DELAY_MS * 3));
    expect(screen.queryByTestId('account-sheet')?.getAttribute('data-state') ?? 'closing').toBe('closing');
    expect(screen.queryByText('Save your progress')).toBeNull();
  });

  it('does not appear on a phone where it was already made', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.setItem(NUDGE_KEY, 'made');
    await openApp(withAccount({}, <AppShell />));
    earn(LESSON_DONE);
    await act(() => vi.advanceTimersByTimeAsync(NUDGE_DELAY_MS * 3));
    expect(screen.queryByTestId('account-sheet')).toBeNull();
  });

  it('does not appear for somebody who is signed in', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await openApp(withAccount({ status: 'signed-in', user: ADA }, <AppShell />, { status: 'ready', username: 'ada_l' }));
    earn(LESSON_DONE);
    await act(() => vi.advanceTimersByTimeAsync(NUDGE_DELAY_MS * 3));
    expect(screen.queryByTestId('account-sheet')).toBeNull();
  });

  it('does not appear in a build without accounts', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await openApp(<AppShell />);
    earn(LESSON_DONE);
    await act(() => vi.advanceTimersByTimeAsync(NUDGE_DELAY_MS * 3));
    expect(screen.queryByTestId('account-sheet')).toBeNull();
    expect(localStorage.getItem(NUDGE_KEY)).toBeNull();
  });

  it('waits for the lesson to be left: never during a lesson, then a moment after it closes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await openApp(withAccount({}, <AppShell />), 'start-learn');
    expect(screen.getByTestId('lesson-view')).toBeInTheDocument();

    earn(LESSON_DONE);
    await act(() => vi.advanceTimersByTimeAsync(NUDGE_DELAY_MS * 4));
    expect(screen.queryByTestId('account-sheet')).toBeNull();

    fireEvent.click(screen.getByTestId('lesson-close'));
    await act(() => vi.advanceTimersByTimeAsync(NUDGE_DELAY_MS - 300));
    expect(screen.queryByTestId('account-sheet')).toBeNull();
    await act(() => vi.advanceTimersByTimeAsync(400));
    expect(screen.getByTestId('account-sheet-title')).toHaveTextContent('Save your progress');
  });

  it('does not appear over Settings, and waits for it to be closed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await openApp(withAccount({}, <AppShell />));
    fireEvent.click(screen.getByTestId('open-settings'));
    earn(LESSON_DONE);
    await act(() => vi.advanceTimersByTimeAsync(NUDGE_DELAY_MS * 3));
    expect(screen.queryByTestId('account-sheet')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await act(() => vi.advanceTimersByTimeAsync(NUDGE_DELAY_MS + 300));
    expect(screen.getByTestId('account-sheet-title')).toHaveTextContent('Save your progress');
  });
});

describe('Back', () => {
  it('closes the account sheet first wherever it was opened from', async () => {
    await openApp(withAccount({}, <AppShell />));
    fireEvent.click(screen.getByRole('button', { name: 'You' }));
    fireEvent.click(screen.getByTestId('create-account'));
    expect(screen.getByTestId('account-sheet')).toHaveAttribute('data-state', 'open');

    pressBack();
    expect(screen.getByTestId('account-sheet')).toHaveAttribute('data-state', 'closing');
    // Still on the You tab: one Back, one layer.
    expect(screen.getByTestId('you-tab')).toBeInTheDocument();
  });
});
