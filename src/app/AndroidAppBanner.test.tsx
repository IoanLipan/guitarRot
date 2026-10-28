import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const isNative = vi.hoisted(() => vi.fn(() => false));

// Only `Capacitor.isNativePlatform` is swapped; the rest of core stays real.
vi.mock('@capacitor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capacitor/core')>();
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: isNative } };
});

const { AndroidAppBanner, APK_BANNER_DISMISSED_KEY, offersAndroidApp } = await import('./AndroidAppBanner');

const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

function useAgent(ua: string) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);
}

beforeEach(() => {
  localStorage.clear();
  isNative.mockReturnValue(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('offersAndroidApp', () => {
  it('is only for the website on an Android phone', () => {
    expect(offersAndroidApp(ANDROID_UA, false)).toBe(true);
    expect(offersAndroidApp(ANDROID_UA, true)).toBe(false);
    expect(offersAndroidApp(IPHONE_UA, false)).toBe(false);
    expect(offersAndroidApp(DESKTOP_UA, false)).toBe(false);
  });
});

describe('AndroidAppBanner', () => {
  it('links an Android browser to the latest APK', () => {
    useAgent(ANDROID_UA);
    render(<AndroidAppBanner />);
    const link = screen.getByRole('link', { name: 'Download' });
    expect(link).toHaveAttribute('href', 'https://github.com/IoanLipan/guitarRot/releases/latest/download/guitarRot.apk');
  });

  it('never shows inside the installed app, or on an iPhone or desktop', () => {
    useAgent(ANDROID_UA);
    isNative.mockReturnValue(true);
    const { unmount } = render(<AndroidAppBanner />);
    expect(screen.queryByTestId('android-app-banner')).toBeNull();
    unmount();

    isNative.mockReturnValue(false);
    for (const ua of [IPHONE_UA, DESKTOP_UA]) {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);
      const view = render(<AndroidAppBanner />);
      expect(screen.queryByTestId('android-app-banner')).toBeNull();
      view.unmount();
    }
  });

  it('dismisses with an icon button that is still named, and big enough to hit', () => {
    useAgent(ANDROID_UA);
    render(<AndroidAppBanner />);
    const dismiss = screen.getByRole('button', { name: 'Dismiss' });
    expect(dismiss.querySelector('svg')).not.toBeNull();
    expect(dismiss).toHaveTextContent('');
    expect(dismiss.className).toContain('h-11');
    expect(dismiss.className).toContain('w-11');
  });

  it('stays gone once dismissed', async () => {
    useAgent(ANDROID_UA);
    const { unmount } = render(<AndroidAppBanner />);
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByTestId('android-app-banner')).toBeNull();
    expect(localStorage.getItem(APK_BANNER_DISMISSED_KEY)).toBe('1');
    unmount();

    render(<AndroidAppBanner />);
    expect(screen.queryByTestId('android-app-banner')).toBeNull();
  });

  it('still shows when storage is unavailable', () => {
    useAgent(ANDROID_UA);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<AndroidAppBanner />);
    expect(screen.getByTestId('android-app-banner')).toBeInTheDocument();
  });
});
