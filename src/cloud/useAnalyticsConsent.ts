import { useSyncExternalStore } from 'react';
import { analyticsConsent, subscribeAnalyticsConsent, type Consent } from './analytics';

/** The device's analytics choice, live: a screen showing it re-renders when it changes. */
export function useAnalyticsConsent(): Consent {
  return useSyncExternalStore(subscribeAnalyticsConsent, analyticsConsent, () => 'unset');
}
