import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, renderHook } from '@testing-library/react';
import {
  burst,
  MAX_CELEBRATION_MS,
  pingAt,
  prefersReducedMotion,
  REDUCED_MOTION_QUERY,
  ripple,
  runViewTransition,
  stagger,
  strumFx,
  supportsViewTransitions,
  fillTransform,
  useBump,
  useViewTransition,
  vibrateStrings,
} from './motion';

/** What jsdom lacks: an element's `animate`. Every call is recorded, and each animation finishes when told to. */
type Call = { target: Element; keyframes: Keyframe[]; options: KeyframeAnimationOptions };
let calls: Call[] = [];
let finishers: (() => void)[] = [];

function installAnimate() {
  Element.prototype.animate = function (this: Element, keyframes: Keyframe[], options?: KeyframeAnimationOptions) {
    calls.push({ target: this, keyframes, options: options ?? {} });
    let finish: () => void = () => undefined;
    const finished = new Promise<Animation>((resolve) => {
      finish = () => resolve({} as Animation);
    });
    finishers.push(finish);
    return { finished } as unknown as Animation;
  } as typeof Element.prototype.animate;
}

function reducedMotion(on: boolean) {
  window.matchMedia = vi.fn((query: string) => ({
    matches: on && query === REDUCED_MOTION_QUERY,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

/** Lets promise callbacks (the animation's `finished`) run. */
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

beforeEach(() => {
  calls = [];
  finishers = [];
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-motion-dir');
  // @ts-expect-error - put jsdom back the way it was
  delete Element.prototype.animate;
  // @ts-expect-error - ditto
  delete window.matchMedia;
  // @ts-expect-error - ditto
  delete document.startViewTransition;
  vi.useRealTimers();
});

describe('prefersReducedMotion', () => {
  it('is false where the question cannot be asked (jsdom has no matchMedia)', () => {
    expect(prefersReducedMotion()).toBe(false);
  });

  it('follows the (prefers-reduced-motion: reduce) media query', () => {
    reducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
    reducedMotion(false);
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe('stagger', () => {
  it('delays item n by n steps, and stops growing so a long list never waits long', () => {
    const delay = (style: object) => (style as Record<string, string>)['--delay'];
    expect(delay(stagger(0))).toBe('0ms');
    expect(delay(stagger(3, 50))).toBe('150ms');
    expect(delay(stagger(40, 50, 10))).toBe('500ms');
    expect(delay(stagger(-2))).toBe('0ms');
  });
});

describe('fillTransform', () => {
  it('slides a full-width fill out to the left by what is not filled, to two places', () => {
    expect(fillTransform(0)).toBe('translateX(-100%)');
    expect(fillTransform(1)).toBe('translateX(0%)');
    expect(fillTransform(1 / 3)).toBe('translateX(-66.67%)');
  });

  it('never slides further than the track, or past it', () => {
    expect(fillTransform(-2)).toBe('translateX(-100%)');
    expect(fillTransform(7)).toBe('translateX(0%)');
  });
});

describe('burst', () => {
  it('does nothing where animations cannot run (and never throws)', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    expect(() => burst(button)).not.toThrow();
    expect(() => burst(null)).not.toThrow();
    expect(document.querySelector('[data-burst]')).toBeNull();
  });

  it('sprays the asked number of pieces from a fixed layer over the page, then cleans up', async () => {
    installAnimate();
    const origin = document.createElement('button');
    document.body.appendChild(origin);

    burst(origin, { count: 9 });

    const layer = document.querySelector('[data-burst]') as HTMLElement;
    expect(layer).not.toBeNull();
    expect(layer.style.position).toBe('fixed');
    expect(layer.style.pointerEvents).toBe('none');
    expect(layer.getAttribute('aria-hidden')).toBe('true');
    expect(layer.children).toHaveLength(9);
    expect(calls).toHaveLength(9);

    finishers.forEach((finish) => finish());
    await flush();
    expect(document.querySelector('[data-burst]')).toBeNull();
  });

  it('keeps a celebration under 900ms however long it is asked for', () => {
    installAnimate();
    const origin = document.createElement('div');
    document.body.appendChild(origin);

    burst(origin, { count: 6, duration: 5000 });

    for (const { options } of calls) {
      expect(Number(options.duration) + Number(options.delay ?? 0)).toBeLessThanOrEqual(MAX_CELEBRATION_MS);
    }
  });

  it('animates only transform and opacity', () => {
    installAnimate();
    const origin = document.createElement('div');
    document.body.appendChild(origin);

    burst(origin, { count: 4 });

    for (const { keyframes } of calls) {
      for (const frame of keyframes) {
        expect(Object.keys(frame).filter((key) => key !== 'offset')).toEqual(
          expect.arrayContaining(['transform', 'opacity']),
        );
        expect(Object.keys(frame).filter((key) => !['offset', 'transform', 'opacity'].includes(key))).toEqual([]);
      }
    }
  });

  it('is repeatable when given a random source', () => {
    installAnimate();
    const origin = document.createElement('div');
    document.body.appendChild(origin);
    burst(origin, { count: 3, random: () => 0.5 });
    const first = calls.map((call) => JSON.stringify(call.keyframes));
    document.body.innerHTML = '';
    document.body.appendChild(origin);
    calls = [];
    burst(origin, { count: 3, random: () => 0.5 });
    expect(calls.map((call) => JSON.stringify(call.keyframes))).toEqual(first);
  });

  it('does nothing under prefers-reduced-motion', () => {
    installAnimate();
    reducedMotion(true);
    const origin = document.createElement('div');
    document.body.appendChild(origin);

    burst(origin);

    expect(calls).toHaveLength(0);
    expect(document.querySelector('[data-burst]')).toBeNull();
  });
});

/** A board like Fretboard draws: an svg with a group per string. */
function board(orientation: 'vertical' | 'horizontal', muted: number[] = []) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('data-orientation', orientation);
  for (let index = 0; index < 6; index += 1) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('data-string', String(index));
    if (muted.includes(index)) group.setAttribute('data-muted', 'true');
    svg.appendChild(group);
  }
  const host = document.createElement('button');
  host.appendChild(svg);
  document.body.appendChild(host);
  return { svg, host };
}

describe('vibrateStrings', () => {
  it('shakes every string that is played, in strum order, and leaves muted ones still', () => {
    installAnimate();
    const { host } = board('vertical', [0]);

    vibrateStrings(host);

    expect(calls).toHaveLength(5);
    expect(calls.map((call) => call.target.getAttribute('data-string'))).toEqual(['1', '2', '3', '4', '5']);
    const delays = calls.map((call) => Number(call.options.delay));
    expect(delays).toEqual([...delays].sort((a, b) => a - b));
    expect(new Set(delays).size).toBe(5);
  });

  it('swings across the string: sideways on a vertical board, up and down on a horizontal one', () => {
    installAnimate();
    vibrateStrings(board('vertical').host);
    expect(String(calls[0]?.keyframes[1]?.transform)).toMatch(/translateX/);

    calls = [];
    vibrateStrings(board('horizontal').host);
    expect(String(calls[0]?.keyframes[1]?.transform)).toMatch(/translateY/);
  });

  it('settles back to rest', () => {
    installAnimate();
    vibrateStrings(board('vertical').host);
    const frames = calls[0]?.keyframes ?? [];
    expect(String(frames[0]?.transform)).toMatch(/translateX\(0px\)/);
    expect(String(frames[frames.length - 1]?.transform)).toMatch(/translateX\(0px\)/);
  });

  it('does nothing under reduced motion, without a root, or where animation is missing', () => {
    installAnimate();
    reducedMotion(true);
    vibrateStrings(board('vertical').host);
    expect(calls).toHaveLength(0);

    reducedMotion(false);
    expect(() => vibrateStrings(null)).not.toThrow();
    expect(() => vibrateStrings(document.createElement('div'))).not.toThrow();
    expect(calls).toHaveLength(0);
  });
});

describe('ripple, strumFx and pingAt', () => {
  it('ripples from where the host was touched, and removes itself', async () => {
    installAnimate();
    const host = document.createElement('button');
    document.body.appendChild(host);

    ripple(host, { x: 30, y: 12 });

    expect(host.children).toHaveLength(1);
    expect(calls).toHaveLength(1);
    finishers[0]?.();
    await flush();
    expect(host.children).toHaveLength(0);
  });

  it('strumFx is the ripple and the string shiver together', () => {
    installAnimate();
    const { host } = board('vertical');

    strumFx(host, { x: 1, y: 1 });

    // One ripple plus six strings.
    expect(calls).toHaveLength(7);
  });

  it('pingAt draws a ring on the svg that swells, fades and goes', async () => {
    installAnimate();
    const { svg } = board('horizontal');

    pingAt(svg as unknown as SVGSVGElement, 10, 20, 6);

    const ring = svg.querySelector('circle');
    expect(ring).not.toBeNull();
    expect(ring?.getAttribute('cx')).toBe('10');
    expect(ring?.getAttribute('pointer-events')).toBe('none');
    finishers[0]?.();
    await flush();
    expect(svg.querySelector('circle')).toBeNull();
  });

  it('none of them animate under reduced motion', () => {
    installAnimate();
    reducedMotion(true);
    const { host, svg } = board('vertical');
    ripple(host);
    strumFx(host);
    pingAt(svg as unknown as SVGSVGElement, 1, 1, 1);
    expect(calls).toHaveLength(0);
    expect(svg.querySelector('circle')).toBeNull();
  });
});

describe('runViewTransition', () => {
  it('just runs the update where View Transitions do not exist', () => {
    const update = vi.fn();
    expect(supportsViewTransitions()).toBe(false);

    runViewTransition(update, { direction: 'forward' });

    expect(update).toHaveBeenCalledTimes(1);
    expect(document.documentElement.hasAttribute('data-motion-dir')).toBe(false);
  });

  /** A browser with View Transitions: the update runs from the callback, and the transition ends when told. */
  function installTransitions() {
    let end: () => void = () => undefined;
    const startViewTransition = vi.fn((callback: () => void) => {
      callback();
      return { finished: new Promise<void>((resolve) => (end = resolve)) };
    });
    Object.defineProperty(document, 'startViewTransition', { value: startViewTransition, configurable: true });
    return { startViewTransition, end: () => end() };
  }

  it('runs the update inside the transition, naming the element and the direction while it lasts', async () => {
    const { startViewTransition, end } = installTransitions();
    const element = document.createElement('div');
    const update = vi.fn(() => {
      // By the time the update runs, the old picture has been captured under that name.
      expect(element.style.getPropertyValue('view-transition-name')).toBe('tab-content');
    });

    runViewTransition(update, { element, direction: 'back' });

    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(document.documentElement.getAttribute('data-motion-dir')).toBe('back');

    end();
    await flush();
    expect(element.style.getPropertyValue('view-transition-name')).toBe('');
    expect(document.documentElement.hasAttribute('data-motion-dir')).toBe(false);
  });

  it('skips the transition under reduced motion and just updates', () => {
    const { startViewTransition } = installTransitions();
    reducedMotion(true);
    const update = vi.fn();

    runViewTransition(update, { direction: 'forward' });

    expect(update).toHaveBeenCalledTimes(1);
    expect(startViewTransition).not.toHaveBeenCalled();
    expect(document.documentElement.hasAttribute('data-motion-dir')).toBe(false);
  });

  it('still updates, once, if the browser throws when starting the transition', () => {
    Object.defineProperty(document, 'startViewTransition', {
      value: () => {
        throw new Error('nope');
      },
      configurable: true,
    });
    const element = document.createElement('div');
    const update = vi.fn();

    runViewTransition(update, { element, direction: 'forward' });

    expect(update).toHaveBeenCalledTimes(1);
    expect(element.style.getPropertyValue('view-transition-name')).toBe('');
    expect(document.documentElement.hasAttribute('data-motion-dir')).toBe(false);
  });

  it('an interrupted transition does not strip the names from the one that replaced it', async () => {
    let endFirst: () => void = () => undefined;
    let calls = 0;
    Object.defineProperty(document, 'startViewTransition', {
      value: (callback: () => void) => {
        callback();
        calls += 1;
        return {
          finished: calls === 1 ? new Promise<void>((resolve) => (endFirst = resolve)) : new Promise<void>(() => undefined),
        };
      },
      configurable: true,
    });
    const element = document.createElement('div');

    runViewTransition(() => undefined, { element, direction: 'forward' });
    runViewTransition(() => undefined, { element, direction: 'back' });
    endFirst();
    await flush();

    expect(element.style.getPropertyValue('view-transition-name')).toBe('tab-content');
    expect(document.documentElement.getAttribute('data-motion-dir')).toBe('back');
  });
});

describe('useViewTransition', () => {
  it('hands back a stable function that runs the update', () => {
    const { result, rerender } = renderHook(() => useViewTransition());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);

    const update = vi.fn();
    result.current(update);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('after the component is gone, only updates (never starts a transition)', () => {
    const startViewTransition = vi.fn();
    Object.defineProperty(document, 'startViewTransition', { value: startViewTransition, configurable: true });
    const { result, unmount } = renderHook(() => useViewTransition());
    unmount();

    const update = vi.fn();
    result.current(update);

    expect(update).toHaveBeenCalledTimes(1);
    expect(startViewTransition).not.toHaveBeenCalled();
  });
});

describe('useBump', () => {
  function Probe({ value }: { value: number }) {
    return <span data-testid="bumps">{useBump(value)}</span>;
  }
  const bumps = (container: HTMLElement) => Number(container.querySelector('[data-testid="bumps"]')?.textContent);

  it('counts increases only, and not the first render', () => {
    const { container, rerender } = render(<Probe value={5} />);
    expect(bumps(container)).toBe(0);

    rerender(<Probe value={6} />);
    expect(bumps(container)).toBe(1);

    rerender(<Probe value={6} />);
    expect(bumps(container)).toBe(1);

    rerender(<Probe value={0} />);
    expect(bumps(container)).toBe(1);

    rerender(<Probe value={1} />);
    rerender(<Probe value={2} />);
    expect(bumps(container)).toBe(3);
  });
});
