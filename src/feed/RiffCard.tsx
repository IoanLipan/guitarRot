import { useEffect, useMemo, useRef, useState } from 'react';
import { createRiffPlayer, type AudioEngine, type RiffPlayer } from '@/audio';
import { tapHaptic } from '@/app/haptics';
import type { Riff } from '@/content';
import { createTabGeometry, TabStaff } from '@/render';

export function RiffCard({
  riff,
  engine,
  isActive,
}: {
  riff: Riff;
  engine: AudioEngine;
  isActive: boolean;
}) {
  const playerRef = useRef<RiffPlayer | null>(null);
  const playheadRef = useRef<SVGGElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  // Read inside the activation effect without making speed changes restart
  // playback — the slider drives setSpeed on the live player instead.
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const geometry = useMemo(
    () => createTabGeometry({ bars: riff.bars, timeSignature: riff.timeSignature }),
    [riff],
  );

  /**
   * The spec's hard rule: exactly one card produces sound. Becoming the
   * active card starts this riff; leaving it stops and disposes the player,
   * so scrolling away can never leave audio running behind you.
   */
  useEffect(() => {
    if (!isActive) return;

    const player = createRiffPlayer(riff, engine, { speed: speedRef.current });
    playerRef.current = player;
    player.start();
    setPlaying(true);

    return () => {
      player.stop();
      player.dispose();
      playerRef.current = null;
      setPlaying(false);
    };
  }, [isActive, riff, engine]);

  useEffect(() => {
    playerRef.current?.setSpeed(speed);
  }, [speed]);

  // The playhead moves by transform from rAF, never React state — a 60fps
  // setState would re-render the whole staff every frame. Only the active
  // card runs a loop: this used to run on every card ever mounted, so a long
  // scroll left dozens of them ticking forever.
  useEffect(() => {
    if (!isActive) return;
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
  }, [geometry, isActive]);

  function handleToggle() {
    tapHaptic();
    const player = playerRef.current;
    if (player === null) return;
    if (playing) {
      player.stop();
      setPlaying(false);
    } else {
      player.start();
      setPlaying(true);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 bg-linear-to-b from-surface to-ground px-6 pt-8 pb-6">
      <div className="flex flex-wrap gap-2">
        <Chip>{riff.style}</Chip>
        <Chip>Lvl {riff.level}</Chip>
        <Chip>{riff.bpm} BPM</Chip>
      </div>

      <h2 className="text-3xl leading-tight font-black">{riff.title}</h2>

      <div className="flex min-h-0 flex-1 items-center">
        <div
          ref={scrollRef}
          className="max-h-full w-full overflow-x-auto rounded-2xl bg-ground/60 py-4 ring-1 ring-white/8"
        >
          <TabStaff riff={riff} geometry={geometry} showPlayhead playheadRef={playheadRef} />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <button
          type="button"
          onClick={handleToggle}
          aria-label={playing ? 'Pause' : 'Play'}
          className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-accent shadow-[0_6px_18px_rgba(255,176,32,0.35)] active:scale-95"
        >
          {playing ? (
            <span className="flex gap-1">
              <span className="h-4 w-1.5 rounded-xs bg-ground" />
              <span className="h-4 w-1.5 rounded-xs bg-ground" />
            </span>
          ) : (
            <span className="ml-0.5 h-0 w-0 border-y-10 border-l-16 border-y-transparent border-l-ground" />
          )}
        </button>

        <label className="flex-1">
          <div className="mb-1.5 flex justify-between text-[11px] font-bold tracking-wider text-ink-dim uppercase">
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
            className="w-full accent-accent"
            aria-label="Playback speed"
          />
        </label>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-bold tracking-wider text-ink-dim uppercase">
      {children}
    </span>
  );
}

export default RiffCard;
