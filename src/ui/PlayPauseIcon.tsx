import { PauseIcon, PlayIcon, StopIcon, type IconProps } from './icons';

/**
 * The play mark and the pause (or stop) mark stacked in one box: switching
 * `playing` turns and scales one out while the other turns and scales in (see
 * `.morph-icon` in index.css), instead of one swapping for the other. Both
 * stay in the DOM; the button that holds this carries the accessible name.
 */
export function PlayPauseIcon({
  playing,
  stop = false,
  size = 24,
  ...rest
}: {
  playing: boolean;
  /** Show a stop square, not pause bars, while playing. */
  stop?: boolean;
} & IconProps) {
  const Playing = stop ? StopIcon : PauseIcon;
  return (
    <span aria-hidden="true" className="relative block shrink-0" style={{ width: size, height: size }}>
      <span className="morph-icon" data-on={playing ? 'false' : 'true'} data-icon="play">
        <PlayIcon size={size} {...rest} />
      </span>
      <span className="morph-icon" data-on={playing ? 'true' : 'false'} data-icon={stop ? 'stop' : 'pause'}>
        <Playing size={size} {...rest} />
      </span>
    </span>
  );
}

export default PlayPauseIcon;
