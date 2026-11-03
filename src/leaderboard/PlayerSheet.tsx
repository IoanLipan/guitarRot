import { useRef } from 'react';
import { BottomSheet } from '@/game/BottomSheet';
import { CloseIcon, ExternalLinkIcon } from '@/ui/icons';
import type { BoardEntry } from './model';
import { reportLink } from './report';

/**
 * What can be done about another player: report their name, or hide them. A sheet like the
 * others, opened from the dots on a leaderboard row. Both end the same way on this phone (the
 * player is hidden); Report also opens an email to us first, with the name and the player id.
 * The hiding and the closing are the caller's (`onHide`), so the sheet owns no state of its own.
 */
export function PlayerSheet({
  player,
  onClose,
  onHide,
}: {
  /** The player, or null when the sheet is closed. */
  player: BoardEntry | null;
  onClose: () => void;
  /** Hides the player on this phone and closes the sheet. */
  onHide: (uid: string) => void;
}) {
  // While the sheet slides away the player is already gone; it keeps showing who it was about.
  const last = useRef<BoardEntry | null>(null);
  if (player !== null) last.current = player;
  const shown = last.current;

  return (
    <BottomSheet open={player !== null} onClose={onClose} label="Report or hide a player" testId="player-sheet">
      {shown !== null && (
        <div className="mx-auto w-full max-w-md px-6 pt-2.5">
          <div aria-hidden="true" className="mx-auto mb-3 h-1 w-9 rounded-full bg-ink-faint/50" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-headline font-black break-words" data-testid="player-sheet-name">
                {shown.name}
              </h2>
              <p className="text-meta text-ink-dim">Level {shown.level}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close player options"
              className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink"
            >
              <CloseIcon size={20} />
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <a
              href={reportLink(shown)}
              onClick={() => onHide(shown.uid)}
              data-testid="player-report"
              className="press press-soft flex min-h-14 items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-body font-extrabold">Report this name</span>
                <span className="block text-meta leading-snug text-ink-dim">
                  Opens an email to us with the name and the player id. They’re hidden for you too.
                </span>
              </span>
              <ExternalLinkIcon size={20} className="shrink-0 text-ink-dim" />
            </a>
            <button
              type="button"
              onClick={() => onHide(shown.uid)}
              data-testid="player-hide"
              className="press press-soft flex min-h-14 w-full items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-body font-extrabold">Hide this player</span>
                <span className="block text-meta leading-snug text-ink-dim">
                  They come off your board on this phone. You can bring them back from the foot of the board.
                </span>
              </span>
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
