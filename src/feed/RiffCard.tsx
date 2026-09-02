import { useEffect, useMemo, useRef, useState } from 'react';
import { createRiffPlayer, type AudioEngine, type RiffPlayer } from '@/audio';
import type { Riff } from '@/content';
import { createTabGeometry, TabStaff } from '@/render';

export function RiffCard({ riff, engine }: { riff: Riff; engine: AudioEngine }) {
  const playerRef = useRef<RiffPlayer | null>(null);
  const playheadRef = useRef<SVGGElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [looping, setLooping] = useState(true);

  const geometry = useMemo(
    () => createTabGeometry({ bars: riff.bars, timeSignature: riff.timeSignature }),
    [riff],
  );

  function handlePlay() {
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

  // The playhead is moved by transform from rAF, not React state, so a 60fps
  // loop doesn't re-render the whole staff every frame.
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const player = playerRef.current;
      const head = playheadRef.current;
      if (player !== null && head !== null) {
        const x = player.progress() * geometry.totalBeats * geometry.beatWidth;
        head.style.transform = `translateX(${x}px)`;
        const scroller = scrollRef.current;
        if (scroller !== null) {
          scroller.scrollLeft = Math.max(
            0,
            geometry.xForBeat(0) + x - scroller.clientWidth * 0.35,
          );
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [geometry]);

  useEffect(
    () => () => {
      playerRef.current?.dispose();
      playerRef.current = null;
    },
    [riff],
  );

  return (
    <div className="flex h-full flex-col gap-4 bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-ground)] p-6">
      <div className="flex flex-wrap gap-2">
        <Chip>{riff.style}</Chip>
        <Chip>Lvl {riff.level}</Chip>
        <Chip>{riff.bpm} BPM</Chip>
      </div>

      <h2 className="text-[30px] font-black leading-tight">{riff.title}</h2>

      <div ref={scrollRef} className="my-auto overflow-x-auto rounded-2xl bg-[#0f0f14] p-4">
        <TabStaff riff={riff} geometry={geometry} showPlayhead playheadRef={playheadRef} />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={playing ? handleStop : handlePlay}
          aria-label={playing ? 'Stop' : 'Play'}
          className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] shadow-[0_6px_18px_rgba(255,176,32,0.35)]"
        >
          {playing ? (
            <span className="h-3.5 w-3.5 rounded-sm bg-[var(--color-ground)]" />
          ) : (
            <span className="ml-0.5 h-0 w-0 border-y-[10px] border-l-[16px] border-y-transparent border-l-[var(--color-ground)]" />
          )}
        </button>

        <label className="flex-1">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-ink-dim)]">
            Speed
          </div>
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.1}
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
            className="w-full accent-[var(--color-accent)]"
            aria-label="Playback speed"
          />
        </label>

        <button
          type="button"
          onClick={() => setLooping((value) => !value)}
          aria-pressed={looping}
          className="rounded-full border px-3 py-2 text-xs font-bold"
          style={{
            borderColor: looping ? 'var(--color-accent)' : '#33333e',
            color: looping ? 'var(--color-accent)' : 'var(--color-ink-dim)',
          }}
        >
          Loop ↻
        </button>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-ink-dim)]">
      {children}
    </span>
  );
}

export default RiffCard;
