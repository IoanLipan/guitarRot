import { describe, expect, it } from 'vitest';
import { errorHaptic, successHaptic, tapHaptic } from './haptics';

describe('haptics', () => {
  // There is no native bridge in jsdom, so Capacitor.isNativePlatform() is
  // false: every call here should be a silent no-op, never a throw. That is
  // the whole safety contract these functions exist to provide.
  it('does nothing and never throws outside a native platform', () => {
    expect(() => tapHaptic()).not.toThrow();
    expect(() => successHaptic()).not.toThrow();
    expect(() => errorHaptic()).not.toThrow();
  });
});
