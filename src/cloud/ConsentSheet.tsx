import { useEffect, useState } from 'react';
import { BottomSheet } from '@/game/BottomSheet';
import { PRIVACY_URL } from '@/app/links';
import { analyticsAvailable, setAnalyticsConsent } from './analytics';
import { useAnalyticsConsent } from './useAnalyticsConsent';

/** How long the app has been showing something steady before it asks, so the question never lands with the first card. */
export const ASK_AFTER_MS = 1200;

export const CONSENT_TITLE = 'Help make guitarRot better?';
export const CONSENT_BODY =
  'We’d like to see which screens and features you use, and for how long. It’s tied to a random id, never to your name, email or account: no ads, never sold, and you can change this any time in Settings. Under 16? Ask a parent first.';

/**
 * The one-time question about usage analytics: a calm sheet from the bottom with
 * two buttons of the same size, so neither answer is the easier one. It cannot
 * be dismissed by Escape or a tap outside, because walking away is not an
 * answer; it stays until one of the two is chosen, and then it is never shown
 * again (the choice lives in Settings from then on).
 *
 * `ready` is the shell saying the moment is right: the instrument has been
 * chosen and the person is not in a lesson, a quiz run or Settings. Where the
 * build has no analytics this renders nothing.
 */
export function ConsentSheet({ ready }: { ready: boolean }) {
  const consent = useAnalyticsConsent();
  const eligible = ready && analyticsAvailable() && consent === 'unset';
  const [due, setDue] = useState(false);

  useEffect(() => {
    if (!eligible) {
      setDue(false);
      return;
    }
    const timer = setTimeout(() => setDue(true), ASK_AFTER_MS);
    return () => clearTimeout(timer);
  }, [eligible]);

  return (
    <BottomSheet
      open={eligible && due}
      onClose={() => undefined}
      dismissible={false}
      label={CONSENT_TITLE}
      testId="consent-sheet"
    >
      <div className="px-6 pt-5 pb-1">
        <div aria-hidden="true" className="mx-auto mb-5 h-1 w-9 rounded-full bg-ink-faint/50" />
        <h2 className="font-display text-headline font-black">{CONSENT_TITLE}</h2>
        <p className="mt-3 text-body text-ink">
          {CONSENT_BODY}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setAnalyticsConsent(true)}
            data-testid="consent-share"
            className="press flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-body font-extrabold text-ground"
          >
            Share usage
          </button>
          <button
            type="button"
            onClick={() => setAnalyticsConsent(false)}
            data-testid="consent-decline"
            className="press flex min-h-12 items-center justify-center rounded-full bg-surface-3 px-6 text-body font-extrabold text-ink"
          >
            No thanks
          </button>
        </div>

        <a
          href={PRIVACY_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="consent-privacy"
          className="press mt-1 flex min-h-11 items-center justify-center text-meta font-bold text-ink-dim underline underline-offset-4"
        >
          Read the privacy policy
        </a>
      </div>
    </BottomSheet>
  );
}
