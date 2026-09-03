import { useEffect, useMemo, useRef, useState } from 'react';
import { tapHaptic } from '@/app/haptics';
import { createRiffPlayer, type AudioEngine, type RiffPlayer } from '@/audio';
import { beatsPerBar, chartBars, chordByName, songToRiff, type Song } from '@/content';
import { STANDARD_TUNING } from '@/music';
import { chordShapeToFretboard, createTabGeometry, Fretboard, TabStaff } from '@/render';
import { ShareButton } from '@/share';
import { DifficultyPill } from './DifficultyPill';
import { ChordChart } from './ChordChart';

export function SongPlayer({
  song,
  engine,
  onBack,
}: {
  song: Song;
  engine: AudioEngine;
  onBack: () => void;
}) {
  const riff = useMemo(() => songToRiff(song), [song]);
  const geometry = useMemo(
    () => createTabGeometry({ bars: riff.bars, timeSignature: riff.timeSignature }),
    [riff],
  );

  const playerRef = useRef<RiffPlayer | null>(null);
  const playheadRef = useRef<SVGGElement>(null);
  const staffScrollRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [activeBar, setActiveBar] = useState<number | null>(null);
  const [speed, setSpeed] = useState(1);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  // Opening a song starts it, the same way opening a feed card does.
  // The cleanup is what guarantees leaving the screen leaves no audio behind.
  useEffect(() => {
    const player = createRiffPlayer(riff, engine, { speed: speedRef.current });
    playerRef.current = player;
    player.start();
    setPlaying(true);

    return () => {
      player.stop();
      player.dispose();
      playerRef.current = null;
      setPlaying(false);
      setActiveBar(null);
    };
  }, [riff, engine]);

  useEffect(() => {
    playerRef.current?.setSpeed(speed);
  }, [speed]);

  // One rAF loop drives both readouts. The playhead moves by transform,
  // never state; the bar highlight is state, but only re-renders on the few
  // frames a bar actually changes.
  const barLength = beatsPerBar(riff.timeSignature);
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const player = playerRef.current;
      if (player !== null) {
        const beat = player.progress() * geometry.totalBeats;
        setActiveBar((current) => {
          const next = Math.min(riff.bars - 1, Math.floor(beat / barLength));
          return next === current ? current : next;
        });

        const head = playheadRef.current;
        if (head !== null) {
          const x = beat * geometry.beatWidth;
          head.style.transform = `translateX(${x}px)`;
          const scroller = staffScrollRef.current;
          if (scroller !== null) {
            scroller.scrollLeft = Math.max(
              0,
              geometry.xForBeat(0) + x - scroller.clientWidth * 0.35,
            );
          }
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [geometry, riff.bars, barLength]);

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

  const currentChord =
    song.chart === undefined || activeBar === null
      ? undefined
      : chordByName(chartBars(song.chart)[activeBar]?.chordName ?? '');

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 bg-linear-to-b from-surface to-ground px-5 pt-4 pb-5">
      {/* pr-14 keeps the share pill clear of the shell's settings gear,
          which floats over this pane at the top right. */}
      <div className="flex shrink-0 items-center justify-between gap-3 pr-14">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to songs"
          data-testid="song-back"
          className="flex h-9 items-center gap-1.5 rounded-full bg-surface-2 pr-4 pl-3 text-xs font-bold tracking-wider text-ink-dim uppercase active:scale-95"
        >
          <span aria-hidden="true">←</span> Songs
        </button>
        <ShareButton target={{ kind: 'song', id: song.id }} title={song.title} />
      </div>

      <div className="shrink-0">
        <h2 className="text-2xl leading-tight font-black">{song.title}</h2>
        <p className="mt-0.5 text-sm text-ink-dim">{song.artist}</p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-1.5">
        <DifficultyPill difficulty={song.difficulty} />
        <Chip>{song.style}</Chip>
        <Chip>Key {song.key}</Chip>
        <Chip>{song.bpm} BPM</Chip>
      </div>

      <p className="shrink-0 text-[13px] leading-relaxed text-ink-dim">{song.about}</p>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {song.chart !== undefined ? (
          <ChordChart chart={song.chart} activeBar={activeBar} />
        ) : (
          <div className="flex h-full items-center">
            <div
              ref={staffScrollRef}
              className="max-h-full w-full overflow-x-auto rounded-2xl bg-ground/60 py-4 ring-1 ring-white/8"
            >
              <TabStaff riff={riff} geometry={geometry} showPlayhead playheadRef={playheadRef} />
            </div>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
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

        <label className="min-w-0 flex-1">
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

        {currentChord !== undefined && (
          <div className="w-16 shrink-0" data-testid="current-chord">
            <Fretboard
              orientation="vertical"
              fretRange={chordShapeToFretboard(currentChord).fretRange}
              markers={chordShapeToFretboard(currentChord).markers}
              tuning={STANDARD_TUNING}
              fit
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-bold tracking-wider text-ink-dim uppercase">
      {children}
    </span>
  );
}

export default SongPlayer;
