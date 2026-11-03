import { createContext, useContext } from 'react';

/**
 * What the account sheet is opened for:
 *  - `sign-up`: the create-an-account form, with Google and Apple on top.
 *  - `sign-in`: email and password (and the providers) for somebody who has an account.
 *  - `nudge`: "Save your progress", the one-time offer after a first win: the same ways in, and "Not now".
 *  - `username`: asks a signed-in person with no username to pick one.
 *  - `change-username`: the same step, for somebody who has one and wants another.
 */
export type AccountSheetIntent = 'sign-up' | 'sign-in' | 'nudge' | 'username' | 'change-username';

type Open = (intent: AccountSheetIntent) => void;

const NOTHING: Open = () => undefined;

const OpenAccountSheetContext = createContext<Open>(NOTHING);

/** The app shell provides this: it owns the one account sheet, so the start screen, Settings and the You tab all open the same one. */
export const OpenAccountSheetProvider = OpenAccountSheetContext.Provider;

/** Opens the account sheet. Outside the app shell (a test of one card) it does nothing. */
export function useOpenAccountSheet(): Open {
  return useContext(OpenAccountSheetContext);
}
