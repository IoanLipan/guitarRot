import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { cloudEnabled } from './config';
import { useAccount } from './AccountProvider';
import type { ProfileState } from './types';

const UNKNOWN: ProfileState = { status: 'unknown', username: null };

/** Exported so a test can say what the profile is without a Firestore behind it. */
export const ProfileContext = createContext<ProfileState>(UNKNOWN);

/**
 * Follows the signed-in person's profile (their username) for the whole app. It does nothing, and
 * loads nothing, until somebody is signed in: a build without accounts, or a signed-out visit, never
 * fetches the Firestore SDK for it. The profile belongs to the person, so signing out (or into
 * another account) drops it at once rather than letting the last one show for a moment.
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const account = useAccount();
  const uid = account.status === 'signed-in' ? account.user.uid : null;
  const [profile, setProfile] = useState<{ uid: string; state: ProfileState } | null>(null);

  useEffect(() => {
    if (!cloudEnabled || uid === null) return;
    let cancelled = false;
    let stop: (() => void) | undefined;
    void import('./usernames')
      .then(({ watchProfile }) => {
        if (!cancelled) stop = watchProfile(uid, (state) => setProfile({ uid, state }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [uid]);

  // An answer for somebody else, or for nobody, is no answer.
  const value = uid !== null && profile?.uid === uid ? profile.state : UNKNOWN;
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

/**
 * The signed-in person's profile. `{ status: 'ready', username: null }` means they have not picked a
 * username yet; anything else that isn't `ready` means it can't be said (yet), so never treat it as "none".
 */
export function useProfile(): ProfileState {
  return useContext(ProfileContext);
}

/** True when the person is signed in and the server confirmed they have no username yet. */
export function needsUsername(account: { status: string }, profile: ProfileState): boolean {
  return account.status === 'signed-in' && profile.status === 'ready' && profile.username === null;
}
