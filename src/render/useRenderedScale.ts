import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

/**
 * How many screen pixels one viewBox unit of an SVG covers once the browser has
 * fitted it into its box (`preserveAspectRatio="meet"`: the smaller of the two
 * ratios). 1 until it has been measured, and wherever there is no layout at all
 * (jsdom), so a board then draws its text at the plain size.
 *
 * A fitted board shrinks with the room it is given, and text drawn in viewBox
 * units shrinks with it: 11 units on a quiz card at 320px wide is about 8 real
 * pixels. Knowing the scale lets the board ask for the size it wants in pixels.
 *
 * It reads the layout size (`clientWidth`), not the bounding box, so a card
 * that is mid-animation (scaling up from 0.88) does not skew the number.
 */
export function useRenderedScale(
  viewWidth: number,
  viewHeight: number,
): { ref: RefObject<SVGSVGElement | null>; scale: number } {
  const ref = useRef<SVGSVGElement | null>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const svg = ref.current;
    if (svg === null) return;

    const measure = () => {
      const width = svg.clientWidth || svg.getBoundingClientRect().width;
      const height = svg.clientHeight || svg.getBoundingClientRect().height;
      if (!(width > 0) || !(height > 0)) return;
      const next = Math.min(width / viewWidth, height / viewHeight);
      setScale((current) => (Math.abs(current - next) < 0.01 ? current : next));
    };

    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [viewWidth, viewHeight]);

  return { ref, scale };
}
