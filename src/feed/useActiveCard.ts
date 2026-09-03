import { useCallback, useEffect, useRef, useState } from 'react';

/** A card must be this visible before it takes over as the active one. */
export const ACTIVE_THRESHOLD = 0.6;

const OBSERVED_THRESHOLDS = [0, 0.25, 0.5, ACTIVE_THRESHOLD, 0.75, 1];

export type ActiveCardHandle = {
  activeIndex: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Put this on every card element, alongside `data-card-index`. */
  cardProps: (index: number) => { 'data-card-index': number };
  scrollToCard: (index: number) => void;
  /**
   * Call after dropping cards off the front of the list: every surviving
   * card's index moves, so the tracked one has to move with it and the
   * observer's memory of who was visible has to be thrown away.
   */
  shiftActiveIndex: (delta: number) => void;
};

/**
 * Tracks which feed card currently owns the viewport.
 *
 * The spec's hard rule is that exactly one card may produce sound at a
 * time; this is what designates that card. Everything audio-related in the
 * feed keys off `activeIndex` rather than deciding for itself.
 */
export function useActiveCard(count: number): ActiveCardHandle {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  // Bumped whenever indices are reassigned, to force a fresh observer.
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;
    // jsdom has no IntersectionObserver; card 0 simply stays active there.
    if (typeof IntersectionObserver === 'undefined') return;

    const ratios = new Map<number, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const raw = entry.target.getAttribute('data-card-index');
          if (raw === null) continue;
          const index = Number(raw);
          if (!Number.isInteger(index)) continue;
          ratios.set(index, entry.intersectionRatio);
        }

        let bestIndex: number | null = null;
        let bestRatio = 0;
        for (const [index, ratio] of ratios) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestIndex = index;
          }
        }
        // Below the threshold nothing takes over, so a half-scrolled feed
        // keeps the card it had rather than flickering between two.
        if (bestIndex !== null && bestRatio >= ACTIVE_THRESHOLD) setActiveIndex(bestIndex);
      },
      { root: container, threshold: OBSERVED_THRESHOLDS },
    );

    for (const card of container.querySelectorAll('[data-card-index]')) observer.observe(card);
    return () => observer.disconnect();
  }, [count, generation]);

  const cardProps = useCallback((index: number) => ({ 'data-card-index': index }), []);

  const scrollToCard = useCallback((index: number) => {
    const target = containerRef.current?.querySelector<HTMLElement>(
      `[data-card-index="${index}"]`,
    );
    // Optional call: jsdom doesn't implement scrollIntoView.
    target?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, []);

  const shiftActiveIndex = useCallback((delta: number) => {
    setActiveIndex((current) => Math.max(0, current + delta));
    setGeneration((current) => current + 1);
  }, []);

  return { activeIndex, containerRef, cardProps, scrollToCard, shiftActiveIndex };
}
