import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Pick } from '@/game/Pick';
import { tierForLevel } from '@/game/materials';
import { scoreOf, type BoardEntry, type BoardKind } from './model';
import { useBoard } from './useBoard';
import { isoWeekKey } from './week';

/** Rows shown before "Show more"; the list itself is the top {@link BOARD_SIZE}. */
export const COLLAPSED_ROWS = 10;

const TABS: readonly { kind: BoardKind; label: string; caption: string }[] = [
  { kind: 'week', label: 'This week', caption: 'Most XP earned this week. A new week starts every Monday.' },
  { kind: 'all', label: 'All time', caption: 'Most XP earned in total.' },
];

export function formatXp(xp: number): string {
  return xp.toLocaleString('en-US');
}

type RowData = { name: string; level: number; score: number; rank: number | null };

/**
 * One player: place, name, level, XP. The place and the XP are in the display
 * face like the You tab's other numbers. The name gets whatever width is left
 * and is cut with an ellipsis, so a 20-character name still fits a 320px phone.
 */
function Row({ row, you, testId }: { row: RowData; you: boolean; testId: string }) {
  return (
    <li
      data-testid={testId}
      data-you={you ? 'true' : undefined}
      className={`flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2 ${you ? 'bg-surface-3' : ''}`}
    >
      <span
        className={`font-display w-9 shrink-0 text-center text-[32px] leading-none font-black tabular-nums ${
          row.rank !== null && row.rank <= 3 ? 'text-ink' : 'text-ink-dim'
        }`}
        data-testid={`${testId}-rank`}
      >
        {row.rank ?? '–'}
        <span className="sr-only">{row.rank === null ? ' No place yet' : ''}</span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="flex items-center gap-2 text-body leading-tight font-extrabold">
          <span className="truncate" data-testid={`${testId}-name`}>
            {row.name}
          </span>
          {you && <span className="shrink-0 rounded-full bg-surface-2 px-2 text-label leading-5 font-bold text-ink">You</span>}
        </p>
        <p className="flex items-center gap-1.5 text-meta leading-tight text-ink-dim">
          <Pick tier={tierForLevel(row.level)} category="streak" size={13} />
          Level {row.level}
        </p>
      </div>
      <p className="shrink-0 text-right leading-none">
        <span className="font-display text-[32px] font-black tabular-nums" data-testid={`${testId}-xp`}>
          {formatXp(row.score)}
        </span>
        <span className="ml-1 text-meta text-ink-dim">XP</span>
      </p>
    </li>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" data-testid="lb-loading">
      <p className="sr-only" role="status">
        Loading the leaderboard
      </p>
      <div aria-hidden="true" className="flex flex-col gap-1">
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="flex min-h-14 items-center gap-3 px-3 py-2">
            <div className="h-7 w-9 rounded-full bg-surface-2" />
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="h-4 w-2/3 rounded-full bg-surface-2" />
              <div className="h-3 w-1/3 rounded-full bg-surface-2" />
            </div>
            <div className="h-7 w-14 rounded-full bg-surface-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** The two lists of the board and the player's place in each. */
export function BoardView({
  me,
  settled,
  weekKey = isoWeekKey(new Date()),
}: {
  /** The player's own row. */
  me: BoardEntry;
  /** The player's row has reached the server, so it is in the lists. */
  settled: boolean;
  weekKey?: string;
}) {
  const [kind, setKind] = useState<BoardKind>('week');
  const [expanded, setExpanded] = useState(false);
  const { state, retry } = useBoard(kind, me, weekKey, settled);
  const id = useId();
  const tabRefs = useRef<Partial<Record<BoardKind, HTMLButtonElement | null>>>({});
  const tab = TABS.find((candidate) => candidate.kind === kind) ?? TABS[0]!;
  const panelId = `${id}-panel`;

  function choose(next: BoardKind) {
    setKind(next);
    setExpanded(false);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next = kind === 'week' ? 'all' : 'week';
    choose(next);
    tabRefs.current[next]?.focus();
  }

  const you: RowData = { name: me.name, level: me.level, score: scoreOf(me, kind, weekKey), rank: null };
  const listed = state.status === 'ready' ? state.rows.slice(0, expanded ? state.rows.length : COLLAPSED_ROWS) : [];
  const hidden = state.status === 'ready' ? state.rows.length - listed.length : 0;
  const youListed = listed.some((row) => row.uid === me.uid);

  return (
    <div className="flex flex-col gap-3" data-testid="lb-board">
      <div
        role="tablist"
        aria-label="Leaderboard"
        onKeyDown={onKeyDown}
        className="relative grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1"
      >
        <span
          aria-hidden="true"
          data-testid="lb-tab-pill"
          className="tab-indicator pointer-events-none absolute top-1 bottom-1 left-1 w-[calc((100%-0.75rem)/2)] rounded-full bg-surface-3"
          style={{ transform: kind === 'week' ? 'translateX(0)' : 'translateX(calc(100% + 0.25rem))' }}
        />
        {TABS.map(({ kind: tabKind, label }) => {
          const selected = tabKind === kind;
          return (
            <button
              key={tabKind}
              ref={(node) => {
                tabRefs.current[tabKind] = node;
              }}
              type="button"
              role="tab"
              id={`${id}-${tabKind}`}
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              data-testid={`lb-tab-${tabKind}`}
              onClick={() => choose(tabKind)}
              className={`press relative z-10 h-11 rounded-full text-meta font-bold ${selected ? 'text-ink' : 'text-ink-dim'}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={panelId} aria-labelledby={`${id}-${kind}`} className="flex flex-col gap-3">
        <p className="text-meta text-ink-dim">{tab.caption}</p>

        {state.status === 'loading' && <Skeleton />}

        {state.status === 'error' && (
          <div role="status" className="flex flex-col items-start gap-3 rounded-2xl bg-surface-2 p-4" data-testid="lb-offline" data-offline={state.offline}>
            <div className="flex flex-col gap-1">
              <p className="text-body font-bold">{state.offline ? 'You’re offline' : 'Can’t load the leaderboard'}</p>
              <p className="text-meta text-ink-dim">
                {state.offline
                  ? 'Connect to see the leaderboard. The XP you earn meanwhile is saved and counts once you’re back.'
                  : 'Something went wrong on our side. Try again in a moment.'}
              </p>
            </div>
            <button
              type="button"
              onClick={retry}
              data-testid="lb-retry"
              className="press flex min-h-11 items-center rounded-full bg-surface-3 px-5 text-meta font-bold text-ink"
            >
              Try again
            </button>
          </div>
        )}

        {state.status === 'ready' && (
          <>
            {listed.length === 0 ? (
              <div className="flex flex-col gap-1 rounded-2xl bg-surface-2 p-4" data-testid="lb-empty">
                <p className="font-display text-[30px] leading-none font-black">
                  {kind === 'week' ? 'Be the first this week' : 'Nobody is here yet'}
                </p>
                <p className="text-meta text-ink-dim">Practice anything to put your name at the top.</p>
              </div>
            ) : (
              <ol aria-label={kind === 'week' ? 'Top players this week' : 'Top players of all time'} className="flex flex-col gap-1" data-testid="lb-list">
                {listed.map((row) => (
                  <Row
                    key={row.uid}
                    row={row}
                    you={row.uid === me.uid}
                    testId={`lb-row-${row.uid}`}
                  />
                ))}
              </ol>
            )}

            {hidden > 0 && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                data-testid="lb-more"
                className="press flex min-h-11 items-center justify-center rounded-full bg-surface-2 px-5 text-meta font-bold text-ink"
              >
                Show {hidden} more
              </button>
            )}

            {/* The player's own place, last: right in the list when they are on screen, here when they are not. */}
            {!youListed && (
              <div role="group" aria-label="Your place" data-testid="lb-own">
                <ol>
                  <Row row={{ ...you, rank: state.ownRank }} you testId="lb-own-row" />
                </ol>
                {state.ownRank === null && (
                  <p className="px-3 pt-1 text-meta text-ink-dim" data-testid="lb-own-note">
                    Earn some XP and you’re on this week’s board.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
