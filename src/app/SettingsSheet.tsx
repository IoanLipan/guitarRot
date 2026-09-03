import { useEffect } from 'react';
import { getToneProfile, TONE_PROFILES, type AudioEngine } from '@/audio';
import { getChord } from '@/content';
import { chordVoicing, STANDARD_TUNING } from '@/music';
import type { ProgressHandle } from './useProgress';

/** Strummed when you audition a tone — an open E, the first chord everyone learns. */
const PREVIEW_CHORD_ID = 'E-open';

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
    if (chord !== undefined) engine.strum(chordVoicing(chord, STANDARD_TUNING));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" data-testid="settings-sheet">
      <button
        type="button"
        aria-label="Close settings"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />

      <div className="relative max-h-[85%] overflow-y-auto rounded-t-3xl bg-surface pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-[0_-20px_60px_rgba(0,0,0,0.6)]">
        <div className="sticky top-0 flex items-center justify-between bg-surface px-6 pt-5 pb-3">
          <h2 className="text-2xl font-black">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-surface-2 px-4 py-2 text-sm font-bold text-ink-dim active:scale-95"
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
                  className={`flex items-center gap-4 rounded-2xl px-4 py-4 text-left transition-all active:scale-[0.99] ${
                    isActive ? 'bg-accent/12 ring-2 ring-accent' : 'bg-surface-2 ring-2 ring-transparent'
                  }`}
                >
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-black"
                    style={{
                      background: isActive ? 'var(--color-accent)' : 'var(--color-surface)',
                      color: isActive ? 'var(--color-ground)' : 'var(--color-ink-dim)',
                    }}
                  >
                    ♪
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
          {/* CC BY requires the attribution to travel with the work, so it
              lives in the app and not only in the repository. */}
          <p className="mt-3 text-xs leading-relaxed text-ink-dim/80" data-testid="sample-credit">
            Guitar samples: FluidR3_GM by Frank Wen, CC BY 3.0.
          </p>
        </section>
      </div>
    </div>
  );
}

export default SettingsSheet;
