import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';

/**
 * The JavaScript half of the app's motion (the CSS half is the "Motion"
 * section of index.css). Everything that animates from code goes through here
 * so three things stay true everywhere:
 *
 *  - `prefers-reduced-motion: reduce` is honoured in one place. Every helper
 *    here does nothing under it, and a state change that was going to be
 *    animated simply happens.
 *  - An environment that cannot animate (jsdom, an old WebView: no Web
 *    Animations, no View Transitions) loses the flourish and nothing else.
 *    Content is never held back waiting on an animation.
 *  - Only `transform` and `opacity` are animated, and never per React render.
 *
 * Helpers that make DOM (sparks, ripples, pings) clean up after themselves,
 * with a timer as the backstop in case the browser never reports the end.
 */

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** The two curves index.css calls --motion-pop and --motion-slide. */
export const EASE_POP = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
export const EASE_SLIDE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

/** Where a celebration must be over, in ms. */
export const MAX_CELEBRATION_MS = 900;

/** True when the person asked their device for less motion. False where that cannot be asked (jsdom). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** Can this element be animated from code right now? */
function canAnimate(element: Element | null | undefined): element is Element {
  return element != null && typeof element.animate === 'function' && !prefersReducedMotion();
}

/** Calls `done` once, when the animation ends, is cancelled, or `fallbackMs` has passed. */
function whenDone(animation: Animation | undefined, fallbackMs: number, done: () => void): void {
  let called = false;
  const once = () => {
    if (called) return;
    called = true;
    done();
  };
  if (animation?.finished !== undefined) animation.finished.then(once, once);
  setTimeout(once, fallbackMs + 250);
}

/** Inline `--delay` for the `.rise-in` family: item `order` starts `order * stepMs` after the first. */
export function stagger(order: number, stepMs = 70, maxSteps = 10): CSSProperties {
  return { '--delay': `${Math.max(0, Math.min(order, maxSteps)) * stepMs}ms` } as CSSProperties;
}

/**
 * The transform for a progress bar's fill: the fill is always the full width
 * of its track and is slid out to the left, so it moves on the compositor and
 * keeps its rounded end (a `width` change would re-layout, and a `scaleX`
 * would squash the end). `fraction` is how full the bar is, 0 to 1.
 */
export function fillTransform(fraction: number): string {
  const clamped = Math.min(1, Math.max(0, fraction));
  return `translateX(${Math.round((clamped - 1) * 10000) / 100}%)`;
}

// ---------------------------------------------------------------------------
// Sparks
// ---------------------------------------------------------------------------

export type BurstOptions = {
  /** How many pieces. */
  count?: number;
  /** How far the pieces fly, in px. */
  spread?: number;
  /** How long the whole thing lasts, in ms (capped so a celebration stays under 900ms). */
  duration?: number;
  /** Largest piece, in px. */
  size?: number;
  colors?: readonly string[];
  /** Replaceable so a test can make it repeatable. */
  random?: () => number;
};

export const BURST_COLORS: readonly string[] = ['#ffb020', '#35d07f', '#ffd27a', '#f4f4f6', '#5b8cff'];

/**
 * A short spray of sparks and confetti from the middle of `origin`: pure DOM,
 * a handful of tiny elements on a fixed layer over the page that fly out,
 * fall a little and fade, then remove themselves. Nothing here touches React.
 */
export function burst(origin: Element | null | undefined, options: BurstOptions = {}): void {
  if (!canAnimate(origin)) return;
  const {
    count = 12,
    spread = 70,
    duration = 700,
    size = 8,
    colors = BURST_COLORS,
    random = Math.random,
  } = options;

  const box = origin.getBoundingClientRect();
  const layer = document.createElement('div');
  layer.setAttribute('data-burst', '');
  layer.setAttribute('aria-hidden', 'true');
  Object.assign(layer.style, {
    position: 'fixed',
    left: `${box.left + box.width / 2}px`,
    top: `${box.top + box.height / 2}px`,
    width: '0',
    height: '0',
    pointerEvents: 'none',
    zIndex: '80',
  });

  // Pieces start up to 60ms late so a burst reads as a spray, not a flash.
  const length = Math.min(duration, MAX_CELEBRATION_MS - 80);
  let last: Animation | undefined;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + (random() - 0.5) * 0.9;
    const distance = spread * (0.55 + random() * 0.6);
    const dx = Math.cos(angle) * distance;
    // Biased upward: sparks jump, then gravity takes them.
    const dy = Math.sin(angle) * distance - spread * 0.25;
    const side = size * (0.55 + random() * 0.6);
    const flat = random() < 0.4;
    const spin = (random() - 0.5) * 540;

    const piece = document.createElement('span');
    Object.assign(piece.style, {
      position: 'absolute',
      left: `${-side / 2}px`,
      top: `${-side / 2}px`,
      width: `${side}px`,
      height: `${flat ? side * 0.5 : side}px`,
      borderRadius: flat ? '2px' : '50%',
      background: colors[i % colors.length] ?? '#ffb020',
      opacity: '0',
    });
    layer.appendChild(piece);

    last = piece.animate(
      [
        { transform: 'translate(0px, 0px) scale(0.4) rotate(0deg)', opacity: 1 },
        {
          transform: `translate(${dx * 0.75}px, ${dy * 0.75 - 14}px) scale(1) rotate(${spin * 0.6}deg)`,
          opacity: 1,
          offset: 0.45,
        },
        {
          transform: `translate(${dx}px, ${dy + 34}px) scale(0.55) rotate(${spin}deg)`,
          opacity: 0,
        },
      ],
      { duration: length * (0.85 + random() * 0.15), delay: random() * 60, easing: 'ease-out', fill: 'forwards' },
    );
  }

  document.body.appendChild(layer);
  whenDone(last, MAX_CELEBRATION_MS, () => layer.remove());
}

// ---------------------------------------------------------------------------
// Strings and taps
// ---------------------------------------------------------------------------

export type VibrateOptions = {
  /** Biggest sideways swing, in screen px. */
  amplitude?: number;
  /** Length of one string's shake, in ms. */
  duration?: number;
  /** Delay between one string and the next, so a strum sweeps across. */
  strum?: number;
};

/** How far through its swing each of a string's keyframes is, as a fraction of the amplitude. */
const SWING = [0, 1, -0.9, 0.72, -0.55, 0.38, -0.22, 0.1, 0];

/**
 * Makes the strings of the fretboard diagram(s) inside `root` shiver, one
 * after another from the thick string to the thin: a quick decaying
 * oscillation across the string, with the line swelling a little while it
 * moves so it reads as blurred. Muted strings stay put. Looks for the
 * `data-string` groups `Fretboard` draws.
 */
export function vibrateStrings(root: Element | null | undefined, options: VibrateOptions = {}): void {
  if (root == null || prefersReducedMotion()) return;
  const { amplitude = 2.6, duration = 560, strum = 24 } = options;

  const groups = Array.from(root.querySelectorAll<SVGGElement>('[data-string]'));
  for (const group of groups) {
    if (!canAnimate(group) || group.getAttribute('data-muted') === 'true') continue;
    const board = group.ownerSVGElement;
    const vertical = board?.getAttribute('data-orientation') === 'vertical';
    const along = vertical ? 'X' : 'Y';

    // The swing is in the drawing's own units; a small diagram is drawn
    // scaled down, so convert from screen px or it would barely stir.
    const unitsToPx = board?.getScreenCTM?.()?.a ?? 1;
    const unit = amplitude / Math.max(0.2, unitsToPx || 1);
    const index = Number(group.getAttribute('data-string'));
    // Thick strings swing wider and slower.
    const swing = unit * (1.2 - Math.min(5, Math.max(0, index)) * 0.1);

    group.animate(
      SWING.map((fraction) => ({
        transform: `translate${along}(${fraction * swing}px) scale${along}(${1 + Math.abs(fraction) * 0.7})`,
        easing: 'ease-in-out',
      })),
      { duration, delay: (Number.isFinite(index) ? index : 0) * strum, easing: 'linear' },
    );
  }
}

/**
 * A circle of light spreading from where `host` was touched (or its middle)
 * and fading. `host` should clip its children, which the `.fx-host` class does.
 */
export function ripple(
  host: HTMLElement | null | undefined,
  point?: { x: number; y: number },
  color = 'rgba(255, 176, 32, 0.5)',
): void {
  if (!canAnimate(host)) return;
  const box = host.getBoundingClientRect();
  const x = point === undefined || (point.x === 0 && point.y === 0) ? box.width / 2 : point.x - box.left;
  const y = point === undefined || (point.x === 0 && point.y === 0) ? box.height / 2 : point.y - box.top;
  const diameter = Math.max(box.width, box.height, 48) * 1.7;

  const wave = document.createElement('span');
  wave.setAttribute('aria-hidden', 'true');
  Object.assign(wave.style, {
    position: 'absolute',
    left: `${x - diameter / 2}px`,
    top: `${y - diameter / 2}px`,
    width: `${diameter}px`,
    height: `${diameter}px`,
    borderRadius: '50%',
    background: color,
    pointerEvents: 'none',
    opacity: '0',
    zIndex: '0',
  });
  host.appendChild(wave);
  const animation = wave.animate(
    [
      { transform: 'scale(0.05)', opacity: 1 },
      { transform: 'scale(1)', opacity: 0 },
    ],
    { duration: 560, easing: EASE_SLIDE, fill: 'forwards' },
  );
  whenDone(animation, 560, () => wave.remove());
}

/** What a strummed chord does: the tile ripples under the finger and its strings shiver. */
export function strumFx(host: HTMLElement | null | undefined, point?: { x: number; y: number }): void {
  ripple(host, point);
  vibrateStrings(host);
}

/** A ring that swells out of a point on an SVG and fades: the "you touched this fret" pulse. */
export function pingAt(
  svg: SVGSVGElement | null | undefined,
  cx: number,
  cy: number,
  radius: number,
  color = 'var(--color-accent)',
): void {
  if (!canAnimate(svg)) return;
  const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  ring.setAttribute('cx', String(cx));
  ring.setAttribute('cy', String(cy));
  ring.setAttribute('r', String(radius));
  ring.setAttribute('fill', color);
  ring.setAttribute('pointer-events', 'none');
  ring.style.transformBox = 'fill-box';
  ring.style.transformOrigin = 'center';
  ring.style.opacity = '0';
  svg.appendChild(ring);
  const animation = ring.animate(
    [
      { transform: 'scale(0.7)', opacity: 0.75 },
      { transform: 'scale(2.1)', opacity: 0 },
    ],
    { duration: 440, easing: EASE_SLIDE, fill: 'forwards' },
  );
  whenDone(animation, 440, () => ring.remove());
}

// ---------------------------------------------------------------------------
// View transitions
// ---------------------------------------------------------------------------

type ViewTransitionLike = { finished: Promise<unknown> };
type DocumentWithTransitions = Document & {
  startViewTransition?: (update: () => void | Promise<void>) => ViewTransitionLike;
};

export type ViewTransitionOptions = {
  /** The element that should be animated on its own (named for the duration of the transition only). */
  element?: HTMLElement | null;
  /** Its transition name; index.css styles `tab-content`. */
  name?: string;
  /** Which way the content is moving; styles read it as `html[data-motion-dir]`. */
  direction?: 'forward' | 'back';
};

export function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined' && typeof (document as DocumentWithTransitions).startViewTransition === 'function';
}

/** Only the newest transition may tidy up, or an interrupted one would strip the names off its successor. */
let latestTransition = 0;

/**
 * Runs `update` (a state change that swaps what is on screen) inside a View
 * Transition when the browser has them and the person has not asked for less
 * motion; otherwise just runs it. `update` is flushed synchronously inside
 * the transition so the new picture is in the DOM when the browser looks.
 *
 * The element is only given its transition name while the transition runs,
 * since a named element is a stacking context the rest of the time for no use.
 */
export function runViewTransition(update: () => void, options: ViewTransitionOptions = {}): void {
  const doc = typeof document === 'undefined' ? undefined : (document as DocumentWithTransitions);
  if (doc === undefined || prefersReducedMotion() || typeof doc.startViewTransition !== 'function') {
    update();
    return;
  }

  const { element = null, name = 'tab-content', direction } = options;
  const root = doc.documentElement;
  const id = (latestTransition += 1);
  if (direction !== undefined) root.setAttribute('data-motion-dir', direction);
  element?.style.setProperty('view-transition-name', name);
  const cleanup = () => {
    if (id !== latestTransition) return;
    root.removeAttribute('data-motion-dir');
    element?.style.removeProperty('view-transition-name');
  };

  let transition: ViewTransitionLike;
  try {
    transition = doc.startViewTransition(() => {
      flushSync(update);
    });
  } catch {
    cleanup();
    update();
    return;
  }
  transition.finished.then(cleanup, cleanup);
}

/** `runViewTransition` as a hook: a stable function that, once the component is gone, only updates. */
export function useViewTransition(): typeof runViewTransition {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return useCallback<typeof runViewTransition>((update, options) => {
    if (mounted.current) runViewTransition(update, options);
    else update();
  }, []);
}

// ---------------------------------------------------------------------------
// Counters
// ---------------------------------------------------------------------------

/**
 * How many times `value` has gone up since this component mounted. Use it as
 * the `key` of the element that should bump, so it remounts and replays its
 * animation on each increase (and not on the first render, or on a reset).
 * Worked out during render, so the bump starts in the same frame as the number.
 */
export function useBump(value: number): number {
  const [seen, setSeen] = useState({ value, bumps: 0 });
  if (seen.value !== value) {
    setSeen({ value, bumps: value > seen.value ? seen.bumps + 1 : seen.bumps });
  }
  return seen.bumps;
}
