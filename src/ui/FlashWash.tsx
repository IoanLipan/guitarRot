/**
 * A tint that washes across a whole card for half a second when an answer
 * lands: green for right, red for wrong. Put it last in a `relative` card; it
 * ignores touches and fades itself out.
 */
export function FlashWash({ tone }: { tone: 'good' | 'bad' }) {
  return <span aria-hidden="true" data-testid="flash-wash" data-tone={tone} className="flash-wash" />;
}

export default FlashWash;
