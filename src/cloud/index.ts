/**
 * The cloud module: what the rest of the app (and the later phases: progress
 * sync, leaderboard, analytics) may import. Everything here is cheap to load;
 * the Firebase SDK itself is fetched on demand by ./firebase.
 */
export { cloud, cloudEnabled, EMULATOR_PROJECT_ID, type CloudConfig, type FirebaseWebConfig } from './config';
export { onBeforeAccountDelete, type BeforeDeleteHook } from './deleteHooks';
export {
  CloudDisabledError,
  getFirebaseApp,
  getFirebaseAuth,
  getFirestoreDb,
  loadAppSdk,
  loadAuthSdk,
  loadFirestoreSdk,
} from './firebase';
export { AccountContext, AccountProvider, useAccount } from './AccountProvider';
export { SyncContext, useCloudSync, useSync, type SyncApi, type SyncableProgress } from './useCloudSync';
export type { SyncStatus } from './sync';
export {
  AccountError,
  type AccountActions,
  type AccountApi,
  type AccountErrorField,
  type AccountState,
  type AccountStatus,
  type AccountUser,
  type DeleteAccountInput,
  type SignInInput,
  type SignUpInput,
} from './types';
