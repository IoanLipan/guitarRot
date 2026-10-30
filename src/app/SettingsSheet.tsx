import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { CheckIcon, ExternalLinkIcon } from '@/ui/icons';
import { prefersReducedMotion } from '@/ui/motion';
import { Capacitor } from '@capacitor/core';
import { getToneProfile, TONE_PROFILES, type AudioEngine } from '@/audio';
import { SONGS, getChord } from '@/content';
import { useFocusTrap } from '@/game/useFocusTrap';
import { chordStrings, chordVoicing, STANDARD_TUNING } from '@/music';
import type { ProgressHandle } from './useProgress';
import { ANDROID_APP_URL, PRIVACY_URL } from './links';

/** Strummed when you audition a tone — an open E, the first chord everyone learns. */
const PREVIEW_CHORD_ID = 'E-open';

/** Credits that song editions' licences ask the app to show (Creative Commons Attribution). */
const EDITION_CREDITS = SONGS.flatMap((song) => (song.credit === undefined ? [] : [song.credit]));

/** How long the sheet takes to slide away; it stays mounted that long after `open` goes false (see index.css). */
export const SHEET_EXIT_MS = 230;

/** What sits behind the sheet in the app shell, and so must not be reachable while it is up. */
const BEHIND = 'main, nav, aside';

/** The arrow keys move through a radio group, one row each. */
const ARROW_STEP: Readonly<Record<string, 1 | -1>> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };

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
  const titleId = useId();
  const toneHeadId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  useFocusTrap(rootRef, open);

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
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // A modal takes the screen: while it is open the app behind it can be neither
  // tabbed to nor read out (`inert`), the cursor starts on Done, and on the way
  // out it goes back to whatever opened the sheet, the gear. Done from in here,
  // on the shell's own elements, so the shell needs to know nothing about it.
  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const inerted = [...(root?.parentElement?.children ?? [])].filter(
      (element) => element !== root && element.matches(BEHIND) && !element.hasAttribute('inert'),
    );
    for (const element of inerted) element.setAttribute('inert', '');
    doneRef.current?.focus({ preventScroll: true });
    return () => {
      for (const element of inerted) element.removeAttribute('inert');
      // The tap that opened it may not have focused the gear (Safari does not focus buttons on tap).
      const back =
        opener !== null && opener.isConnected && opener !== document.body
          ? opener
          : document.querySelector<HTMLElement>('[aria-label="Settings"]');
      back?.focus({ preventScroll: true });
    };
  }, [open]);

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

  /** Arrow keys inside the group: the next tone is chosen, and heard, and the cursor moves with it. */
  function handleToneKey(event: KeyboardEvent<HTMLDivElement>) {
    const step = ARROW_STEP[event.key];
    if (step === undefined) return;
    const radios = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')];
    const from = radios.indexOf(event.target as HTMLElement);
    if (from === -1) return;
    event.preventDefault();
    const to = (from + step + radios.length) % radios.length;
    const profile = TONE_PROFILES[to];
    if (profile === undefined) return;
    handlePick(profile.id);
    radios[to]?.focus();
  }

  // Only one radio is a Tab stop (the chosen one, or the first if none is): Tab leaves the group, arrows move in it.
  const tabStopId = TONE_PROFILES.some((profile) => profile.id === activeToneId)
    ? activeToneId
    : TONE_PROFILES[0]?.id;

  if (!open && (!mounted || prefersReducedMotion())) return null;

  return (
    <div
      ref={rootRef}
      className="sheet-root fixed inset-0 z-50 flex flex-col justify-end"
      data-testid="settings-sheet"
      data-state={open ? 'open' : 'closing'}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* A tap on the dimmed screen closes it; Done is the one stop in the Tab order. */}
      <button
        type="button"
        aria-label="Close settings"
        tabIndex={-1}
        onClick={onClose}
        className="sheet-backdrop absolute inset-0 bg-black/60"
      />

      <div className="sheet-panel relative mx-auto max-h-[85%] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-3xl bg-surface pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-[0_-20px_60px_rgba(0,0,0,0.6)]">
        <div className="sticky top-0 z-10 bg-surface px-6 pt-2.5 pb-3">
          <div aria-hidden="true" data-testid="sheet-handle" className="mx-auto mb-3 h-1 w-9 rounded-full bg-ink-faint/50" />
          <div className="flex items-center justify-between">
            <h2 id={titleId} className="font-display text-headline font-black">
              Settings
            </h2>
            <button
              ref={doneRef}
              type="button"
              onClick={onClose}
              className="press flex min-h-11 items-center rounded-full bg-surface-2 px-5 text-meta font-bold text-ink"
            >
              Done
            </button>
          </div>
        </div>

        <section className="px-6 pt-2">
          <h3 id={toneHeadId} className="label">
            Guitar tone
          </h3>
          <p className="mt-1 text-meta text-ink-dim">
            Changes how every riff, chord, and quiz note sounds. Tap to hear it.
          </p>

          <div
            role="radiogroup"
            aria-labelledby={toneHeadId}
            onKeyDown={handleToneKey}
            className="mt-4 flex flex-col gap-3"
          >
            {TONE_PROFILES.map((profile) => {
              const isActive = profile.id === activeToneId;
              return (
                <button
                  key={profile.id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  tabIndex={profile.id === tabStopId ? 0 : -1}
                  data-testid={`tone-${profile.id}`}
                  onClick={() => handlePick(profile.id)}
                  className={`press press-soft flex items-center gap-4 rounded-2xl px-4 py-4 text-left ${
                    isActive ? 'bg-surface-3 ring-2 ring-accent' : 'bg-surface-2 ring-2 ring-transparent'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-extrabold">{profile.name}</span>
                    <span className="block text-meta leading-snug text-ink-dim">{profile.blurb}</span>
                  </span>
                  {/* The mark of the chosen one is a check; the others are an empty ring, so the group reads as a choice. */}
                  <span
                    aria-hidden="true"
                    data-testid={isActive ? 'tone-check' : undefined}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      isActive ? 'bg-accent text-ground' : 'ring-2 ring-ink-faint/60 ring-inset'
                    }`}
                  >
                    {isActive && <CheckIcon size={16} strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="px-6 pt-8">
          <h3 className="label">Sound</h3>
          <p className="mt-2 text-meta text-ink-dim">
            Engine: <span className="font-bold text-ink">{engine.backend}</span>. Sampled plays
            recorded guitar notes; synth is the fallback when samples are unavailable. Both play
            exact pitches, so quizzes are always in tune.
          </p>
        </section>

        <section className="px-6 pt-8" data-testid="about-section">
          <h3 className="label">About</h3>
          <p className="mt-2 text-meta text-ink-dim">
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
          <p className="mt-4 text-label leading-relaxed text-ink-faint" data-testid="sample-credit">
            Guitar samples: tonejs-instruments by Nicholaus Brosowsky, CC BY 3.0 — recorded by
            University of Iowa EMS, quartertone and Karoryfer.
          </p>

          {/* The same duty for song editions under CC BY: each song that needs a
              credit carries the line (see `credit` in content/songs.ts). */}
          {EDITION_CREDITS.length > 0 && (
            <p className="mt-2 text-label leading-relaxed text-ink-faint" data-testid="edition-credit">
              {EDITION_CREDITS.join(' ')}
            </p>
          )}
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
      className="press press-soft flex min-h-12 items-center justify-between rounded-2xl bg-surface-2 px-4 py-3 text-body font-bold text-ink"
    >
      {children}
      <ExternalLinkIcon size={20} className="text-ink-dim" />
    </a>
  );
}

export default SettingsSheet;
