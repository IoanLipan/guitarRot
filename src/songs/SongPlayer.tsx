import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { tapHaptic } from '@/app/haptics';
import {
  createMetronome,
  createRiffPlayer,
  speedToBpm,
  type AudioEngine,
  type Metronome,
  type RiffPlayer,
} from '@/audio';
import { beatsPerBar, chartBars, chordByName, songToRiff, type Song } from '@/content';
import { STANDARD_TUNING } from '@/music';
import { chordShapeToFretboard, createTabGeometry, Fretboard, TabStaff, useFollowPlayhead } from '@/render';
import { ShareButton } from '@/share';
import { ArrowLeftIcon, CloseIcon, MetronomeIcon } from '@/ui/icons';
import { PlayPauseIcon } from '@/ui/PlayPauseIcon';
import { DifficultyPill } from './DifficultyPill';
import { ChordChart } from './ChordChart';
import { keyLabel } from './keyLabel';
import { FretboardView } from './FretboardView';
import { hasFretboard } from './fretboardPlan';
import { useHeardFor } from './useHeardFor';

/** A tapped-out practice loop: the bar you tapped first, and the resulting range. */
type LoopRange = { anchor: number; start: number; end: number };

/**
 * What the song area shows. A strummed chart is only ever its chart; a riff is
 * its tab or its fretboard; an arpeggio chart is its chart, the tab that chart
 * plays, or its fretboard.
 */
type SongView = 'chart' | 'tab' | 'fretboard';

const VIEW_LABELS: Record<SongView, string> = { chart: 'Chart', tab: 'Tab', fretboard: 'Fretboard' };

function viewsFor(song: Song): readonly SongView[] {
  if (!hasFretboard(song)) return song.chart !== undefined ? ['chart'] : ['tab'];
  return song.chart !== undefined ? ['chart', 'tab', 'fretboard'] : ['tab', 'fretboard'];
}

/**
 * How long a song has to be heard before it counts as played. Opening one
 * starts it, so merely landing here (or a quick look at a tab) must not.
 */
const SONG_PLAYED_AFTER_MS = 20_000;

export function SongPlayer({
  song,
  engine,
  onBack,
  onPlayed,
}: {
  song: Song;
  engine: AudioEngine;
  onBack: () => void;
  /** Called once per visit, when the song has really been heard for 20 seconds. */
  onPlayed?: (songId: string) => void;
}) {
  const riff = useMemo(() => songToRiff(song), [song]);
  const barLength = beatsPerBar(riff.timeSignature);
  const geometry = useMemo(
    () => createTabGeometry({ bars: riff.bars, timeSignature: riff.timeSignature }),
    [riff],
  );

  const playerRef = useRef<RiffPlayer | null>(null);
  const metronomeRef = useRef<Metronome | null>(null);
  const playheadRef = useRef<SVGGElement>(null);
  /** Scrolls the tab along with the playhead, and stands down while the player's hands are on it. */
  const { scrollerRef: tabScrollerRef, follow: followTab, scrollToStart: tabToStart } = useFollowPlayhead();
  /** Blocks a second tap of Play from overlapping a count-in already in flight. */
  const startingRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [activeBar, setActiveBar] = useState<number | null>(null);
  const [speed, setSpeed] = useState(1);
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [loopRange, setLoopRange] = useState<LoopRange | null>(null);
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const views = useMemo(() => viewsFor(song), [song]);
  const [chosenView, setChosenView] = useState<SongView | null>(null);
  const view = chosenView !== null && views.includes(chosenView) ? chosenView : (views[0] ?? 'tab');
  const getBeat = useCallback(() => playerRef.current?.currentBeat() ?? null, []);

  // Opening a song starts it, the same way opening a feed card does.
  // The cleanup is what guarantees leaving the screen leaves no audio behind.
  useEffect(() => {
    const player = createRiffPlayer(riff, engine, { speed: speedRef.current });
    const metronome = createMetronome(barLength);
    playerRef.current = player;
    metronomeRef.current = metronome;
    // start() answers false if the transport would not run; the button must
    // not claim otherwise. It also clears the transport, so the click goes
    // back on it straight after (it stays silent until the metronome is on).
    const started = player.start() !== false;
    metronome.sync();
    setPlaying(started);

    return () => {
      player.stop();
      player.dispose();
      metronome.dispose();
      playerRef.current = null;
      metronomeRef.current = null;
      setPlaying(false);
      setActiveBar(null);
      setMetronomeOn(false);
      setLoopRange(null);
    };
  }, [riff, engine, barLength]);

  // Asks the player, not just the button: after the app has been backgrounded the
  // button still reads "playing", but the audio is suspended and nobody is hearing it.
  useHeardFor({
    resetKey: song.id,
    active: playing,
    isAudible: () => playerRef.current?.isPlaying() ?? false,
    ms: SONG_PLAYED_AFTER_MS,
    onReached: () => onPlayed?.(song.id),
  });

  useEffect(() => {
    playerRef.current?.setSpeed(speed);
  }, [speed]);

  useEffect(() => {
    if (loopRange === null) playerRef.current?.setLoopRange(null, null);
    else playerRef.current?.setLoopRange(loopRange.start * barLength, (loopRange.end + 1) * barLength);
  }, [loopRange, barLength]);

  // One rAF loop drives both readouts. The playhead moves by transform,
  // never state; the bar highlight is state, but only re-renders on the few
  // frames a bar actually changes. currentBeat() (not progress()) is what
  // keeps this correct once a practice loop shrinks the playable range —
  // progress() would read as a fraction of that range, not of the song.
  useEffect(() => {
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
          const x = beat * geometry.beatWidth;
          head.style.transform = `translateX(${x}px)`;
          // Tells the playhead's glow whether the song is playing (see .playhead-glow).
          const flag = playingRef.current ? 'true' : 'false';
          if (head.dataset.playing !== flag) head.dataset.playing = flag;
          // Keep the playhead in view while the song plays, unless the player
          // has hold of the tab; a paused tab is theirs to browse.
          if (playingRef.current) followTab(geometry.xForBeat(0) + x);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [geometry, riff.bars, barLength, followTab]);

  // Pausing puts the song back at its start, so the tab goes back with it.
  useEffect(() => {
    if (!playing) tabToStart();
  }, [playing, tabToStart]);

  async function handleToggle() {
    if (startingRef.current) return;
    tapHaptic();
    const player = playerRef.current;
    if (player === null) return;

    if (playing) {
      player.stop();
      setPlaying(false);
      return;
    }

    startingRef.current = true;
    if (metronomeOn) {
      await metronomeRef.current?.playCountIn(speedToBpm(riff.bpm, speed), barLength);
    }
    // The toggle may have been raced by an unmount while the count-in ran.
    if (playerRef.current === player) {
      // start() clears the transport, the click with it: put it back, on or off.
      const started = player.start() !== false;
      metronomeRef.current?.sync();
      setPlaying(started);
    }
    startingRef.current = false;
  }

  // The click is already on the transport (see sync above), so turning it on
  // or off is only a mute: the riff is never touched. The side effect stays
  // out of the state updater, which React may run twice.
  function handleMetronomeToggle() {
    tapHaptic();
    const next = !metronomeOn;
    setMetronomeOn(next);
    metronomeRef.current?.setOn(next);
  }

  /**
   * Tap a bar to loop it; tap a second bar to stretch the loop to cover
   * both. Tapping the first bar again clears it. One control instead of a
   * start/end picker — a bar you can already see is faster to point at than
   * a range to configure.
   */
  function handleBarTap(index: number) {
    tapHaptic();
    setLoopRange((current) => {
      if (current !== null && current.anchor === index) return null;
      if (current !== null) {
        return { anchor: current.anchor, start: Math.min(current.anchor, index), end: Math.max(current.anchor, index) };
      }
      return { anchor: index, start: index, end: index };
    });
  }

  const currentChord =
    song.chart === undefined || activeBar === null
      ? undefined
      : chordByName(chartBars(song.chart)[activeBar]?.chordName ?? '');

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 bg-linear-to-b from-surface to-ground px-5 pt-3 pb-5 tight:gap-2 tight:pb-3">
      {/* pr-14 keeps the share pill clear of the shell's settings gear,
          which floats over this pane at the top right (pt-3 puts the row level with it). */}
      <div className="flex shrink-0 items-center justify-between gap-3 pr-14">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to songs"
          data-testid="song-back"
          className="press flex h-11 items-center gap-1.5 rounded-full bg-surface-2 pr-4 pl-3 text-xs font-bold tracking-wider text-ink-dim uppercase"
        >
          <ArrowLeftIcon size={18} /> Songs
        </button>
        <ShareButton target={{ kind: 'song', id: song.id }} title={song.title} className="min-h-11" />
      </div>

      <div className="shrink-0">
        {/* Two lines at most: a long title ("Prelude in D minor (BWV 999)") is the first thing to eat a small screen.
            In the fretboard view of a tight one it is one, and the board gets the other line. */}
        <h2
          className={`line-clamp-2 text-2xl leading-tight font-black tight:text-xl ${
            view === 'fretboard' ? 'tight:line-clamp-1' : ''
          }`}
        >
          {song.title}
        </h2>
        <p className={`mt-0.5 truncate text-sm text-ink-dim ${view === 'fretboard' ? 'tight:hidden' : ''}`}>
          {song.artist}
        </p>
      </div>

      {/* On a short phone the chips become one row that slides sideways (they bleed to the
          screen edges so it is plain they do), instead of wrapping onto a second line;
          and in the fretboard view of a tight one they go altogether, as do the artist line and
          the "Looping bars" row below (the view's own toggle shows it is looping): the board
          needs the room. */}
      <div
        className={`flex shrink-0 flex-wrap gap-1.5 short:-mx-5 short:flex-nowrap short:overflow-x-auto short:px-5 short:[scrollbar-width:none] short:[&::-webkit-scrollbar]:hidden short:[&>*]:shrink-0 short:[&>*]:whitespace-nowrap ${
          view === 'fretboard' ? '[@media(max-height:700px)]:hidden' : ''
        }`}
      >
        <DifficultyPill difficulty={song.difficulty} />
        <Chip>{song.style}</Chip>
        <Chip>Key {keyLabel(song.key)}</Chip>
        <Chip>{song.bpm} BPM</Chip>
      </div>

      {/* The blurb is the first thing to go: two lines on a short phone, none on a tight one,
          where the staff and the fretboard need the room more. */}
      <p className="shrink-0 text-[13px] leading-relaxed text-ink-dim short:line-clamp-2 tight:hidden">
        {song.about}
      </p>

      {loopRange !== null && (
        <div
          className={`flex shrink-0 items-center gap-2 text-xs font-bold text-ink-dim ${
            view === 'fretboard' ? 'tight:hidden' : ''
          }`}
        >
          <span data-testid="loop-range-label">
            Looping bars {loopRange.start + 1}–{loopRange.end + 1}
          </span>
          <button
            type="button"
            onClick={() => setLoopRange(null)}
            aria-label="Clear loop"
            data-testid="loop-clear"
            className="press -my-2.5 flex h-11 w-11 items-center justify-center rounded-full text-ink-dim"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2">
              <CloseIcon size={16} />
            </span>
          </button>
        </div>
      )}

      {views.length > 1 && (
        <div
          role="group"
          aria-label="Song view"
          data-testid="view-toggle"
          style={{ gridTemplateColumns: `repeat(${views.length}, minmax(0, 1fr))` }}
          className="relative grid shrink-0 gap-1 self-start rounded-full bg-surface-2 p-1"
        >
          {/* One pill that slides to the chosen view, like Learn's section switch; the buttons sit above it. */}
          <span
            aria-hidden="true"
            data-testid="view-pill"
            className="tab-indicator pointer-events-none absolute top-1 bottom-1 left-1 rounded-full bg-accent"
            style={{
              width: `calc((100% - ${0.5 + 0.25 * (views.length - 1)}rem) / ${views.length})`,
              transform: `translateX(calc(${Math.max(0, views.indexOf(view))} * (100% + 0.25rem)))`,
            }}
          />
          {views.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              data-testid={`view-${option}`}
              onClick={() => {
                tapHaptic();
                setChosenView(option);
              }}
              className={`press relative z-10 min-h-11 min-w-20 rounded-full px-4 text-xs font-extrabold tracking-wider uppercase ${
                view === option ? 'text-ground' : 'text-ink-dim'
              }`}
            >
              {VIEW_LABELS[option]}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {view === 'chart' && song.chart !== undefined ? (
          <ChordChart
            chart={song.chart}
            activeBar={activeBar}
            loopRange={loopRange}
            onBarTap={handleBarTap}
          />
        ) : view === 'fretboard' ? (
          <FretboardView
            riff={riff}
            engine={engine}
            playing={playing}
            getBeat={getBeat}
            loopRange={loopRange}
            onLoopTap={handleBarTap}
          />
        ) : (
          <div className="flex h-full items-center">
            <div
              ref={tabScrollerRef}
              data-testid="tab-scroller"
              className="max-h-full w-full overflow-x-auto rounded-2xl bg-ground/60 py-4 ring-1 ring-white/8 tight:py-2"
            >
              <TabStaff riff={riff} geometry={geometry} showPlayhead playheadRef={playheadRef} />
            </div>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={() => void handleToggle()}
          aria-label={playing ? 'Pause' : 'Play'}
          className="press flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-accent shadow-[0_6px_18px_rgba(255,176,32,0.35)]"
        >
          <PlayPauseIcon playing={playing} size={26} className="text-ground" />
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

        {/* The fretboard view already shows where the fingers go. */}
        {currentChord !== undefined && view !== 'fretboard' && (
          <div className="w-16 shrink-0 max-[339px]:w-12" data-testid="current-chord">
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
    <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold tracking-wider text-ink-dim uppercase">
      {children}
    </span>
  );
}

export default SongPlayer;
