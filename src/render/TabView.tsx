import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Riff } from '@/content';
import { TabStaff, TabStringNames } from './TabStaff';
import { createTabGeometry, stringSpacingForHeight } from './tabGeometry';

export type TabViewProps = {
  riff: Riff;
  /** The playhead's `<g>`, for a requestAnimationFrame loop to move by transform (see TabStaff). */
  playheadRef?: React.Ref<SVGGElement>;
  /** Goes on the sideways scroller that holds the staff: hand it to useFollowPlayhead. */
  scrollerRef?: React.Ref<HTMLDivElement>;
  /**
   * Line spacing in pixels. Leave it out and the staff grows to fill the height
   * its parent gives it (the parent must have a height of its own, e.g. a flex
   * child with `min-h-0 flex-1`), anywhere from 22 to 40. Give it where the
   * parent's height comes from the staff itself, such as a lesson step.
   */
  stringSpacing?: number;
  className?: string;
};

/**
 * A riff's tab as a panel: the staff, which scrolls sideways to follow the
 * playhead, and beside it the string names E A D G B e, which do not. The
 * staff is sized to the room it has instead of being a fixed strip, so on a tall
 * phone it fills the card and on a short one it shrinks to fit.
 *
 * The x of a beat does not depend on the line spacing, so a caller can keep
 * its own `createTabGeometry({ bars, timeSignature })` for moving the playhead.
 */
export function TabView({ riff, playheadRef, scrollerRef, stringSpacing, className = '' }: TabViewProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState<number | null>(null);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (stringSpacing !== undefined || box === null) return;
    const measure = () => setRoom(box.clientHeight > 0 ? box.clientHeight : null);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [stringSpacing]);

  const spacing = stringSpacing ?? (room === null ? undefined : stringSpacingForHeight(room));
  const geometry = useMemo(
    () =>
      createTabGeometry({
        bars: riff.bars,
        timeSignature: riff.timeSignature,
        ...(spacing === undefined ? {} : { stringSpacing: spacing }),
      }),
    [riff.bars, riff.timeSignature, spacing],
  );

  return (
    <div ref={boxRef} className={`flex h-full min-h-0 w-full items-center ${className}`}>
      <div className="flex max-h-full min-w-0 flex-1 overflow-hidden rounded-2xl bg-surface">
        <TabStringNames geometry={geometry} className="shrink-0" />
        <div
          ref={scrollerRef}
          data-testid="tab-scroller"
          className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain"
        >
          <TabStaff riff={riff} geometry={geometry} showPlayhead playheadRef={playheadRef} />
        </div>
      </div>
    </div>
  );
}

export default TabView;
