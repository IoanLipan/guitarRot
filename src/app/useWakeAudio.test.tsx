import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, renderHook } from '@testing-library/react';

const audio = vi.hoisted(() => ({ wakeAudio: vi.fn() }));
vi.mock('@/audio', () => audio);

const { useWakeAudio } = await import('./useWakeAudio');

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
}

describe('useWakeAudio', () => {
  beforeEach(() => {
    audio.wakeAudio.mockReset();
    setVisibility('visible');
  });
  afterEach(() => {
    setVisibility('visible');
  });

  it('asks for the audio context to be running on every kind of gesture', () => {
    renderHook(() => useWakeAudio(true));

    fireEvent.pointerDown(document.body);
    fireEvent.pointerUp(document.body);
    fireEvent.touchStart(document.body);
    fireEvent.touchEnd(document.body);
    fireEvent.keyDown(document.body, { key: 'a' });

    expect(audio.wakeAudio).toHaveBeenCalledTimes(5);
  });

  it('hears a gesture even when the element under the finger stops it propagating', () => {
    renderHook(() => useWakeAudio(true));
    const button = document.createElement('button');
    button.addEventListener('touchend', (event) => event.stopPropagation());
    document.body.append(button);

    fireEvent.touchEnd(button);

    expect(audio.wakeAudio).toHaveBeenCalledTimes(1);
    button.remove();
  });

  it('does nothing before the audio engine exists', () => {
    renderHook(() => useWakeAudio(false));
    fireEvent.pointerDown(document.body);
    expect(audio.wakeAudio).not.toHaveBeenCalled();
  });

  it('does not wake audio for a gesture while the app is hidden', () => {
    renderHook(() => useWakeAudio(true));
    setVisibility('hidden');
    fireEvent.pointerDown(document.body);
    expect(audio.wakeAudio).not.toHaveBeenCalled();
  });

  it('stops listening when it unmounts or is turned off', () => {
    const { rerender, unmount } = renderHook(({ on }) => useWakeAudio(on), { initialProps: { on: true } });
    rerender({ on: false });
    fireEvent.pointerDown(document.body);
    expect(audio.wakeAudio).not.toHaveBeenCalled();

    rerender({ on: true });
    unmount();
    fireEvent.pointerDown(document.body);
    expect(audio.wakeAudio).not.toHaveBeenCalled();
  });
});
