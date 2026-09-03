import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShareButton } from './ShareButton';

const target = { kind: 'riff', id: 'blues-shuffle-e' } as const;
const EXPECTED_URL = 'https://guitar-rot.vercel.app/?p=riff:blues-shuffle-e';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubNavigator(overrides: Record<string, unknown>) {
  vi.stubGlobal('navigator', { ...navigator, ...overrides });
}

describe('ShareButton', () => {
  it('opens the OS share sheet when there is one', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ share });
    render(<ShareButton target={target} title="Blues shuffle in E" />);

    await userEvent.click(screen.getByTestId('share-button'));

    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Blues shuffle in E', url: EXPECTED_URL }),
    );
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
