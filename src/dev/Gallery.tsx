import { useMemo, useState, type ReactNode } from 'react';
import { TabBar } from '@/app/TabBar';
import { useAudioEngine } from '@/app/useAudioEngine';
import { getToneProfile, type AudioEngine } from '@/audio';
import { ILLUSTRATIONS } from '@/content';
import { illustrationFor } from '@/learn/illustrations';
import { LessonView } from '@/learn/LessonView';
import { CheckStep } from '@/learn/steps/CheckStep';
import { ExplainStep } from '@/learn/steps/ExplainStep';
import { NoteChip, RichText } from '@/learn/steps/RichText';
import { VisualCard } from '@/learn/steps/VisualView';
import type { GalleryMode } from './galleryGuard';
import { DEMO_LESSON, SAMPLE_CHECKS, SAMPLES } from './samples';

const SOLFEGE: Record<string, string> = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };

/** An engine that makes no sound and writes what it was asked to play to `log`. */
function silentEngine(log: (line: string) => void): AudioEngine {
  return {
    backend: 'synth',
    unlocked: true,
    tone: getToneProfile('clean'),
    setTone: () => {},
    init: () => Promise.resolve(),
    unlock: () => Promise.resolve(),
    playNote: (midi, opts) =>
      log(`playNote ${midi}${opts?.stringIndex === undefined ? '' : ` on string index ${opts.stringIndex}`}`),
    strum: (midis) => log(`strum ${midis.join(' ')}`),
    stopAll: () => {},
    dispose: () => {},
  };
}

function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section id={id} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 border-t border-white/10 pt-6">
        <h2 className="text-[13px] font-extrabold tracking-widest text-accent uppercase">{title}</h2>
        {note !== undefined && <p className="text-sm leading-snug text-ink-dim">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function RichSamples() {
  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-surface p-4">
      <p className="text-[18px] leading-[1.5] font-medium">
        <RichText>{'Press **just behind** the fret and ==pick one string== at a time.'}</RichText>
      </p>
      <p className="text-[18px] leading-[1.5] font-medium">
        <RichText>
          {'The seven notes: C (Do), D (Re), E (Mi), F (Fa), G (Sol), A (La), B (Si), and F# (Fa#) in between.'}
        </RichText>
      </p>
      <p className="text-[18px] leading-[1.5] font-medium">
        <RichText>
          {'A ==highlight that is long enough to wrap onto a second line== looks right too, and so does Am (La minor).'}
        </RichText>
      </p>
      <h3 className="text-[28px] leading-[1.12] font-black tracking-tight">
        <RichText>{'Play Em (Mi minor) with ==two fingers=='}</RichText>
      </h3>
      <div className="flex flex-wrap gap-2 text-[17px]" aria-label="Every note chip">
        {Object.entries(SOLFEGE).map(([letter, solfege]) => (
          <NoteChip key={letter} name={letter} solfege={solfege} />
        ))}
      </div>
    </div>
  );
}

function IllustrationList({ engine }: { engine: AudioEngine }) {
  return (
    <div className="flex flex-col gap-6">
      {ILLUSTRATIONS.map((item) => {
        const drawn = illustrationFor(item.name) !== undefined;
        return (
          <div key={item.name} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-mono text-sm font-bold">{item.name}</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase ${
                  drawn ? 'bg-good/15 text-good' : 'bg-bad/15 text-bad'
                }`}
              >
                {drawn ? `drawn · group ${item.group}` : 'not drawn'}
              </span>
            </div>
            <VisualCard visual={{ kind: 'illustration', name: item.name }} engine={engine} />
            <details className="text-xs leading-relaxed text-ink-dim">
              <summary className="cursor-pointer">What it should show</summary>
              <p className="mt-1">{item.spec}</p>
            </details>
          </div>
        );
      })}
    </div>
  );
}

/**
 * The dev-only visual-review page (`?gallery`), at phone width: type, every
 * illustration, sample explain cards of each visual kind and a check step.
 * `?gallery=lesson` shows the same cards as a lesson in the real shell.
 */
export function Gallery({ mode }: { mode: GalleryMode }) {
  const [played, setPlayed] = useState('nothing yet');
  const audio = useAudioEngine();
  const silent = useMemo(() => silentEngine(setPlayed), []);
  // Real sound once "Enable sound" has been tapped; until then taps are only logged.
  const engine = audio.engine ?? silent;

  if (mode === 'lesson') {
    // The app's own frame: the lesson pane above the real tab bar, so the room a
    // card has here is the room it has on a phone.
    return (
      <div className="mx-auto flex h-dvh max-w-[430px] flex-col bg-ground" data-testid="gallery-lesson">
        <main className="min-h-0 flex-1 overflow-hidden">
          <LessonView
            lesson={DEMO_LESSON}
            engine={engine}
            initialStep={Number(new URLSearchParams(window.location.search).get('step') ?? 0) || 0}
            onClose={() => {}}
            onComplete={() => {}}
          />
        </main>
        <TabBar active="learn" onChange={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-ground pb-24" data-testid="gallery">
      <div className="mx-auto flex w-full max-w-[390px] flex-col gap-8 px-5 py-6">
        <header className="flex flex-col gap-2">
          <p className="text-[11px] font-extrabold tracking-widest text-accent uppercase">DEV gallery</p>
          <h1 className="text-3xl font-black">Lesson visuals</h1>
          <p className="text-sm leading-snug text-ink-dim">
            Phone width. {ILLUSTRATIONS.length} illustrations and sample cards of every kind. Taps are logged at
            the bottom; Enable sound to hear them.
          </p>
          {audio.engine === null && (
            <button
              type="button"
              onClick={() => void audio.start()}
              className="self-start rounded-full bg-surface-2 px-4 py-2 text-sm font-bold"
            >
              {audio.loading ? 'Loading sound…' : 'Enable sound'}
            </button>
          )}
        </header>

        <Section id="rich" title="Rich text" note="strong, highlight, note chips, wrapping">
          <RichSamples />
        </Section>

        <Section id="cards" title="Explain cards" note="Each as it appears in a lesson.">
          {SAMPLES.map(({ label, step }) => (
            <div key={label} className="flex flex-col gap-3">
              <h3 className="text-xs font-bold tracking-wider text-ink-dim uppercase">{label}</h3>
              <ExplainStep step={step} engine={engine} />
            </div>
          ))}
        </Section>

        <Section id="checks" title="Check step">
          {SAMPLE_CHECKS.map((step, index) =>
            step.kind === 'check' ? <CheckStep key={index} step={step} onDone={() => {}} /> : null,
          )}
        </Section>

        <Section id="illustrations" title={`Illustrations (${ILLUSTRATIONS.length})`}>
          <IllustrationList engine={engine} />
        </Section>
      </div>

      <div
        aria-live="polite"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-surface/95 px-5 py-2 text-center font-mono text-xs text-ink-dim backdrop-blur"
      >
        ♪ {audio.engine === null ? played : 'real sound on'}
      </div>
    </div>
  );
}

export default Gallery;
