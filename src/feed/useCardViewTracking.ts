import { useEffect, useRef } from 'react';
import { analyticsAvailable, track } from '@/cloud/analytics';
import type { FeedItem } from './generator';

/**
 * A card counts as viewed once it has been the active one this long. Flicking
 * through ten cards in two seconds reports none of them, and a card that is
 * looked at is reported once, so the feed sends at most one event per period.
 */
export const CARD_VIEW_MS = 1500;

/** What an analytics event says about a card: its kind, and the level of the riff or chord (a quiz card has none). */
export function cardView(item: FeedItem): { kind: string; level?: number } {
  switch (item.kind) {
    case 'riff':
      return { kind: 'riff', level: item.riff.level };
    case 'chord':
      return { kind: 'chord', level: item.chord.difficulty };
    case 'quiz':
      return { kind: 'quiz' };
  }
}

/** Reports `feed_card_view` for the card that has stayed active for {@link CARD_VIEW_MS}, while the app is on screen. */
export function useCardViewTracking(item: FeedItem | undefined): void {
  const latest = useRef(item);
  latest.current = item;
  const id = item?.id;

  useEffect(() => {
    if (!analyticsAvailable() || id === undefined) return;
    const timer = setTimeout(() => {
      const card = latest.current;
      if (card === undefined || card.id !== id || document.visibilityState === 'hidden') return;
      track('feed_card_view', cardView(card));
    }, CARD_VIEW_MS);
    return () => clearTimeout(timer);
  }, [id]);
}
