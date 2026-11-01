/** Where the account stands. `disabled` means this build has no cloud features at all. */
export type AccountStatus = 'disabled' | 'loading' | 'signed-out' | 'signed-in';

/** The sign-in methods an account can have: Firebase's own ids. */
export const PASSWORD_PROVIDER = 'password';
export const GOOGLE_PROVIDER = 'google.com';

/** The signed-in person, as much of Firebase's user as the app is allowed to lean on. */
export type AccountUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string;
  /** Sign-in methods linked to the account: `password`, `google.com`. */
  providers: string[];
  emailVerified: boolean;
};

export type AccountState =
  | { status: 'disabled' | 'loading' | 'signed-out'; user: null }
  | { status: 'signed-in'; user: AccountUser };

export type SignUpInput = { email: string; password: string; displayName: string };
export type SignInInput = { email: string; password: string };
export type DeleteAccountInput = {
  /** Needed only when the account signs in with a password and Firebase wants a fresh sign-in first. */
  password?: string;
};

/** What a screen can do about the account. Every action rejects with an {@link AccountError}. */
export type AccountActions = {
  signUpWithEmail(input: SignUpInput): Promise<void>;
  signInWithEmail(input: SignInInput): Promise<void>;
  /** Always resolves the same way for a well-formed address, so it never says whether an account exists. */
  sendPasswordReset(email: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  /**
   * Deletes the signed-in account for good: asks for a fresh sign-in if Firebase wants one, runs the
   * `onBeforeAccountDelete` hooks, then deletes the user. Progress on the device is not touched.
   */
  deleteAccount(input?: DeleteAccountInput): Promise<void>;
};

/** `useAccount()`: the state and the actions together. */
export type AccountApi = AccountState & AccountActions;

/** The form field an error belongs under, when it belongs to one. */
export type AccountErrorField = 'name' | 'email' | 'password';

/**
 * Why an account action failed, in words fit for the screen. `code` is
 * Firebase's (`auth/wrong-password`) or one of ours (`cancelled`,
 * `password-needed`, `cleanup-failed`, `cloud-disabled`).
 */
export class AccountError extends Error {
  readonly code: string;
  readonly field: AccountErrorField | undefined;

  constructor(code: string, message: string, field?: AccountErrorField) {
    super(message);
    this.name = 'AccountError';
    this.code = code;
    this.field = field;
  }

  /** The person backed out (closed the Google dialog, say): nothing to show. */
  get cancelled(): boolean {
    return this.code === 'cancelled';
  }
}
