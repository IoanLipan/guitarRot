import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { StartScreen } from './StartScreen';
import type { StartPlan } from './startPlan';
import { FIXTURE_COURSE } from '@/learn/testkit';

const first: StartPlan = { kind: 'first', lesson: FIXTURE_COURSE[0]! };

function screenWith(overrides: Partial<Parameters<typeof StartScreen>[0]> = {}) {
  const onChoose = vi.fn();
  render(
    <StartScreen
      plan={first}
      loading={false}
      failed={false}
      chosen={null}
      sharedLink={false}
      onChoose={onChoose}
      {...overrides}
    />,
  );
  return onChoose;
}

describe('StartScreen', () => {
  it('reports which of the two buttons was tapped', () => {
    const onChoose = screenWith();

    fireEvent.click(screen.getByTestId('start-learn'));
    fireEvent.click(screen.getByTestId('start-feed'));

    expect(onChoose.mock.calls).toEqual([['learn'], ['feed']]);
  });

  it('shows the tapped button as loading, and locks both while the sounds load', () => {
    screenWith({ loading: true, chosen: 'feed' });

    expect(screen.getByTestId('start-feed')).toHaveTextContent('Loading sounds…');
    expect(screen.getByTestId('start-learn')).toHaveTextContent('Start lesson 1');
    expect(screen.getByTestId('start-feed')).toBeDisabled();
    expect(screen.getByTestId('start-learn')).toBeDisabled();
  });

  it('offers a retry on the button that was tapped when loading failed, and says why', () => {
    const onChoose = screenWith({ failed: true, chosen: 'learn' });

    expect(screen.getByTestId('start-learn')).toHaveTextContent('Try again');
    expect(screen.getByTestId('start-learn')).toBeEnabled();
    expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded');

    fireEvent.click(screen.getByTestId('start-learn'));
    expect(onChoose).toHaveBeenCalledWith('learn');
  });

  it('says nothing about a failure when there was none', () => {
    screenWith();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the logo and wordmark', () => {
    screenWith();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('guitarRot');
  });

  describe('the way in for somebody who already has an account', () => {
    it('is a quiet link below the two real choices, when sign-in is on offer', () => {
      const onSignIn = vi.fn();
      screenWith({ onSignIn });
      const link = screen.getByRole('button', { name: 'I already have an account' });
      expect(link).toHaveAttribute('data-testid', 'start-sign-in');
      expect(screen.getByTestId('start-feed').compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      // Quiet: not a filled button, and not amber (the Start button is the one amber thing).
      expect(link.className).not.toMatch(/bg-(accent|surface)/);
      // Big enough to hit with a thumb.
      expect(link.className).toContain('min-h-11');
      fireEvent.click(link);
      expect(onSignIn).toHaveBeenCalledTimes(1);
    });

    it('is not there without it (no accounts in this build, or already signed in)', () => {
      screenWith();
      expect(screen.queryByTestId('start-sign-in')).toBeNull();
      expect(screen.queryByText(/already have an account/)).toBeNull();
    });

    it('is on the first question too, because a new phone meets that screen first', () => {
      const onSignIn = vi.fn();
      screenWith({ needsInstrument: true, onPickInstrument: vi.fn(), onSignIn });
      expect(screen.getByRole('heading', { name: 'What do you play?' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'I already have an account' }));
      expect(onSignIn).toHaveBeenCalledTimes(1);
    });

    it('is not on the first question without it', () => {
      screenWith({ needsInstrument: true, onPickInstrument: vi.fn() });
      expect(screen.queryByTestId('start-sign-in')).toBeNull();
    });
  });
});
