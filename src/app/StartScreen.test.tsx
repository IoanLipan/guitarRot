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
});
