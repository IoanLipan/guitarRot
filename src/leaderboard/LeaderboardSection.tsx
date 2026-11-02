import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { useAccount } from '@/cloud/AccountProvider';
import { useOpenAccountSheet } from '@/cloud/AccountSheetContext';
import { Field } from '@/cloud/Field';
import { useProfile } from '@/cloud/ProfileProvider';
import type { AccountUser } from '@/cloud/types';
import type { ProgressHandle } from '@/app/useProgress';
import { ConfirmDialog } from '@/game/ConfirmDialog';
import { BoardView } from './BoardView';
import { NAME_MAX, normalizeName, suggestName, validateLeaderboardName } from './name';
import { joinBoard, removeEntry, renameEntry } from './service';
import { useOnline } from './useBoard';
import { useOwnEntry } from './useOwnEntry';

export const LEAVE_TITLE = 'Leave the leaderboard?';
export const LEAVE_BODY =
  'Your name comes off the board for everyone. Your progress stays on this phone, and you can join again any time.';

const FRAME = 'rise-in flex flex-col gap-4 rounded-3xl bg-surface p-4';

function Card({ state, delay, children }: { state: string; delay: string; children: ReactNode }) {
  return (
    <section aria-label="Leaderboard" className={FRAME} style={{ '--delay': delay } as CSSProperties} data-testid="leaderboard" data-state={state}>
      <h2 className="label">Leaderboard</h2>
      {children}
    </section>
  );
}

function Notice({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div role="status" className="flex flex-col items-start gap-3 rounded-2xl bg-surface-2 p-4">
      <div className="flex flex-col gap-1">
        <p className="text-body font-bold">{title}</p>
        <p className="text-meta text-ink-dim">{body}</p>
      </div>
      {action}
    </div>
  );
}

/** Joining: the name to go by, then the one amber button. */
function JoinForm({ user, xp, instrument, uid }: { user: AccountUser; xp: number; instrument: ProgressHandle['state']['settings']['instrument']; uid: string }) {
  // The name on the board starts as the username, so joining is one tap; until the person types, it follows the username
  // (which may arrive a moment after the form), and without one it starts from their name or email as before.
  const { username } = useProfile();
  const [typed, setTyped] = useState<string | null>(null);
  const name = typed ?? username ?? suggestName(user);
  const setName = (value: string) => setTyped(value);
  const [problem, setProblem] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [joining, setJoining] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (joining) return;
    const invalid = validateLeaderboardName(name);
    setProblem(invalid);
    if (invalid !== null) return;
    setFailed(false);
    setJoining(true);
    // Not waited for: the board shows the player straight away, and the server's answer only matters if it is no.
    joinBoard(uid, { name, xp, instrument }).catch(() => {
      setFailed(true);
      setJoining(false);
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4" data-testid="lb-join">
      <p className="text-body leading-snug text-ink-dim">
        See how you rank against other players. Your name, level and XP show on the board; your email never does.
      </p>
      <Field
        label="Name on the board"
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          if (problem !== null) setProblem(null);
        }}
        error={problem}
        hint={`3 to ${NAME_MAX} characters. Everyone on the board can see it.`}
        autoComplete="nickname"
        autoCapitalize="words"
        spellCheck={false}
        data-testid="lb-name"
      />
      {failed && (
        <p role="alert" className="text-meta text-bad" data-testid="lb-join-error">
          We couldn’t add you just now. Check your connection and try again.
        </p>
      )}
      <button
        type="submit"
        disabled={joining}
        data-testid="lb-join-button"
        className="press flex min-h-12 items-center justify-center rounded-full bg-accent px-4 text-base font-extrabold text-ground disabled:opacity-60"
      >
        {joining ? 'Joining…' : 'Show me on the leaderboard'}
      </button>
    </form>
  );
}

/** Rename and leave, under the board. */
function Manage({ uid, name }: { uid: string; name: string }) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(name);
  const [problem, setProblem] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const changeRef = useRef<HTMLButtonElement>(null);

  function save(event: FormEvent) {
    event.preventDefault();
    const invalid = validateLeaderboardName(draft);
    setProblem(invalid);
    if (invalid !== null) return;
    setError(null);
    if (normalizeName(draft) !== name) {
      renameEntry(uid, draft).catch(() => setError('We couldn’t change your name just now. Try again.'));
    }
    setRenaming(false);
  }

  function leave() {
    setConfirming(false);
    setError(null);
    removeEntry(uid).catch(() => setError('We couldn’t take you off the board just now. Try again.'));
  }

  return (
    <div className="flex flex-col gap-3" data-testid="lb-manage">
      {error !== null && (
        <p role="alert" className="text-meta text-bad" data-testid="lb-error">
          {error}
        </p>
      )}
      {renaming ? (
        <form onSubmit={save} noValidate className="flex flex-col gap-3" data-testid="lb-rename">
          <Field
            label="Name on the board"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              if (problem !== null) setProblem(null);
            }}
            error={problem}
            autoComplete="nickname"
            autoCapitalize="words"
            spellCheck={false}
            autoFocus
            data-testid="lb-rename-input"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              data-testid="lb-rename-save"
              className="press flex min-h-12 flex-1 items-center justify-center rounded-full bg-surface-3 px-4 text-base font-bold text-ink"
            >
              Save name
            </button>
            <button
              type="button"
              onClick={() => {
                setRenaming(false);
                setDraft(name);
                setProblem(null);
                // The button that opened this comes back; focus goes to it, not to the top of the page.
                queueMicrotask(() => changeRef.current?.focus());
              }}
              className="press flex min-h-12 items-center justify-center rounded-full px-4 text-base font-bold text-ink-dim"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-x-4">
          <button
            ref={changeRef}
            type="button"
            onClick={() => {
              setDraft(name);
              setRenaming(true);
            }}
            data-testid="lb-rename-open"
            className="press flex min-h-11 items-center text-meta font-bold text-ink"
          >
            Change name
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            data-testid="lb-leave"
            className="press flex min-h-11 items-center text-meta font-bold text-bad"
          >
            Leave the leaderboard
          </button>
        </div>
      )}
      {confirming && (
        <ConfirmDialog
          title={LEAVE_TITLE}
          body={LEAVE_BODY}
          keepLabel="Stay on the board"
          confirmLabel="Leave"
          onKeep={() => setConfirming(false)}
          onConfirm={leave}
        />
      )}
    </div>
  );
}

/**
 * The Leaderboard section of the You tab. Where accounts do not exist (a build
 * without a Firebase config) it renders nothing at all. Signed out it says
 * what it is and points up at the Account card; signed in it asks for a name
 * first, because being on the board is a choice; once joined it shows the two
 * lists, the player's own place, and the way to rename or leave.
 */
export function LeaderboardSection({
  progress,
  delay = '0ms',
  onView,
}: {
  progress: Pick<ProgressHandle, 'state'>;
  delay?: string;
  /**
   * Called once, the first time the section is on screen for somebody (signed out, or signed in), and
   * never where there are no accounts. It is how usage analytics hears about the section; the section
   * itself knows nothing of analytics.
   */
  onView?: () => void;
}) {
  const account = useAccount();
  const openSheet = useOpenAccountSheet();
  const online = useOnline();
  const [attempt, setAttempt] = useState(0);
  const uid = account.status === 'signed-in' ? account.user.uid : null;
  const own = useOwnEntry(uid, attempt);

  const shown = account.status === 'signed-out' || account.status === 'signed-in';
  const reported = useRef(false);
  const latestOnView = useRef(onView);
  latestOnView.current = onView;
  useEffect(() => {
    if (!shown || reported.current) return;
    reported.current = true;
    latestOnView.current?.();
  }, [shown]);

  if (account.status === 'disabled') return null;

  if (account.status === 'loading') {
    return (
      <Card state="loading" delay={delay}>
        <p className="sr-only" role="status">
          Checking your account
        </p>
        <div aria-hidden="true" className="h-5 w-4/5 rounded-full bg-surface-2" />
        <div aria-hidden="true" className="h-12 rounded-full bg-surface-2" />
      </Card>
    );
  }

  if (account.status === 'signed-out') {
    return (
      <Card state="signed-out" delay={delay}>
        <p className="text-body leading-snug text-ink-dim">Make an account to see how you rank against other players.</p>
        <button
          type="button"
          onClick={() => openSheet('sign-up')}
          data-testid="lb-sign-in"
          className="press flex min-h-12 items-center justify-center rounded-full bg-surface-2 px-4 text-base font-bold text-ink"
        >
          Create account to join
        </button>
      </Card>
    );
  }

  const { user } = account;
  if (user === null) return null; // not reachable: every other status has been answered above
  const retry = (
    <button
      type="button"
      onClick={() => setAttempt((n) => n + 1)}
      data-testid="lb-retry"
      className="press flex min-h-11 items-center rounded-full bg-surface-3 px-5 text-meta font-bold text-ink"
    >
      Try again
    </button>
  );

  if (own.status === 'error') {
    return (
      <Card state="error" delay={delay}>
        <Notice title="Can’t load the leaderboard" body="Something went wrong on our side. Try again in a moment." action={retry} />
      </Card>
    );
  }

  const joined = own.status === 'ready' ? own.entry : null;

  // Joining (or finding out whether you have) needs the server: a row that is "not there" on a phone that
  // is offline may simply not have been saved on it yet.
  if (!online && joined === null) {
    return (
      <Card state="offline" delay={delay}>
        <Notice
          title="You’re offline"
          body="Connect to join the leaderboard or to see how you rank. Your progress is saved on this phone either way."
        />
      </Card>
    );
  }

  if (own.status !== 'ready') {
    return (
      <Card state="loading" delay={delay}>
        <p className="sr-only" role="status">
          Loading the leaderboard
        </p>
        <div aria-hidden="true" className="h-5 w-4/5 rounded-full bg-surface-2" />
        <div aria-hidden="true" className="h-12 rounded-full bg-surface-2" />
        <div aria-hidden="true" className="h-12 rounded-full bg-surface-2" />
      </Card>
    );
  }

  if (joined === null) {
    return (
      <Card state="not-joined" delay={delay}>
        <JoinForm user={user} xp={progress.state.xp} instrument={progress.state.settings.instrument} uid={user.uid} />
      </Card>
    );
  }

  return (
    <Card state="joined" delay={delay}>
      <BoardView me={joined} settled={!own.pending} />
      <Manage key={joined.uid} uid={user.uid} name={joined.name} />
    </Card>
  );
}

export default LeaderboardSection;
