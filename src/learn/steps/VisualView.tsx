import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { NoteIcon } from '@/ui/icons';
import { tapHaptic } from '@/app/haptics';
import { strumFx } from '@/ui/motion';
import type { AudioEngine } from '@/audio';
import { CHORDS, type NeckDot, type Visual } from '@/content';
import {
  chordSolfegeName,
  chordStrings,
  chordToneNames,
  chordVoicing,
  fretToMidi,
  noteLabel,
  noteName,
  spellingSolfege,
  STANDARD_TUNING,
  stringNumber,
  withSolfege,
  type FretPosition,
} from '@/music';
import { chordShapeToFretboard, createFretboardGeometry, Fretboard, type FretMarker } from '@/render';
import { noteColor } from '@/render/noteColors';
import { illustrationFor } from '../illustrations';
import { Neck } from './Neck';
import { RichText } from './RichText';
import { neckDotText, noteLetter, notesToMidi } from './visualAudio';

/** How long the "just played" highlight holds after a tap. */
const FLASH_MS = 700;

/** Runs a timer for a flash and cleans it up with the component. */
function useFlash<T>(): [T | null, (value: T) => void] {
  const [flash, setFlash] = useState<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );
  function show(value: T) {
    setFlash(value);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash(null), FLASH_MS);
  }
  return [flash, show];
}

const SHORT_SCREEN = '(max-height: 860px)';

/** True on a phone-height screen, where the pictures give up a little height (see `short:` in index.css). */
function useShortScreen(): boolean {
  const query = () => (typeof window.matchMedia === 'function' ? window.matchMedia(SHORT_SCREEN) : null);
  const [short, setShort] = useState(() => query()?.matches ?? false);
  useEffect(() => {
    const list = query();
    if (list === null) return;
    const update = () => setShort(list.matches);
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, []);
  return short;
}

/** Stands in for an illustration that has not been drawn yet. */
export function MissingIllustration({ name }: { name: string }) {
  return (
    <div
      role="img"
      aria-label={`Illustration "${name}" is not drawn yet`}
      data-testid="illustration-missing"
      className="flex min-h-[200px] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-white/10 px-4 py-8 text-center"
    >
      <span aria-hidden="true" className="text-3xl opacity-60">
        🎨
      </span>
      <span className="font-mono text-sm font-bold text-ink">{name}</span>
      <span className="text-xs tracking-wider text-ink-dim uppercase">illustration coming</span>
    </div>
  );
}

function IllustrationView({ name }: { name: Extract<Visual, { kind: 'illustration' }>['name'] }) {
  const Drawing = illustrationFor(name);
  if (Drawing === undefined) return <MissingIllustration name={name} />;
  return (
    <div
      data-testid="visual-illustration"
      data-illustration={name}
      // The drawings cap themselves at 260 high; on a phone that crowds out the
      // words below, so the card holds them a little shorter. They letterbox.
      className="[&_svg]:mx-auto [&_svg]:max-h-[228px]! short:[&_svg]:max-h-[min(200px,22vh)]!"
    >
      <Drawing />
    </div>
  );
}

function describeDots(dots: readonly NeckDot[]): string {
  const shown = dots.slice(0, 8).map((dot) => {
    const note = noteLabel(fretToMidi(STANDARD_TUNING, dot.stringIndex, dot.fret));
    const fret = dot.fret === 0 ? 'open' : `fret ${dot.fret}`;
    return `${note} on string ${stringNumber(dot.stringIndex)}, ${fret}`;
  });
  return shown.join('; ');
}

function NeckView({
  visual,
  engine,
}: {
  visual: Extract<Visual, { kind: 'neck' }>;
  engine: AudioEngine;
}) {
  const [heard, setHeard] = useState<FretPosition | null>(null);
  const interactive = visual.tapToHear === true;
  const short = useShortScreen();

  const markers = useMemo<FretMarker[]>(
    () =>
      visual.dots.map((dot) => ({
        stringIndex: dot.stringIndex,
        fret: dot.fret,
        label: neckDotText(dot),
        tone: 'root' as const,
        color: noteColor(noteName(fretToMidi(STANDARD_TUNING, dot.stringIndex, dot.fret))),
      })),
    [visual.dots],
  );

  function handleTap(position: FretPosition) {
    tapHaptic();
    engine.playNote(fretToMidi(STANDARD_TUNING, position.stringIndex, position.fret), {
      stringIndex: position.stringIndex,
    });
    setHeard(position);
  }

  return (
    <div className="flex flex-col gap-2" data-testid="visual-neck">
      <Neck
        fretRange={visual.fretRange}
        markers={markers}
        labelMode="custom"
        highlightStrings={visual.highlightStrings}
        onFretTap={interactive ? handleTap : undefined}
        maxHeight={interactive ? (short ? 178 : 196) : short ? 184 : 200}
        // Tappable boards have wide cells, so their dots would sit on the fret numbers below the low string.
        markerScale={interactive ? 0.78 : 1.2}
        // The card holds up to about eight frets scaled down; a longer board scrolls.
        fitLimit={500}
        bleed={false}
        ariaLabel={`Guitar neck, frets ${visual.fretRange[0]} to ${visual.fretRange[1]}. ${describeDots(visual.dots)}`}
      />
      {interactive && (
        <p
          className="flex min-h-6 items-center justify-center gap-1.5 text-[13px] font-semibold text-ink-dim"
          aria-live="polite"
          data-testid="neck-heard"
        >
          {heard === null ? (
            <>
              <NoteIcon size={16} className="text-accent" />
              Tap the neck to hear it
            </>
          ) : (
            <>
              <span className="text-[15px]">
                <RichText>{noteLabel(fretToMidi(STANDARD_TUNING, heard.stringIndex, heard.fret))}</RichText>
              </span>
              <span>
                string {stringNumber(heard.stringIndex)}, {heard.fret === 0 ? 'open' : `fret ${heard.fret}`}
              </span>
            </>
          )}
        </p>
      )}
    </div>
  );
}

function ChordsView({
  chordIds,
  engine,
}: {
  chordIds: readonly string[];
  engine: AudioEngine;
}) {
  const [strummed, flash] = useFlash<string>();
  const chords = chordIds.flatMap((id) => {
    const chord = CHORDS.find((candidate) => candidate.id === id);
    return chord === undefined ? [] : [chord];
  });

  return (
    <div className="flex flex-col gap-2" data-testid="visual-chords">
      <div className="flex justify-center gap-2.5 overflow-x-auto">
        {chords.map((chord) => {
          const diagram = chordShapeToFretboard(chord);
          const geometry = createFretboardGeometry({ orientation: 'vertical', fretRange: diagram.fretRange });
          const coloured = diagram.markers.map<FretMarker>((marker) => ({
            ...marker,
            color: noteColor(noteName(fretToMidi(STANDARD_TUNING, marker.stringIndex, marker.fret))),
          }));
          const playing = strummed === chord.id;
          const tones = chordToneNames(chord, STANDARD_TUNING);
          return (
            <button
              key={chord.id}
              type="button"
              data-testid={`chord-tile-${chord.id}`}
              data-playing={playing ? 'true' : undefined}
              aria-label={`${chord.name}, ${chordSolfegeName(chord)}. Notes: ${tones.map(withSolfege).join(', ')}. Tap to strum it.`}
              onClick={(event) => {
                tapHaptic();
                engine.strum(chordVoicing(chord, STANDARD_TUNING), { strings: chordStrings(chord) });
                strumFx(event.currentTarget, { x: event.clientX, y: event.clientY });
                flash(chord.id);
              }}
              className={`press press-tile fx-host flex min-w-[6.25rem] max-w-[10.5rem] flex-1 flex-col items-center gap-0.5 rounded-2xl px-2 pt-2.5 pb-2.5 ${
                playing ? 'scale-[1.02] bg-accent/12 ring-2 ring-accent/70' : 'bg-white/[0.035] ring-2 ring-transparent'
              }`}
            >
              <span
                aria-hidden="true"
                className="text-[30px] leading-none font-black"
                style={{ color: noteColor(chord.name) }}
              >
                {chord.name}
              </span>
              <span aria-hidden="true" className="text-[11px] font-bold tracking-wider text-ink-dim uppercase">
                {chordSolfegeName(chord)}
              </span>
              <span
                aria-hidden="true"
                className="mt-1.5 block w-full max-w-[7.5rem] short:max-w-[6.5rem]"
                style={{ aspectRatio: `${geometry.width} / ${geometry.height}` }}
              >
                <Fretboard
                  orientation="vertical"
                  fretRange={diagram.fretRange}
                  markers={coloured}
                  mutedStrings={diagram.mutedStrings}
                  openStrings={diagram.openStrings}
                  barre={diagram.barre}
                  labelMode="custom"
                  showFretNumbers={diagram.fretRange[0] > 0}
                  fit
                  className="h-full w-full"
                  ariaLabel={`${chord.name} chord diagram`}
                />
              </span>
              <span aria-hidden="true" className="mt-1.5 flex justify-center gap-1">
                {tones.map((tone) => (
                  <span
                    key={tone}
                    className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1 text-[11px] leading-none font-black text-ground"
                    style={{ background: noteColor(tone) }}
                  >
                    {tone}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <TapHint>{strummed === null ? 'Tap a chord to strum it' : 'Strumming…'}</TapHint>
    </div>
  );
}

/** The small line under an interactive picture that says it can be tapped. */
function TapHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex min-h-5 items-center justify-center gap-1.5 text-[13px] font-semibold text-ink-dim" aria-hidden="true">
      <NoteIcon size={16} className="text-accent" /> {children}
    </p>
  );
}

function NotesView({ notes, engine }: { notes: readonly string[]; engine: AudioEngine }) {
  const [playing, flash] = useFlash<number>();
  const midis = useMemo(() => notesToMidi(notes), [notes]);
  // Seven fit in one row of a phone; longer lists (a chromatic run) become even rows.
  const columns = notes.length <= 7 ? notes.length : Math.ceil(notes.length / Math.ceil(notes.length / 7));

  return (
    <div className="flex flex-col gap-3" data-testid="visual-notes">
      <div
        className="mx-auto grid w-full max-w-[27rem] gap-x-2 gap-y-4 pt-1"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {notes.map((note, index) => {
          const letter = noteLetter(note);
          const solfege = spellingSolfege(note);
          const color = noteColor(letter);
          const midi = midis[index];
          const active = playing === index;
          return (
            <button
              key={`${note}-${index}`}
              type="button"
              data-testid={`note-bubble-${index}`}
              data-note={letter}
              data-playing={active ? 'true' : undefined}
              aria-label={`${letter} (${solfege}). Tap to hear it.`}
              onClick={() => {
                if (midi === undefined) return;
                tapHaptic();
                engine.playNote(midi);
                flash(index);
              }}
              className="press press-tile flex min-w-0 flex-col items-center gap-1.5"
              style={{ transition: 'transform 120ms' }}
            >
              <span
                aria-hidden="true"
                className={`flex aspect-square w-full max-w-[4.5rem] items-center justify-center rounded-full font-black text-ground ${
                  active ? 'note-ping' : ''
                }`}
                style={
                  {
                    background: `radial-gradient(circle at 32% 26%, ${color}, ${color} 55%, ${color}e0)`,
                    boxShadow: `inset 0 -4px 0 rgba(0,0,0,0.2), 0 8px 18px -8px ${color}`,
                    containerType: 'inline-size',
                    '--ping': `${color}aa`,
                  } as CSSProperties
                }
              >
                <span style={{ fontSize: letter.length > 1 ? '30cqw' : '42cqw', lineHeight: 1 }}>{letter}</span>
              </span>
              <span aria-hidden="true" className="text-[13px] leading-none font-extrabold" style={{ color }}>
                {solfege}
              </span>
            </button>
          );
        })}
      </div>
      <TapHint>Tap a note to hear it</TapHint>
    </div>
  );
}

/**
 * The picture at the top of an explain card, whichever kind the lesson asked
 * for. Everything it shows is drawn from the theory core (the note under a
 * dot, the tones of a chord) rather than typed into the lesson.
 */
export function VisualView({ visual, engine }: { visual: Visual; engine: AudioEngine }) {
  switch (visual.kind) {
    case 'illustration':
      return <IllustrationView name={visual.name} />;
    case 'neck':
      return <NeckView visual={visual} engine={engine} />;
    case 'chords':
      return <ChordsView chordIds={visual.chordIds} engine={engine} />;
    case 'notes':
      return <NotesView notes={visual.notes} engine={engine} />;
  }
}

/** The rounded, softly glowing card a visual sits in, which pops in when the step opens. */
export function VisualCard({ visual, engine }: { visual: Visual; engine: AudioEngine }) {
  const tight = visual.kind === 'illustration';
  return (
    <div
      data-testid="explain-visual"
      data-visual={visual.kind}
      className={`explain-pop rounded-3xl ${tight ? 'p-2.5 short:p-2' : 'px-3 py-3.5 short:py-3'}`}
      style={{
        background:
          'radial-gradient(120% 90% at 50% 0%, rgba(255,176,32,0.10), rgba(255,176,32,0) 62%), var(--color-surface)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 16px 44px -18px rgba(255,176,32,0.30)',
      }}
    >
      <VisualView visual={visual} engine={engine} />
    </div>
  );
}
