import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Haptics are a nicety, never load-bearing: every call swallows its own
 * errors (some devices/emulators have no vibration motor) and does nothing
 * at all in the browser, where there's no native bridge to call.
 */
async function safely(run: () => Promise<void>): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await run();
  } catch {
    // No motor, or the platform doesn't implement this call. Silently skip.
  }
}

/** A light tap — buttons, tab switches, fret taps. */
export function tapHaptic(): void {
  void safely(() => Haptics.impact({ style: ImpactStyle.Light }));
}

/** A correct quiz answer. */
export function successHaptic(): void {
  void safely(() => Haptics.notification({ type: NotificationType.Success }));
}

/** A wrong quiz answer. */
export function errorHaptic(): void {
  void safely(() => Haptics.notification({ type: NotificationType.Error }));
}
