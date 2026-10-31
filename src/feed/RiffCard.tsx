import { useEffect, useMemo, useRef, useState } from 'react';
import { createRiffPlayer, type AudioEngine, type RiffPlayer } from '@/audio';
import { tapHaptic } from '@/app/haptics';
import type { Riff } from '@/content';
import { createTabGeometry, TabView, useFollowPlayhead } from '@/render';
import { stagger } from '@/ui/motion';
import { PlayPauseIcon } from '@/ui/PlayPauseIcon';
import { MetaLine } from '@/songs/MetaLine';

/**
 * A card that believes it is playing but hears nothing (the transport is not
 * running, or the audio context is suspended) first starts itself again, which
 * is what leaving the card and coming back used to do by hand. If it is still
 * silent after the grace period, its button stops claiming otherwise.
 */
export const SILENT_RETRY_MS = 200;
export const SILENT_GRACE_MS = 700;

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
  const { scrollerRef, follow } = useFollowPlayhead();

  const [playing, setPlaying] = useState(false);
  // The rAF loop reads this and must not wait for a render to see a tap.
  const playingRef = useRef(false);
  function showPlaying(next: boolean) {
    playingRef.current = next;
    setPlaying(next);
  }
  const showPlayingRef = useRef(showPlaying);
  showPlayingRef.current = showPlaying;

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
    // start() checks itself and answers false if the transport would not run;
    // the button must not claim otherwise.
    showPlayingRef.current(player.start() !== false);

    return () => {
      player.stop();
      player.dispose();
      playerRef.current = null;
      showPlayingRef.current(false);
    };
  }, [isActive, riff, engine]);

  useEffect(() => {
    playerRef.current?.setSpeed(speed);
  }, [speed]);

  // The playhead moves by transform from rAF, never React state — a 60fps
  // setState would re-render the whole staff every frame. Only the active
  // card runs a loop: this used to run on every card ever mounted, so a long
  // scroll left dozens of them ticking forever.
  //
  // The same loop keeps the button honest. What the transport and the audio
  // context actually say wins over what the card last asked for.
  useEffect(() => {
    if (!isActive) return;
    let frame = 0;
    let silentSince: number | null = null;
    let retried = false;

    const tick = () => {
      const player = playerRef.current;
      if (player !== null) {
        const audible = player.isPlaying();
        // Tells the playhead's glow whether it is playing (see .playhead-glow).
        const flag = audible ? 'true' : 'false';
        if (playheadRef.current !== null && playheadRef.current.dataset.playing !== flag) {
          playheadRef.current.dataset.playing = flag;
        }
        if (audible) {
          silentSince = null;
          retried = false;
          if (!playingRef.current) showPlayingRef.current(true);
        } else if (playingRef.current) {
          const now = Date.now();
          silentSince ??= now;
          const silentFor = now - silentSince;
          if (silentFor >= SILENT_GRACE_MS) {
            showPlayingRef.current(false);
          } else if (!retried && silentFor >= SILENT_RETRY_MS) {
            retried = true;
            player.start();
          }
        }

        const head = playheadRef.current;
        if (head !== null) {
          const x = player.progress() * geometry.totalBeats * geometry.beatWidth;
          head.style.transform = `translateX(${x}px)`;
          // Only a playing riff drags the staff along, and only while the
          // user is not holding it: a paused staff is theirs to browse.
          if (audible) follow(geometry.xForBeat(0) + x);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [geometry, isActive, follow]);

  function handleToggle() {
    tapHaptic();
    const player = playerRef.current;
    if (player === null) return;
    if (playing) {
      player.stop();
      showPlaying(false);
    } else {
      showPlaying(player.start() !== false);
    }
  }

  // When this becomes the card on screen its parts rise in one after another:
  // chips, title, staff, controls.
  const rise = isActive ? 'rise-in' : '';

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 bg-ground px-6 pt-3 pb-6 tight:gap-3 tight:pb-4">
      {/* One plain line on the row the instrument switch, the share icon and the settings gear float on
          (44px tall, 12px down, 164px in from the right): pr-36 keeps it clear
          of the three, and a phone too narrow for all of it breaks it between
          the facts rather than sliding it under them. */}
      <div className={`${rise} flex min-h-11 shrink-0 items-center pr-36`} style={stagger(0)}>
        <MetaLine facts={[riff.style, `Level ${riff.level}`, `${riff.bpm} bpm`]} />
      </div>

      <h2 className={`${rise} text-headline font-black tight:text-title`} style={stagger(1)}>
        {riff.title}
      </h2>

      {/* The tab fills the room the card has left: its lines grow with it (see
          TabView), and a sideways swipe that runs out of staff stops there
          instead of chaining on into the vertical feed. */}
      <div className={`${rise} min-h-0 flex-1`} style={stagger(2)}>
        <TabView riff={riff} playheadRef={playheadRef} scrollerRef={scrollerRef} />
      </div>

      <div className={`${rise} flex shrink-0 items-center gap-4`} style={stagger(3)}>
        <button
          type="button"
          onClick={handleToggle}
          aria-label={playing ? 'Pause' : 'Play'}
          className="press flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-accent text-ground"
        >
          <PlayPauseIcon playing={playing} size={24} />
        </button>

        <label className="flex-1">
          <div className="label mb-1.5 flex justify-between">
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

export default RiffCard;
