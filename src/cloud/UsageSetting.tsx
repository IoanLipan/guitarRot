import { useId } from 'react';
import { analyticsAvailable, setAnalyticsConsent } from './analytics';
import { useAnalyticsConsent } from './useAnalyticsConsent';

/**
 * Settings > Privacy: "Share anonymous usage", the one switch for everything
 * analytics does. Off by default and until the person turns it on (or answers
 * the first-run question); turning it off stops collection at once and clears
 * the analytics client id. Renders nothing where the build has no analytics.
 */
export function UsageSetting() {
  const consent = useAnalyticsConsent();
  const labelId = useId();
  const hintId = useId();
  if (!analyticsAvailable()) return null;
  const on = consent === 'granted';

  return (
    <section className="px-6 pt-8" data-testid="usage-setting">
      <h3 className="label">Privacy</h3>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={labelId}
        aria-describedby={hintId}
        onClick={() => setAnalyticsConsent(!on)}
        data-testid="usage-switch"
        className="press press-soft mt-3 flex min-h-14 w-full items-center gap-4 rounded-2xl bg-surface-2 px-4 py-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span id={labelId} className="block text-body font-extrabold">
            Share anonymous usage
          </span>
          <span id={hintId} className="block text-meta leading-snug text-ink-dim">
            Which screens and features you use, and for how long. No ads, never sold, no account details.
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
            on ? 'bg-accent' : 'bg-surface-3 ring-2 ring-ink-faint/60 ring-inset'
          }`}
        >
          <span
            className={`absolute top-1 left-1 h-5 w-5 rounded-full transition-transform duration-200 ${
              on ? 'translate-x-5 bg-ground' : 'translate-x-0 bg-ink-dim'
            }`}
          />
        </span>
      </button>
    </section>
  );
}
