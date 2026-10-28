import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getToneProfile, type AudioEngine } from '@/audio';
import { RIFFS } from '@/content';

const world = vi.hoisted(() => ({
  player: null as null | {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    isPlaying: ReturnType<typeof vi.fn>;
    setSpeed: ReturnType<typeof vi.fn>;
    progress: ReturnType<typeof vi.fn>;
  },
  /** What start() answers. */
  startResult: true as boolean,
  /** What isPlaying() answers: the transport and context together. */
  audible: true as boolean,
  progress: 0,
}));

vi.mock('@capacitor/haptics', () => ({
  Haptics: { impact: vi.fn(), notification: vi.fn() },
  ImpactStyle: {},
  NotificationType: {},
}));

vi.mock('@/audio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/audio')>();
  return {
    ...actual,
    createRiffPlayer: vi.fn(() => {
      const player = {
        start: vi.fn(() => world.startResult),
        stop: vi.fn(),
        dispose: vi.fn(),
        isPlaying: vi.fn(() => world.audible),
        setSpeed: vi.fn(),
        progress: vi.fn(() => world.progress),
        totalBeats: 8,
      };
      world.player = player;
      return player;
    }),
  };
});

const { RiffCard, SILENT_GRACE_MS, SILENT_RETRY_MS } = await import('./RiffCard');

const riff = RIFFS[0]!;

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

/** jsdom does no layout, so give the staff the geometry of a scrollable one. */
function giveScrollGeometry(scroller: HTMLElement) {
  let left = 0;
  Object.defineProperty(scroller, 'scrollWidth', { value: 2000 });
  Object.defineProperty(scroller, 'clientWidth', { value: 300 });
  Object.defineProperty(scroller, 'scrollLeft', {
    get: () => left,
    set: (value: number) => {
      left = Math.min(1700, Math.max(0, value));
    },
  });
}

function renderCard(isActive = true) {
  return render(<RiffCard riff={riff} engine={fakeEngine()} isActive={isActive} />);
}

async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

describe('RiffCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    world.player = null;
    world.startResult = true;
    world.audible = true;
    world.progress = 0;
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  describe('the play button tells the truth', () => {
    it('says Pause while the riff is audibly playing', async () => {
      renderCard();
      await advance(100);
      expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    });

    it('says Play at once when the player could not start', async () => {
      world.startResult = false;
      world.audible = false;
      renderCard();
      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    });

    it('starts the riff again when it is silent, then gives up claiming to play', async () => {
      world.audible = false;
      renderCard();
      expect(world.player?.start).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();

      await advance(SILENT_RETRY_MS + 50);
      expect(world.player?.start).toHaveBeenCalledTimes(2);
      // Not yet: a context needs a moment to wake.
      expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();

      await advance(SILENT_GRACE_MS);
      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
      // One retry, not a restart every frame.
      expect(world.player?.start).toHaveBeenCalledTimes(2);
    });

    it('does not flicker to Play when the sound comes back within the grace period', async () => {
      world.audible = false;
      renderCard();
      await advance(SILENT_RETRY_MS + 50);
      world.audible = true;
      await advance(SILENT_GRACE_MS * 2);
      expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    });

    it('goes back to Pause when sound returns after it had admitted to silence', async () => {
      world.audible = false;
      renderCard();
      await advance(SILENT_GRACE_MS + 300);
      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();

      // A touch woke the audio context.
      world.audible = true;
      await advance(50);
      expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    });

    it('pauses and plays on tap', async () => {
      renderCard();
      await advance(50);

      fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
      expect(world.player?.stop).toHaveBeenCalled();
      world.audible = false;
      await advance(SILENT_GRACE_MS * 2);
      // A deliberate pause is not silence to be fixed: no restarts.
      expect(world.player?.start).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();

      world.audible = true;
      fireEvent.click(screen.getByRole('button', { name: 'Play' }));
      expect(world.player?.start).toHaveBeenCalledTimes(2);
      expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    });

    it('ends up playing when the card leaves and returns at once', async () => {
      const { rerender } = renderCard(true);
      await advance(50);
      const first = world.player;

      rerender(<RiffCard riff={riff} engine={fakeEngine()} isActive={false} />);
      rerender(<RiffCard riff={riff} engine={fakeEngine()} isActive />);
      await advance(50);

      expect(first?.stop).toHaveBeenCalled();
      expect(first?.dispose).toHaveBeenCalled();
      expect(world.player).not.toBe(first);
      expect(world.player?.start).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    });

    it('makes no sound and runs no loop while it is not the active card', async () => {
      renderCard(false);
      await advance(500);
      expect(world.player).toBeNull();
      expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    });
  });

  describe('the tab staff', () => {
    function staff() {
      const scroller = screen.getByTestId('tab-scroller');
      giveScrollGeometry(scroller);
      return scroller;
    }

    it('contains horizontal overscroll so a swipe cannot chain into the feed', () => {
      renderCard();
      expect(screen.getByTestId('tab-scroller').className).toContain('overscroll-x-contain');
    });

    it('follows the playhead while the riff plays', async () => {
      renderCard();
      const scroller = staff();
      world.progress = 0.5;
      await advance(1500);
      expect(scroller.scrollLeft).toBeGreaterThan(0);
    });

    it('lets go of the staff while it is being swiped, and for three seconds after', async () => {
      renderCard();
      const scroller = staff();
      world.progress = 0.5;
      await advance(1500);

      fireEvent.touchStart(scroller);
      scroller.scrollLeft = 50; // the swipe
      fireEvent.touchMove(scroller);
      await advance(2000);
      expect(scroller.scrollLeft).toBe(50);

      fireEvent.touchEnd(scroller);
      await advance(2900);
      expect(scroller.scrollLeft).toBe(50);

      await advance(1500);
      expect(scroller.scrollLeft).toBeGreaterThan(50);
    });

    it('leaves a paused staff where the user put it', async () => {
      renderCard();
      const scroller = staff();
      await advance(50);
      fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
      world.audible = false;
      world.progress = 0;

      scroller.scrollLeft = 400;
      await advance(6000);
      expect(scroller.scrollLeft).toBe(400);
    });
  });
});
