import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ASK_AFTER_MS, CONSENT_TITLE, ConsentSheet } from './ConsentSheet';
import { UsageSetting } from './UsageSetting';

// The analytics API, with a consent that really changes and tells its subscribers.
const analytics = vi.hoisted(() => {
  const state = { available: true, consent: 'unset' as 'granted' | 'denied' | 'unset' };
  const listeners = new Set<() => void>();
  return {
    state,
    listeners,
    setAnalyticsConsent: vi.fn((granted: boolean) => {
      state.consent = granted ? 'granted' : 'denied';
      listeners.forEach((listener) => listener());
    }),
  };
});
vi.mock('./analytics', () => ({
  analyticsAvailable: () => analytics.state.available,
  analyticsConsent: () => analytics.state.consent,
  subscribeAnalyticsConsent: (listener: () => void) => {
    analytics.listeners.add(listener);
    return () => analytics.listeners.delete(listener);
  },
  setAnalyticsConsent: analytics.setAnalyticsConsent,
}));

beforeEach(() => {
  vi.useFakeTimers();
  analytics.state.available = true;
  analytics.state.consent = 'unset';
  analytics.listeners.clear();
  analytics.setAnalyticsConsent.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe('the first-run question', () => {
  it('waits a moment after the moment is right, so it does not land with the first card', () => {
    render(<ConsentSheet ready />);
    expect(screen.queryByTestId('consent-sheet')).toBeNull();
    wait(ASK_AFTER_MS - 100);
    expect(screen.queryByTestId('consent-sheet')).toBeNull();
    wait(200);
    expect(screen.getByTestId('consent-sheet')).toBeInTheDocument();
  });

  it('says what it is asking, in a dialog with a name, and links the privacy policy', () => {
    render(<ConsentSheet ready />);
    wait(ASK_AFTER_MS + 10);
    const dialog = screen.getByRole('dialog', { name: CONSENT_TITLE });
    expect(dialog).toHaveTextContent('which screens and features you use, and for how long');
    expect(dialog).toHaveTextContent('no ads, never sold');
    expect(dialog).toHaveTextContent('Settings');
    const link = screen.getByRole('link', { name: 'Read the privacy policy' });
    expect(link).toHaveAttribute('href', expect.stringContaining('privacy.html'));
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('offers two buttons of the same size, and yes is the amber one', () => {
    render(<ConsentSheet ready />);
    wait(ASK_AFTER_MS + 10);
    const yes = screen.getByRole('button', { name: 'Share usage' });
    const no = screen.getByRole('button', { name: 'No thanks' });
    expect(yes.className).toContain('bg-accent');
    expect(no.className).not.toContain('bg-accent');
    for (const size of ['min-h-12', 'rounded-full', 'px-6', 'text-body']) {
      expect(yes.className).toContain(size);
      expect(no.className).toContain(size);
    }
  });

  it('records yes, and goes', () => {
    render(<ConsentSheet ready />);
    wait(ASK_AFTER_MS + 10);
    fireEvent.click(screen.getByRole('button', { name: 'Share usage' }));
    expect(analytics.setAnalyticsConsent).toHaveBeenCalledWith(true);
    expect(screen.getByTestId('consent-sheet')).toHaveAttribute('data-state', 'closing');
    wait(400);
    expect(screen.queryByTestId('consent-sheet')).toBeNull();
  });

  it('records no, and goes', () => {
    render(<ConsentSheet ready />);
    wait(ASK_AFTER_MS + 10);
    fireEvent.click(screen.getByRole('button', { name: 'No thanks' }));
    expect(analytics.setAnalyticsConsent).toHaveBeenCalledWith(false);
    wait(400);
    expect(screen.queryByTestId('consent-sheet')).toBeNull();
  });

  it('is not an answer to walk away: Escape and a tap outside leave it up', () => {
    render(<ConsentSheet ready />);
    wait(ASK_AFTER_MS + 10);
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByTestId('consent-sheet'));
    expect(analytics.setAnalyticsConsent).not.toHaveBeenCalled();
    expect(screen.getByTestId('consent-sheet')).toHaveAttribute('data-state', 'open');
    // Nothing behind the dimmed screen is labelled as a way to close it.
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });

  it('does not ask until the shell says the moment is right, and not over a lesson that opens', () => {
    const { rerender } = render(<ConsentSheet ready={false} />);
    wait(ASK_AFTER_MS * 3);
    expect(screen.queryByTestId('consent-sheet')).toBeNull();

    rerender(<ConsentSheet ready />);
    wait(ASK_AFTER_MS - 200);
    rerender(<ConsentSheet ready={false} />);
    wait(ASK_AFTER_MS);
    expect(screen.queryByTestId('consent-sheet')).toBeNull();

    // The wait starts over when the moment comes back.
    rerender(<ConsentSheet ready />);
    wait(ASK_AFTER_MS + 10);
    expect(screen.getByTestId('consent-sheet')).toBeInTheDocument();
  });

  it('never asks twice: an answer already given means no sheet', () => {
    for (const consent of ['granted', 'denied'] as const) {
      analytics.state.consent = consent;
      const { unmount } = render(<ConsentSheet ready />);
      wait(ASK_AFTER_MS * 2);
      expect(screen.queryByTestId('consent-sheet')).toBeNull();
      unmount();
    }
  });

  it('asks nothing where the build has no analytics', () => {
    analytics.state.available = false;
    render(<ConsentSheet ready />);
    wait(ASK_AFTER_MS * 2);
    expect(screen.queryByTestId('consent-sheet')).toBeNull();
  });
});

describe('Settings: Share anonymous usage', () => {
  it('is a switch that shows the choice, off until it has been made', () => {
    render(<UsageSetting />);
    const toggle = screen.getByRole('switch', { name: 'Share anonymous usage' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle).toHaveAccessibleDescription(/which screens and features you use/i);
  });

  it('turns analytics on, and off again, from the one switch', () => {
    render(<UsageSetting />);
    const toggle = screen.getByRole('switch', { name: 'Share anonymous usage' });

    fireEvent.click(toggle);
    expect(analytics.setAnalyticsConsent).toHaveBeenLastCalledWith(true);
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(toggle);
    expect(analytics.setAnalyticsConsent).toHaveBeenLastCalledWith(false);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('shows yes when the question was answered yes, and no after no', () => {
    analytics.state.consent = 'granted';
    const { unmount } = render(<UsageSetting />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    unmount();

    analytics.state.consent = 'denied';
    render(<UsageSetting />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('is not there where the build has no analytics', () => {
    analytics.state.available = false;
    render(<UsageSetting />);
    expect(screen.queryByTestId('usage-setting')).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
  });
});
