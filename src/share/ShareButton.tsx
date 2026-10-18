import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { tapHaptic } from '@/app/haptics';
import { shareUrl, type ShareTarget } from './shareId';

/** How long the "Link copied" confirmation holds. */
const COPIED_MS = 1600;

export type ShareButtonProps = {
  target: ShareTarget;
  /** What the card is, for the OS share sheet's preview. */
  title: string;
  className?: string;
};

/**
 * True when the Share plugin rejected because the sheet was dismissed
 * ("Share canceled"). Capacitor hands native rejections to JS as a plain
 * `{ message }` object rather than an `Error`, so don't test `instanceof`.
 */
function isCancellation(error: unknown): boolean {
  const message = typeof error === 'string' ? error : (error as { message?: unknown } | null)?.message;
  return typeof message === 'string' && /cancel/i.test(message);
}

/**
 * Shares a card by link.
 *
 * In the Android app it opens the native share sheet through Capacitor's Share
 * plugin: the WebView has no `navigator.share`, so without this the button
 * would only ever copy. On the web it uses the browser's share sheet where
 * there is one (mobile browsers) and falls back to the clipboard on desktop.
 */
export function ShareButton({ target, title, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    },
    [],
  );

  function flashCopied() {
    setCopied(true);
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), COPIED_MS);
  }

  async function handleShare() {
    tapHaptic();
    const url = shareUrl(target);

    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title,
          text: `${title} — guitarRot`,
          url,
          dialogTitle: 'Share this with a friend',
        });
        return;
      } catch (error) {
        // Closing the sheet rejects; the user changed their mind, so say nothing.
        // Anything else means the sheet could not open: copy the link instead.
        if (isCancellation(error)) return;
      }
    } else if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text: `${title} — guitarRot`, url });
        return;
      } catch {
        // Dismissing the share sheet rejects. Fall through to the clipboard
        // rather than treating a cancelled share as a failure.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      flashCopied();
    } catch {
      // No clipboard permission and no share sheet: nothing useful left to do.
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      aria-label={`Share ${title}`}
      data-testid="share-button"
      className={`flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-bold tracking-wider text-ink-dim uppercase active:scale-95 ${className ?? ''}`}
    >
      <ShareIcon />
      {copied ? 'Link copied' : 'Share'}
    </button>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        d="M12 3v12M12 3 8 7M12 3l4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default ShareButton;
