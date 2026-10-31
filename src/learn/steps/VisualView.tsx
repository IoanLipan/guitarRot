import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { NoteIcon } from '@/ui/icons';
import { tapHaptic } from '@/app/haptics';
import { strumFx } from '@/ui/motion';
import type { AudioEngine } from '@/audio';
import { getChord, type NeckDot, type Visual } from '@/content';
import { useInstrument } from '@/instrument';
import {
  chordSolfegeName,
  chordStrings,
  chordToneNames,
  chordVoicing,
  fretToMidi,
  instrumentOf,
  noteLabel,
  noteName,
  spellingSolfege,
  stringNumber,
  withSolfege,
  type FretPosition,
  type Instrument,
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
      className="flex min-h-[200px] flex-col items-center justify-center gap-1 rounded-2xl bg-surface-2 px-4 py-8 text-center"
    >
      <span className="text-body font-bold text-ink">{name}</span>
      <span className="label">Illustration coming soon</span>
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
      // A drawing is as wide as the card, which is what keeps its labels readable. Only on the
      // short phones (under `tight:`) does the card hold it a little shorter, so the words below
      // still show; it then letterboxes, and the drawings carry labels big enough to survive that.
      className="[&_svg]:mx-auto tight:[&_svg]:max-h-[min(256px,33vh)]!"
    >
      <Drawing />
    </div>
  );
}

function describeDots(dots: readonly NeckDot[], instrument: Instrument): string {
  const shown = dots.slice(0, 8).map((dot) => {
    const note = noteLabel(fretToMidi(instrument.tuning, dot.stringIndex, dot.fret));
    const fret = dot.fret === 0 ? 'open' : `fret ${dot.fret}`;
    return `${note} on string ${stringNumber(dot.stringIndex, instrument)}, ${fret}`;
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
  const instrument = useInstrument();
  const [heard, setHeard] = useState<FretPosition | null>(null);
  const interactive = visual.tapToHear === true;
  const short = useShortScreen();

  const markers = useMemo<FretMarker[]>(
    () =>
      visual.dots.map((dot) => ({
        stringIndex: dot.stringIndex,
        fret: dot.fret,
        label: neckDotText(dot, instrument),
        tone: 'root' as const,
        color: noteColor(noteName(fretToMidi(instrument.tuning, dot.stringIndex, dot.fret))),
      })),
    [visual.dots, instrument],
  );

  function handleTap(position: FretPosition) {
    tapHaptic();
    engine.playNote(fretToMidi(instrument.tuning, position.stringIndex, position.fret), {
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
        ariaLabel={`${instrument.name} neck, frets ${visual.fretRange[0]} to ${visual.fretRange[1]}. ${describeDots(visual.dots, instrument)}`}
      />
      {interactive && (
        <p
          className="label flex min-h-6 items-center justify-center gap-1.5"
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
              <span className="text-body">
                <RichText>{noteLabel(fretToMidi(instrument.tuning, heard.stringIndex, heard.fret))}</RichText>
              </span>
              <span>
                string {stringNumber(heard.stringIndex, instrument)}, {heard.fret === 0 ? 'open' : `fret ${heard.fret}`}
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
    const chord = getChord(id);
    return chord === undefined ? [] : [chord];
  });

  return (
    <div className="flex flex-col gap-2" data-testid="visual-chords">
      <div className="flex justify-center gap-2.5 overflow-x-auto narrow:gap-1.5">
        {chords.map((chord) => {
          const chordInstrument = instrumentOf(chord);
          const diagram = chordShapeToFretboard(chord);
          const geometry = createFretboardGeometry({
            orientation: 'vertical',
            fretRange: diagram.fretRange,
            stringCount: chordInstrument.tuning.length,
          });
          const coloured = diagram.markers.map<FretMarker>((marker) => ({
            ...marker,
            color: noteColor(noteName(fretToMidi(chordInstrument.tuning, marker.stringIndex, marker.fret))),
          }));
          const playing = strummed === chord.id;
          const tones = chordToneNames(chord, chordInstrument.tuning);
          return (
            <button
              key={chord.id}
              type="button"
              data-testid={`chord-tile-${chord.id}`}
              data-playing={playing ? 'true' : undefined}
              aria-label={`${chord.name}, ${chordSolfegeName(chord)}. Notes: ${tones.map(withSolfege).join(', ')}. Tap to strum it.`}
              onClick={(event) => {
                tapHaptic();
                engine.strum(chordVoicing(chord, chordInstrument.tuning), { strings: chordStrings(chord) });
                strumFx(event.currentTarget, { x: event.clientX, y: event.clientY });
                flash(chord.id);
              }}
              // min-w-20, not wider: three tiles have to fit a 320px phone (about 270px of card) without sliding sideways.
              className={`press press-tile fx-host flex min-w-20 max-w-[10.5rem] flex-1 flex-col items-center gap-0.5 rounded-2xl px-2 pt-2.5 pb-2.5 narrow:px-1 ${
                playing ? 'scale-[1.02] bg-accent/12 ring-2 ring-accent/70' : 'bg-surface-2 ring-2 ring-transparent'
              }`}
            >
              <span
                aria-hidden="true"
                className="text-[30px] leading-none font-black"
                style={{ color: noteColor(chord.name) }}
              >
                {chord.name}
              </span>
              <span aria-hidden="true" className="text-center text-label leading-tight font-semibold text-ink-dim">
                {chordSolfegeName(chord)}
              </span>
              <span
                aria-hidden="true"
                className="mt-1.5 block w-full max-w-[7.5rem] short:max-w-[6.5rem]"
                style={{ aspectRatio: `${geometry.width} / ${geometry.height}` }}
              >
                <Fretboard
                  instrument={chordInstrument}
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
              <span aria-hidden="true" className="mt-1.5 flex flex-wrap justify-center gap-1">
                {tones.map((tone) => (
                  <span
                    key={tone}
                    className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1 text-label leading-none font-black text-ground"
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
    <p className="label flex min-h-5 items-center justify-center gap-1.5" aria-hidden="true">
      <NoteIcon size={16} className="text-accent" /> {children}
    </p>
  );
}

function NotesView({ notes, engine }: { notes: readonly string[]; engine: AudioEngine }) {
  const instrument = useInstrument();
  const [playing, flash] = useFlash<number>();
  const midis = useMemo(() => notesToMidi(notes, instrument), [notes, instrument]);
  // Seven fit in one row of a phone; longer lists (a chromatic run) become even rows.
  const columns = notes.length <= 7 ? notes.length : Math.ceil(notes.length / Math.ceil(notes.length / 7));

  return (
    <div className="flex flex-col gap-3" data-testid="visual-notes">
      <div
        className="mx-auto grid w-full max-w-[27rem] gap-x-0 gap-y-4 pt-1"
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
              // The columns touch and the button pads itself in 4px a side: the bubbles keep their
              // 8px of air but the tap target is the whole column (seven notes on a 360px phone are about 44px each).
              className="press press-tile flex min-w-0 flex-col items-center gap-1.5 px-1"
              style={{ transition: 'transform 120ms' }}
            >
              <span
                aria-hidden="true"
                className={`flex aspect-square w-full max-w-[4.5rem] items-center justify-center rounded-full font-black text-ground ${
                  active ? 'note-ping' : ''
                }`}
                style={
                  {
                    background: color,
                    containerType: 'inline-size',
                    '--ping': `${color}aa`,
                  } as CSSProperties
                }
              >
                <span style={{ fontSize: letter.length > 1 ? '30cqw' : '42cqw', lineHeight: 1 }}>{letter}</span>
              </span>
              <span aria-hidden="true" className="text-label leading-none font-extrabold" style={{ color }}>
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

/** The rounded card a visual sits in, which pops in when the step opens. A tone step, not a glow. */
export function VisualCard({ visual, engine }: { visual: Visual; engine: AudioEngine }) {
  const tight = visual.kind === 'illustration';
  return (
    <div
      data-testid="explain-visual"
      data-visual={visual.kind}
      className={`explain-pop rounded-3xl bg-surface ${tight ? 'p-2.5 short:p-2' : 'px-3 py-3.5 short:py-3 narrow:px-2'}`}
    >
      <VisualView visual={visual} engine={engine} />
    </div>
  );
}
