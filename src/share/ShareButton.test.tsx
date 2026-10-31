import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Share } from '@capacitor/share';

const isNative = vi.hoisted(() => vi.fn(() => false));

// Only `Capacitor.isNativePlatform` is swapped: @capacitor/share (mocked below)
// and the rest of core keep their real behaviour.
vi.mock('@capacitor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capacitor/core')>();
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: isNative } };
});
vi.mock('@capacitor/share', () => ({ Share: { share: vi.fn() } }));
vi.mock('@/app/haptics', () => ({ tapHaptic: vi.fn() }));

const { ShareButton } = await import('./ShareButton');

const target = { kind: 'riff', id: 'blues-shuffle-e' } as const;
const EXPECTED_URL = 'https://guitar-rot.vercel.app/?p=riff:blues-shuffle-e';

beforeEach(() => {
  isNative.mockReturnValue(false);
  vi.mocked(Share.share).mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubNavigator(overrides: Record<string, unknown>) {
  vi.stubGlobal('navigator', { ...navigator, ...overrides });
}

describe('ShareButton on the web', () => {
  it('opens the OS share sheet when there is one', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ share });
    render(<ShareButton target={target} title="Blues shuffle in E" />);

    await userEvent.click(screen.getByTestId('share-button'));

    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Blues shuffle in E', url: EXPECTED_URL }),
    );
    expect(Share.share).not.toHaveBeenCalled();
  });

  it('copies the link when there is no share sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ share: undefined, clipboard: { writeText } });
    render(<ShareButton target={target} title="Blues shuffle in E" />);

    await userEvent.click(screen.getByTestId('share-button'));

    expect(writeText).toHaveBeenCalledWith(EXPECTED_URL);
    await waitFor(() => expect(screen.getByTestId('share-button')).toHaveTextContent('Link copied'));
  });

  it('falls back to the clipboard when the user dismisses the share sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({
      share: vi.fn().mockRejectedValue(new DOMException('Abort', 'AbortError')),
      clipboard: { writeText },
    });
    render(<ShareButton target={target} title="Blues shuffle in E" />);

    await userEvent.click(screen.getByTestId('share-button'));

    expect(writeText).toHaveBeenCalledWith(EXPECTED_URL);
  });

  it('stays quiet when neither route is available', async () => {
    stubNavigator({
      share: undefined,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    render(<ShareButton target={target} title="Blues shuffle in E" />);

    await userEvent.click(screen.getByTestId('share-button'));

    expect(screen.getByTestId('share-button')).toHaveTextContent('Share');
  });
});

describe('ShareButton in the Android app', () => {
  beforeEach(() => {
    isNative.mockReturnValue(true);
  });

  it('opens the native share sheet instead of navigator.share', async () => {
    vi.mocked(Share.share).mockResolvedValue({});
    const webShare = vi.fn();
    const writeText = vi.fn();
    stubNavigator({ share: webShare, clipboard: { writeText } });
    render(<ShareButton target={target} title="Blues shuffle in E" />);

    await userEvent.click(screen.getByTestId('share-button'));

    expect(Share.share).toHaveBeenCalledWith({
      title: 'Blues shuffle in E',
      text: 'Blues shuffle in E — guitarRot',
      url: EXPECTED_URL,
      dialogTitle: expect.any(String),
    });
    expect(webShare).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.getByTestId('share-button')).toHaveTextContent('Share');
  });

  it('says nothing when the user closes the sheet', async () => {
    // Capacitor rejects with a plain object, not an Error.
    vi.mocked(Share.share).mockRejectedValue({ message: 'Share canceled' });
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ share: undefined, clipboard: { writeText } });
    render(<ShareButton target={target} title="Blues shuffle in E" />);

    await userEvent.click(screen.getByTestId('share-button'));

    expect(Share.share).toHaveBeenCalledTimes(1);
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.getByTestId('share-button')).toHaveTextContent('Share');
  });

  it('copies the link if the sheet cannot open', async () => {
    vi.mocked(Share.share).mockRejectedValue({ message: 'Unsupported url' });
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ share: undefined, clipboard: { writeText } });
    render(<ShareButton target={target} title="Blues shuffle in E" />);

    await userEvent.click(screen.getByTestId('share-button'));

    expect(writeText).toHaveBeenCalledWith(EXPECTED_URL);
    await waitFor(() => expect(screen.getByTestId('share-button')).toHaveTextContent('Link copied'));
  });
});

describe('ShareButton as a pill', () => {
  it('says "Share" in the house label style: sentence case, no tracked capitals', () => {
    render(<ShareButton target={target} title="Blues shuffle in E" />);

    const button = screen.getByTestId('share-button');
    expect(button).toHaveTextContent('Share');
    expect(button).toHaveClass('label');
    expect(button.className).not.toMatch(/uppercase|tracking-|text-xs/);
  });
});

describe('ShareButton as an icon', () => {
  it('is a 44px circle that still says what it does', () => {
    render(<ShareButton target={target} title="Blues shuffle in E" iconOnly />);

    const button = screen.getByTestId('share-button');
    expect(button).toHaveClass('h-11', 'w-11');
    expect(button).toHaveAccessibleName('Share Blues shuffle in E');
    // The word is still there for a screen reader, but out of the way.
    expect(screen.getByText('Share')).toHaveClass('sr-only');
  });

  it('confirms a copy with a tick, and says so in words for a screen reader', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ share: undefined, clipboard: { writeText } });
    render(<ShareButton target={target} title="Blues shuffle in E" iconOnly />);

    await userEvent.click(screen.getByTestId('share-button'));

    await waitFor(() => expect(screen.getByText('Link copied')).toHaveClass('sr-only'));
    expect(screen.getByTestId('share-button').querySelector('svg')).toHaveClass('text-good');
  });
});
