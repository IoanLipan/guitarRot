import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';

const native = vi.hoisted(() => ({
  backButton: null as null | (() => void),
  remove: vi.fn(),
  addListener: vi.fn(),
}));
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: native.addListener,
    minimizeApp: vi.fn(() => Promise.resolve()),
  },
}));

const { backAction, useBackButton } = await import('./useBackButton');

const nothingOpen = { settingsOpen: false, tab: 'feed', lessonOpen: false, songOpen: false } as const;

describe('backAction', () => {
  it('closes the Settings sheet before anything underneath it', () => {
    expect(
      backAction({ settingsOpen: true, tab: 'learn', lessonOpen: true, songOpen: true }),
    ).toBe('close-settings');
  });

  it('closes an open lesson on the Learn tab', () => {
    expect(backAction({ ...nothingOpen, tab: 'learn', lessonOpen: true })).toBe('close-lesson');
  });

  it('closes an open song on the Songs tab', () => {
    expect(backAction({ ...nothingOpen, tab: 'songs', songOpen: true })).toBe('close-song');
  });

  it('goes to the Feed from any other tab once nothing is open', () => {
    expect(backAction({ ...nothingOpen, tab: 'learn' })).toBe('go-to-feed');
    expect(backAction({ ...nothingOpen, tab: 'songs' })).toBe('go-to-feed');
    expect(backAction({ ...nothingOpen, tab: 'quiz' })).toBe('go-to-feed');
  });

  it('closes a pick that is open on the You tab, and ignores one on a tab you are not looking at', () => {
    expect(backAction({ ...nothingOpen, tab: 'you', pickOpen: true })).toBe('close-pick');
    expect(backAction({ ...nothingOpen, tab: 'you' })).toBe('go-to-feed');
    expect(backAction({ ...nothingOpen, tab: 'quiz', pickOpen: true })).toBe('go-to-feed');
    expect(backAction({ ...nothingOpen, tab: 'feed', pickOpen: true })).toBe('minimize');
  });

  it('leaves a quiz run, its practice or its results one step at a time, before leaving the Quiz tab', () => {
    for (const quizLayer of ['run', 'practice', 'results'] as const) {
      expect(backAction({ ...nothingOpen, tab: 'quiz', quizLayer })).toBe('quiz-back');
    }
    expect(backAction({ ...nothingOpen, tab: 'quiz', quizLayer: 'select' })).toBe('go-to-feed');
    // A run is nothing to Back on another tab.
    expect(backAction({ ...nothingOpen, tab: 'learn', quizLayer: 'run' })).toBe('go-to-feed');
  });

  it('puts the Settings sheet above a pick and a run', () => {
    expect(backAction({ ...nothingOpen, settingsOpen: true, tab: 'quiz', quizLayer: 'run' })).toBe('close-settings');
    expect(backAction({ ...nothingOpen, settingsOpen: true, tab: 'you', pickOpen: true })).toBe('close-settings');
  });

  it('minimizes from the Feed', () => {
    expect(backAction(nothingOpen)).toBe('minimize');
  });

  it('ignores a lesson or song that is open on a tab you are not looking at', () => {
    expect(backAction({ ...nothingOpen, tab: 'quiz', lessonOpen: true, songOpen: true })).toBe('go-to-feed');
    expect(backAction({ ...nothingOpen, tab: 'feed', lessonOpen: true, songOpen: true })).toBe('minimize');
    expect(backAction({ ...nothingOpen, tab: 'songs', lessonOpen: true })).toBe('go-to-feed');
  });
});

describe('useBackButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    native.backButton = null;
    native.addListener.mockImplementation((name: string, callback: () => void) => {
      if (name === 'backButton') native.backButton = callback;
      return Promise.resolve({ remove: native.remove });
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('registers nothing in a browser', () => {
    renderHook(() => useBackButton(vi.fn()));
    expect(native.addListener).not.toHaveBeenCalled();
  });

  describe('on a phone', () => {
    beforeEach(() => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    });

    it('calls the latest handler, without re-registering when the handler changes', () => {
      const first = vi.fn();
      const second = vi.fn();
      const { rerender } = renderHook(({ onBack }) => useBackButton(onBack), {
        initialProps: { onBack: first },
      });
      rerender({ onBack: second });

      native.backButton?.();

      expect(native.addListener).toHaveBeenCalledTimes(1);
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });

    it('removes the listener on unmount', async () => {
      const { unmount } = renderHook(() => useBackButton(vi.fn()));
      await Promise.resolve();
      unmount();

      expect(native.remove).toHaveBeenCalledTimes(1);
    });

    it('removes it even when unmounted before registration finished', async () => {
      const { unmount } = renderHook(() => useBackButton(vi.fn()));
      unmount();
      await Promise.resolve();
      await Promise.resolve();

      expect(native.remove).toHaveBeenCalledTimes(1);
    });
  });
});
