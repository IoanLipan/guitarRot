import { useEffect, useState, type ReactNode } from 'react';
import { ExternalLinkIcon, NoteIcon } from '@/ui/icons';
import { prefersReducedMotion } from '@/ui/motion';
import { Capacitor } from '@capacitor/core';
import { getToneProfile, TONE_PROFILES, type AudioEngine } from '@/audio';
import { getChord } from '@/content';
import { chordStrings, chordVoicing, STANDARD_TUNING } from '@/music';
import type { ProgressHandle } from './useProgress';
import { ANDROID_APP_URL, PRIVACY_URL } from './links';

/** Strummed when you audition a tone — an open E, the first chord everyone learns. */
const PREVIEW_CHORD_ID = 'E-open';

/** How long the sheet takes to slide away; it stays mounted that long after `open` goes false (see index.css). */
export const SHEET_EXIT_MS = 230;

export function SettingsSheet({
  open,
  onClose,
  engine,
  progress,
}: {
  open: boolean;
  onClose: () => void;
  engine: AudioEngine;
  progress: ProgressHandle;
}) {
  const activeToneId = progress.state.settings.toneId;

  // The sheet slides up when opened and down when closed, so closing has to
  // keep it on screen a moment: `mounted` stays true until the slide is done.
  // With reduced motion there is no slide, so it goes at once.
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  const closing = mounted && !open;
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => setMounted(false), SHEET_EXIT_MS);
    return () => clearTimeout(timer);
  }, [closing]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  function handlePick(toneId: string) {
    progress.updateSettings({ toneId });
    const profile = getToneProfile(toneId);
    engine.setTone(profile);

    // Audition it immediately — a tone you can't hear isn't a choice.
    const chord = getChord(PREVIEW_CHORD_ID);
    if (chord !== undefined) {
      engine.strum(chordVoicing(chord, STANDARD_TUNING), { strings: chordStrings(chord) });
    }
  }

  if (!open && (!mounted || prefersReducedMotion())) return null;

  return (
    <div
      className="sheet-root fixed inset-0 z-50 flex flex-col justify-end"
      data-testid="settings-sheet"
      data-state={open ? 'open' : 'closing'}
    >
      <button
        type="button"
        aria-label="Close settings"
        onClick={onClose}
        className="sheet-backdrop absolute inset-0 bg-black/60"
      />

      <div className="sheet-panel relative max-h-[85%] overflow-y-auto rounded-t-3xl bg-surface pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-[0_-20px_60px_rgba(0,0,0,0.6)]">
        <div className="sticky top-0 flex items-center justify-between bg-surface px-6 pt-5 pb-3">
          <h2 className="text-2xl font-black">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="press flex min-h-11 items-center rounded-full bg-surface-2 px-5 text-sm font-bold text-ink-dim"
          >
            Done
          </button>
        </div>

        <section className="px-6 pt-2">
          <h3 className="text-[13px] font-bold tracking-wider text-ink-dim uppercase">
            Guitar tone
          </h3>
          <p className="mt-1 text-sm text-ink-dim">
            Changes how every riff, chord, and quiz note sounds. Tap to hear it.
          </p>

          <div className="mt-4 flex flex-col gap-3">
            {TONE_PROFILES.map((profile) => {
              const isActive = profile.id === activeToneId;
              return (
                <button
                  key={profile.id}
                  type="button"
                  data-testid={`tone-${profile.id}`}
                  aria-pressed={isActive}
                  onClick={() => handlePick(profile.id)}
                  className={`press press-soft flex items-center gap-4 rounded-2xl px-4 py-4 text-left ${
                    isActive ? 'bg-accent/12 ring-2 ring-accent' : 'bg-surface-2 ring-2 ring-transparent'
                  }`}
                >
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: isActive ? 'var(--color-accent)' : 'var(--color-surface)',
                      color: isActive ? 'var(--color-ground)' : 'var(--color-ink-dim)',
                    }}
                  >
                    <NoteIcon size={22} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block text-base font-extrabold"
                      style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-ink)' }}
                    >
                      {profile.name}
                    </span>
                    <span className="block text-sm leading-snug text-ink-dim">{profile.blurb}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="px-6 pt-8">
          <h3 className="text-[13px] font-bold tracking-wider text-ink-dim uppercase">Sound</h3>
          <p className="mt-2 text-sm text-ink-dim">
            Engine: <span className="font-bold text-ink">{engine.backend}</span>. Sampled plays
            recorded guitar notes; synth is the fallback when samples are unavailable. Both play
            exact pitches, so quizzes are always in tune.
          </p>
        </section>

        <section className="px-6 pt-8" data-testid="about-section">
          <h3 className="text-[13px] font-bold tracking-wider text-ink-dim uppercase">About</h3>
          <p className="mt-2 text-sm text-ink-dim">
            guitarRot{' '}
            <span className="font-bold text-ink" data-testid="app-version">
              v{__APP_VERSION__}
            </span>
          </p>

          <div className="mt-3 flex flex-col gap-2">
            <AboutLink href={PRIVACY_URL} testId="privacy-link">
              Privacy policy
            </AboutLink>
            {/* The Android app is already installed if this is running inside it. */}
            {!Capacitor.isNativePlatform() && (
              <AboutLink href={ANDROID_APP_URL} testId="android-app-link">
                Get the Android app
              </AboutLink>
            )}
          </div>

          {/* CC BY requires the attribution to travel with the work, so it
              lives in the app and not only in the repository. */}
          <p className="mt-4 text-xs leading-relaxed text-ink-dim/80" data-testid="sample-credit">
            Guitar samples: tonejs-instruments by Nicholaus Brosowsky, CC BY 3.0 — recorded by
            University of Iowa EMS, quartertone and Karoryfer.
          </p>
        </section>
      </div>
    </div>
  );
}

/**
 * A link that leaves the app. `target="_blank"` is the whole mechanism on both
 * platforms: in a browser it opens a tab, and in the Android app Capacitor's
 * WebViewClient sees an address that is not the app's own and hands it to the
 * system (ACTION_VIEW) instead of loading it, so the app's WebView is never
 * navigated away from the app.
 */
function AboutLink({
  href,
  testId,
  children,
}: {
  href: string;
  testId: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={testId}
      className="press press-soft flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3 text-[15px] font-bold text-ink"
    >
      {children}
      <ExternalLinkIcon size={20} className="text-ink-dim" />
    </a>
  );
}

export default SettingsSheet;
