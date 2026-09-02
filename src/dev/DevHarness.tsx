import { useEffect, useMemo, useRef, useState } from 'react';
import { GuitarAudioEngine, createRiffPlayer, type RiffPlayer } from '@/audio';
import { RIFFS } from '@/content';
import {
  STANDARD_TUNING,
  chordVoicing,
  fretToMidi,
  noteName,
  type ChordShape,
  type FretPosition,
} from '@/music';
import { Fretboard, TabStaff, chordShapeToFretboard, createTabGeometry } from '@/render';

const AM_OPEN: ChordShape = {
  id: 'Am-open',
  name: 'Am',
  root: 9,
  quality: 'min',
  baseFret: 1,
  frets: [null, 0, 2, 2, 1, 0],
  fingers: [null, null, 2, 3, 1, null],
  difficulty: 1,
};

export function DevHarness() {
  const engineRef = useRef<GuitarAudioEngine | null>(null);
  const playerRef = useRef<RiffPlayer | null>(null);
  const playheadRef = useRef<SVGGElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [ready, setReady] = useState(false);
  const [backend, setBackend] = useState('uninitialized');
  const [lastTapped, setLastTapped] = useState('nothing yet');
  const [riffIndex, setRiffIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);

  const riff = RIFFS[riffIndex];
  const geometry = useMemo(
    () =>
      riff === undefined
        ? null
        : createTabGeometry({ bars: riff.bars, timeSignature: riff.timeSignature }),
    [riff],
  );
  const chord = useMemo(() => chordShapeToFretboard(AM_OPEN), []);

  // Audio must be unlocked from inside a real gesture, so this lives on a tap.
  async function handleStart() {
    const engine = new GuitarAudioEngine();
    await engine.unlock();
    await engine.init();
    engineRef.current = engine;
    setBackend(engine.backend);
    setReady(true);
  }

  function handleFretTap(position: FretPosition) {
    const midi = fretToMidi(STANDARD_TUNING, position.stringIndex, position.fret);
    engineRef.current?.playNote(midi, { stringIndex: position.stringIndex });
    setLastTapped(noteName(midi, { withOctave: true }));
  }

  function handleStrum() {
    engineRef.current?.strum(chordVoicing(AM_OPEN, STANDARD_TUNING));
  }

  function handlePlay() {
    const engine = engineRef.current;
    if (engine === null || riff === undefined) return;
    playerRef.current?.dispose();
    const player = createRiffPlayer(riff, engine, { speed });
    playerRef.current = player;
    player.start();
    setPlaying(true);
  }

  function handleStop() {
    playerRef.current?.stop();
    setPlaying(false);
  }

  useEffect(() => {
    playerRef.current?.setSpeed(speed);
  }, [speed]);

  // The playhead is moved by transform from rAF. Routing 60fps through React
  // state would re-render the whole staff every frame.
  useEffect(() => {
    if (geometry === null) return;
    let frame = 0;
    const tick = () => {
      const player = playerRef.current;
      const head = playheadRef.current;
      if (player !== null && head !== null) {
        const x = player.progress() * geometry.totalBeats * geometry.beatWidth;
        head.style.transform = `translateX(${x}px)`;
        const scroller = scrollRef.current;
        if (scroller !== null) {
          scroller.scrollLeft = Math.max(0, geometry.xForBeat(0) + x - scroller.clientWidth * 0.35);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [geometry]);

  useEffect(() => () => playerRef.current?.dispose(), []);

  if (!ready) {
    return (
      <main className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-3xl font-bold tracking-tight">guitarRot</h1>
        <p className="max-w-xs text-center text-sm text-[var(--color-ink-dim)]">
          Phones keep audio suspended until you touch the screen.
        </p>
        <button
          type="button"
          onClick={() => void handleStart()}
          className="rounded-full bg-[var(--color-accent)] px-8 py-4 text-lg font-bold text-[var(--color-ground)]"
        >
          Tap to start
        </button>
      </main>
    );
  }

  return (
    <main className="flex h-full flex-col gap-8 overflow-y-auto p-5">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold tracking-tight">Foundation harness</h1>
        <span className="text-xs text-[var(--color-ink-dim)]">audio: {backend}</span>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-ink-dim)]">
          Fretboard — tap to hear
        </h2>
        <div className="overflow-x-auto">
          <Fretboard
            orientation="horizontal"
            fretRange={[0, 5]}
            markers={[]}
            labelMode="note"
            onFretTap={handleFretTap}
          />
        </div>
        <p className="text-sm">Last note: <strong>{lastTapped}</strong></p>
      </section>

      <section className="flex flex-col items-start gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-ink-dim)]">
          Chord diagram
        </h2>
        <Fretboard
          orientation="vertical"
          fretRange={chord.fretRange}
          markers={chord.markers}
          mutedStrings={chord.mutedStrings}
          openStrings={chord.openStrings}
          barre={chord.barre}
          labelMode="custom"
        />
        <button
          type="button"
          onClick={handleStrum}
          className="rounded-full bg-[var(--color-surface-2)] px-5 py-2 text-sm font-semibold"
        >
          Strum Am
        </button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-ink-dim)]">
          Riff loop
        </h2>

        <select
          value={riffIndex}
          onChange={(event) => {
            handleStop();
            setRiffIndex(Number(event.target.value));
          }}
          className="rounded-lg bg-[var(--color-surface)] px-3 py-2 text-sm"
        >
          {RIFFS.map((option, i) => (
            <option key={option.id} value={i}>
              {option.title}
            </option>
          ))}
        </select>

        {riff !== undefined && geometry !== null && (
          <div ref={scrollRef} className="overflow-x-auto">
            <TabStaff riff={riff} geometry={geometry} showPlayhead playheadRef={playheadRef} />
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={playing ? handleStop : handlePlay}
            className="rounded-full bg-[var(--color-accent)] px-6 py-2 font-bold text-[var(--color-ground)]"
          >
            {playing ? 'Stop' : 'Play'}
          </button>
          <label className="flex flex-1 items-center gap-2 text-sm">
            <span className="tabular-nums text-[var(--color-ink-dim)]">
              {Math.round(speed * 100)}%
            </span>
            <input
              type="range"
              min={0.5}
              max={1}
              step={0.05}
              value={speed}
              onChange={(event) => setSpeed(Number(event.target.value))}
              className="flex-1"
            />
          </label>
        </div>
      </section>
    </main>
  );
}

export default DevHarness;
