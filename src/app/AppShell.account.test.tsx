import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { getToneProfile, type AudioEngine } from '@/audio';
import { AccountContext } from '@/cloud/AccountProvider';
import type { AccountApi } from '@/cloud/types';
import { fakeProgressHandle } from './testkit';
import type { ProgressHandle } from './useProgress';

// The shell, with accounts in and out. Everything the shell hosts that is not the You tab or Settings is a stand-in.
const world = vi.hoisted(() => ({
  progress: null as unknown as ProgressHandle,
  engine: null as unknown as AudioEngine,
  /** How many times any part of the Firebase SDK was imported (a mock factory runs on first import). */
  firebaseImports: 0,
  /** How many times the account sheet's chunk was asked for. */
  sheetImports: 0,
}));

vi.mock('@/cloud/AccountSheet', async (importOriginal) => {
  world.sheetImports += 1;
  return importOriginal<typeof import('@/cloud/AccountSheet')>();
});

for (const part of ['firebase/app', 'firebase/auth', 'firebase/firestore', '@capacitor-firebase/authentication']) {
  vi.doMock(part, () => {
    world.firebaseImports += 1;
    return {};
  });
}

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

const { AppShell } = await import('./AppShell');
const { default: App } = await import('@/App');

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

function withAccount(api: Partial<AccountApi>, children: ReactNode) {
  const value = { status: 'signed-out', user: null, ...actions, ...api } as AccountApi;
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

async function openApp(ui: ReactNode = <AppShell />) {
  render(ui);
  // The account sheet is its own chunk; let it arrive, the way it has by the time anybody taps.
  await act(() => vi.dynamicImportSettled());
  await act(async () => {
    fireEvent.click(screen.getByTestId('start-feed'));
  });
}

const youTab = () => fireEvent.click(screen.getByRole('button', { name: 'You' }));
const openSettings = () => fireEvent.click(screen.getByTestId('open-settings'));

describe('the app shell and accounts', () => {
  beforeEach(() => {
    world.engine = fakeEngine();
    world.progress = fakeProgressHandle();
    window.history.replaceState(null, '', '/');
  });
  afterEach(() => cleanup());

  it('shows no account anywhere, and loads no Firebase, when the build has no cloud features', async () => {
    await openApp(<App />);

    youTab();
    expect(screen.getByTestId('you-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('account-card')).toBeNull();
    expect(screen.queryByText(/Continue with Google/)).toBeNull();

    openSettings();
    expect(screen.getByTestId('settings-sheet')).toBeInTheDocument();
    expect(screen.queryByTestId('settings-account')).toBeNull();

    // Give anything scheduled for "after the first paint" its chance to run.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });
    expect(world.firebaseImports).toBe(0);
    // The sheet's code is not even downloaded: the first download of a build without accounts is what it was.
    expect(world.sheetImports).toBe(0);
  });

  it('puts the Account card in the You tab, and an Account row in Settings, once there are accounts', async () => {
    await openApp(withAccount({}, <AppShell />));

    youTab();
    expect(screen.getByTestId('account-card')).toHaveAttribute('data-state', 'signed-out');

    openSettings();
    expect(screen.getByTestId('settings-account-row')).toHaveTextContent('Create account or sign in');
  });

  it('fetches the account sheet only in a build that has accounts', async () => {
    await openApp(withAccount({}, <AppShell />));
    // (A mock factory runs on the first import only, so once is all there is to count.)
    expect(world.sheetImports).toBe(1);
  });

  it('opens the one account sheet from the You tab, over the You tab', async () => {
    await openApp(withAccount({}, <AppShell />));
    youTab();
    expect(screen.queryByTestId('account-sheet')).toBeNull();

    fireEvent.click(screen.getByTestId('create-account'));
    expect(screen.getByTestId('account-sheet')).toBeInTheDocument();
    expect(screen.getByTestId('account-sheet-title')).toHaveTextContent('Create account');
    expect(screen.getByTestId('you-tab')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close sign in' }));
    fireEvent.click(screen.getByTestId('sign-in'));
    expect(screen.getByTestId('account-sheet-title')).toHaveTextContent('Sign in');
  });

  it('takes the Settings row straight to the sheet that makes an account, closing Settings on the way', async () => {
    await openApp(withAccount({}, <AppShell />));
    expect(screen.getByTestId('feed-screen')).toBeInTheDocument();

    openSettings();
    fireEvent.click(screen.getByTestId('settings-account-row'));

    expect(await screen.findByTestId('account-sheet')).toBeInTheDocument();
    expect(screen.getByTestId('account-sheet-title')).toHaveTextContent('Create account');
    // Still on the Feed behind it: the sheet is the same one everywhere, not a trip to another tab.
    expect(screen.getByTestId('feed-screen')).toBeInTheDocument();
    // Settings is on its way out (it slides away, so it may still be mounted a moment).
    expect(screen.queryByTestId('settings-sheet')?.getAttribute('data-state') ?? 'closing').toBe('closing');
  });

  it('takes the Settings row to the Account card for somebody who is signed in', async () => {
    const user = { uid: 'u1', email: 'ada@example.com', displayName: 'ada_l', providers: ['password'], emailVerified: false };
    await openApp(withAccount({ status: 'signed-in', user }, <AppShell />));
    openSettings();
    fireEvent.click(screen.getByTestId('settings-account-row'));
    expect(await screen.findByTestId('account-card')).toBeInTheDocument();
    expect(screen.queryByTestId('feed-screen')).toBeNull();
    expect(screen.queryByTestId('account-sheet')).toBeNull();
  });

  it('shows who is signed in on the Settings row', async () => {
    const user = { uid: 'u1', email: 'ada@example.com', displayName: 'Ada Lovelace', providers: ['password'], emailVerified: false };
    await openApp(withAccount({ status: 'signed-in', user }, <AppShell />));

    openSettings();
    const row = screen.getByTestId('settings-account-row');
    expect(row).toHaveTextContent('Ada Lovelace');
    expect(row).toHaveTextContent('ada@example.com');
  });
});
