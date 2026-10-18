import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getToneProfile, type AudioEngine } from '@/audio';
import { emptyProgressState } from '@/progress';
import type { ProgressHandle } from './useProgress';

const isNative = vi.hoisted(() => vi.fn(() => false));

// Only `Capacitor.isNativePlatform` is swapped; the rest of core stays real.
vi.mock('@capacitor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capacitor/core')>();
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: isNative } };
});

const { SettingsSheet } = await import('./SettingsSheet');

const PRIVACY_URL = 'https://guitar-rot.vercel.app/privacy.html';
const APK_URL = 'https://github.com/IoanLipan/guitarRot/releases/latest/download/guitarRot.apk';

function fakeEngine(): AudioEngine {
  return {
    backend: 'sampled',
    unlocked: true,
    tone: getToneProfile('acoustic'),
    setTone: vi.fn(),
    init: vi.fn(() => Promise.resolve()),
    unlock: vi.fn(() => Promise.resolve()),
    playNote: vi.fn(),
    strum: vi.fn(),
    stopAll: vi.fn(),
    dispose: vi.fn(),
  };
}

function fakeProgress(): ProgressHandle {
  return {
    state: emptyProgressState(),
    loaded: true,
    recordAnswer: vi.fn(),
    updateSettings: vi.fn(),
    completeLesson: vi.fn(),
    flush: vi.fn(),
  };
}

function renderSheet(progress = fakeProgress(), engine = fakeEngine()) {
  render(<SettingsSheet open onClose={vi.fn()} engine={engine} progress={progress} />);
  return { progress, engine };
}

beforeEach(() => {
  isNative.mockReturnValue(false);
});

describe('SettingsSheet', () => {
  it('renders nothing while closed', () => {
    render(
      <SettingsSheet open={false} onClose={vi.fn()} engine={fakeEngine()} progress={fakeProgress()} />,
    );
    expect(screen.queryByTestId('settings-sheet')).not.toBeInTheDocument();
  });

  it('still lets you pick a tone and hear it', async () => {
    const { progress, engine } = renderSheet();

    await userEvent.click(screen.getByTestId('tone-clean'));

    expect(progress.updateSettings).toHaveBeenCalledWith({ toneId: 'clean' });
    expect(engine.setTone).toHaveBeenCalled();
    expect(engine.strum).toHaveBeenCalled();
  });
});

describe('SettingsSheet About section', () => {
  it('shows the app version, taken from package.json at build time', () => {
    renderSheet();
    const about = screen.getByTestId('about-section');

    expect(__APP_VERSION__).toMatch(/^\d+\.\d+\.\d+/);
    expect(within(about).getByTestId('app-version')).toHaveTextContent(`v${__APP_VERSION__}`);
  });

  it('links to the privacy policy and opens it outside the app', () => {
    renderSheet();
    const link = screen.getByTestId('privacy-link');

    expect(link).toHaveAttribute('href', PRIVACY_URL);
    // target=_blank is what keeps the Android WebView from navigating away: Capacitor
    // hands any address that is not the app's own to the system browser.
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('keeps the sample credit, inside About', () => {
    renderSheet();

    const credit = screen.getByTestId('sample-credit');
    expect(credit).toHaveTextContent('tonejs-instruments');
    expect(within(screen.getByTestId('about-section')).getByTestId('sample-credit')).toBe(credit);
  });

  it('offers the Android app on the web', () => {
    renderSheet();

    const link = screen.getByTestId('android-app-link');
    expect(link).toHaveAttribute('href', APK_URL);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('does not offer the Android app inside the Android app, but keeps the privacy link', () => {
    isNative.mockReturnValue(true);
    renderSheet();

    expect(screen.queryByTestId('android-app-link')).not.toBeInTheDocument();
    expect(screen.getByTestId('privacy-link')).toHaveAttribute('href', PRIVACY_URL);
  });
});
