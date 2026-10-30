import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

/** How wide the fade is where there is more to scroll to. */
const FADE_PX = 28;

/** What shows of an edge: faded out while there is more beyond it, solid once the scroll has reached it. */
export function fadeMask(edges: { start: boolean; end: boolean }): string | undefined {
  if (!edges.start && !edges.end) return undefined;
  const from = edges.start ? `transparent 0, #000 ${FADE_PX}px` : '#000 0';
  const to = edges.end ? `#000 calc(100% - ${FADE_PX}px), transparent 100%` : '#000 100%';
  return `linear-gradient(to right, ${from}, ${to})`;
}

/**
 * A row that scrolls sideways inside the page's own gutters, with the edge
 * that has more beyond it faded out, so a board wider than the phone reads as
 * a window onto something longer instead of as a picture cut off at the edge
 * of the screen. The fade follows the scroll: it is gone from an edge once the
 * scroll has reached it, so the last fret is never left half hidden.
 */
export function ScrollFade({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const node = ref.current;
    if (node === null) return;
    const start = node.scrollLeft > 1;
    const end = node.scrollLeft < node.scrollWidth - node.clientWidth - 1;
    setEdges((current) => (current.start === start && current.end === end ? current : { start, end }));
  }, []);

  useEffect(() => {
    measure();
    const node = ref.current;
    if (node === null) return;
    // The window turning sideways, or the board's own size changing, moves the edges too.
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    if (node.firstElementChild !== null) observer.observe(node.firstElementChild);
    return () => observer.disconnect();
  }, [measure]);

  const mask = fadeMask(edges);
  return (
    <div
      ref={ref}
      onScroll={measure}
      data-testid="scroll-fade"
      data-fade-start={edges.start}
      data-fade-end={edges.end}
      className={`overflow-x-auto overscroll-x-contain ${className}`}
      style={mask === undefined ? undefined : { maskImage: mask, WebkitMaskImage: mask }}
    >
      {children}
    </div>
  );
}

export default ScrollFade;
