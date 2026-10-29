import { useEffect, useMemo, useRef, useState } from 'react';
import { tapHaptic } from '@/app/haptics';
import {
  createMetronome,
  createRiffPlayer,
  speedToBpm,
  type AudioEngine,
  type Metronome,
  type RiffPlayer,
} from '@/audio';
import { beatsPerBar, type Riff, type SongChart } from '@/content';
import { createTabGeometry, TabStaff, useFollowPlayhead } from '@/render';
import { ChordChart } from '@/songs/ChordChart';
import { MetronomeIcon } from '@/ui/icons';
import { PlayPauseIcon } from '@/ui/PlayPauseIcon';

/**
 * A compact player for the riff or song a lesson step points at: the tab (or,
 * for a chord-chart song, the chart), play/stop, a metronome and a speed knob.
 * Built the way `SongPlayer` is, with the same cleanup rules, because the
 * transport is global: only one player may be alive, so this one is created
 * when the step appears and stopped, then disposed, the moment it goes.
 *
 * It does not start by itself. A lesson step has words to read first ("play
 * this slowly, one finger per fret"), and sound that begins under your eyes
 * as you read them is a nuisance.
 */
export function PlayerPanel({
  riff,
  title,
  chart,
  engine,
}: {
  riff: Riff;
  title: string;
  /** Chord-chart songs show their chart instead of a strum-by-strum tab. */
  chart?: SongChart;
  engine: AudioEngine;
}) {
  const barLength = beatsPerBar(riff.timeSignature);
  const geometry = useMemo(
    () => createTabGeometry({ bars: riff.bars, timeSignature: riff.timeSignature }),
    [riff],
  );

  const playerRef = useRef<RiffPlayer | null>(null);
  const metronomeRef = useRef<Metronome | null>(null);
  const playheadRef = useRef<SVGGElement>(null);
  // Following the playhead gives way to a finger on the staff; see the hook.
  const { scrollerRef: staffScrollRef, follow, scrollToStart } = useFollowPlayhead();
  /** Blocks a second tap of Play from overlapping a count-in already in flight. */
  const startingRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [activeBar, setActiveBar] = useState<number | null>(null);
  const [speed, setSpeed] = useState(1);
  const [metronomeOn, setMetronomeOn] = useState(false);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    const player = createRiffPlayer(riff, engine, { speed: speedRef.current });
    const metronome = createMetronome(barLength);
    playerRef.current = player;
    metronomeRef.current = metronome;

    return () => {
      player.stop();
      metronome.stop();
      player.dispose();
      metronome.dispose();
      playerRef.current = null;
      metronomeRef.current = null;
      startingRef.current = false;
      setPlaying(false);
      setActiveBar(null);
      setMetronomeOn(false);
    };
  }, [riff, engine, barLength]);

  useEffect(() => {
    playerRef.current?.setSpeed(speed);
  }, [speed]);

  // The playhead moves by transform from rAF, never React state: a 60fps
  // setState would re-render the whole staff every frame. Only runs while
  // playing, and puts everything back at the start when it stops.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      const player = playerRef.current;
      if (player !== null) {
        const beat = player.currentBeat();
        setActiveBar((current) => {
          const next = Math.min(riff.bars - 1, Math.max(0, Math.floor(beat / barLength)));
          return next === current ? current : next;
        });

        const head = playheadRef.current;
        if (head !== null) {
          head.dataset.playing = 'true';
          const x = beat * geometry.beatWidth;
          head.style.transform = `translateX(${x}px)`;
          follow(geometry.xForBeat(0) + x);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      setActiveBar(null);
      if (playheadRef.current !== null) {
        playheadRef.current.style.transform = 'translateX(0px)';
        playheadRef.current.dataset.playing = 'false';
      }
      scrollToStart();
    };
  }, [playing, geometry, riff.bars, barLength, follow, scrollToStart]);

  async function handleToggle() {
    if (startingRef.current) return;
    tapHaptic();
    const player = playerRef.current;
    if (player === null) return;

    if (playing) {
      player.stop();
      metronomeRef.current?.stop();
      setPlaying(false);
      return;
    }

    startingRef.current = true;
    if (metronomeOn) {
      await metronomeRef.current?.playCountIn(speedToBpm(riff.bpm, speed), barLength);
    }
    // The step may have been left while the count-in ran.
    if (playerRef.current === player) {
      player.start();
      if (metronomeOn) metronomeRef.current?.start();
      setPlaying(true);
    }
    startingRef.current = false;
  }

  function handleMetronomeToggle() {
    tapHaptic();
    setMetronomeOn((prev) => {
      const next = !prev;
      if (playing) {
        if (next) metronomeRef.current?.start();
        else metronomeRef.current?.stop();
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4" data-testid="player-panel">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 text-lg leading-tight font-extrabold">{title}</h3>
        <span className="shrink-0 text-xs font-bold tracking-wider text-ink-dim uppercase tabular-nums">
          {riff.bpm} BPM · {riff.timeSignature[0]}/{riff.timeSignature[1]}
        </span>
      </div>

      {chart !== undefined ? (
        <ChordChart chart={chart} activeBar={activeBar} />
      ) : (
        <div
          ref={staffScrollRef}
          data-testid="tab-scroller"
          className="w-full overflow-x-auto overscroll-x-contain rounded-2xl bg-ground/60 py-3 ring-1 ring-white/8"
        >
          <TabStaff riff={riff} geometry={geometry} showPlayhead playheadRef={playheadRef} />
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleToggle()}
          aria-label={playing ? 'Stop' : 'Play'}
          data-testid="player-toggle"
          className="press flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-ground shadow-[0_6px_18px_rgba(255,176,32,0.35)]"
        >
          <PlayPauseIcon playing={playing} stop size={24} />
        </button>

        <button
          type="button"
          onClick={handleMetronomeToggle}
          aria-label="Metronome"
          aria-pressed={metronomeOn}
          data-testid="metronome-toggle"
          className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{
            background: metronomeOn ? 'var(--color-accent)' : 'var(--color-surface-2)',
            color: metronomeOn ? 'var(--color-ground)' : 'var(--color-ink-dim)',
          }}
        >
          <MetronomeIcon size={22} />
        </button>

        <label className="min-w-0 flex-1">
          <div className="mb-1.5 flex justify-between text-xs font-bold tracking-wider text-ink-dim uppercase">
            <span>Speed</span>
            <span className="tabular-nums">{Math.round(speed * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.1}
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
            className="-my-3 block h-11 w-full accent-accent"
            aria-label="Playback speed"
          />
        </label>
      </div>
    </div>
  );
}

export default PlayerPanel;
