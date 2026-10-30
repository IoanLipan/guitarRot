/**
 * The engraved symbol on each achievement's pick. Every glyph is drawn on a
 * 100 by 100 grid out of three kinds of shape, so the one drawing can be
 * struck three ways: engraved into steel, gold or celluloid, or (for a pick
 * not earned yet) as a thin outline.
 *
 *  - `fill`: a solid shape.
 *  - `line`: a stroke with round caps, width in grid units.
 *  - `text`: a numeral set in the display face.
 *
 * They are simple, heavy silhouettes on purpose: a pick in the case is about
 * 56px wide and its glyph about 30px of that.
 */
export type GlyphShape =
  | { kind: 'fill'; d: string; evenodd?: boolean }
  | { kind: 'line'; d: string; width?: number }
  | { kind: 'text'; text: string; x: number; y: number; size: number };

export type GlyphName =
  | 'book'
  | 'unit'
  | 'units'
  | 'cap'
  | 'note'
  | 'num-10'
  | 'num-25'
  | 'num-50'
  | 'target'
  | 'loop'
  | 'play'
  | 'discs-1'
  | 'discs-2'
  | 'discs-3'
  | 'film'
  | 'peaks'
  | 'calendar-3'
  | 'calendar-7'
  | 'calendar-30'
  | 'fork'
  | 'level-5'
  | 'level-10';

/** Which glyph each achievement wears. A test checks that every achievement has one. */
export const ACHIEVEMENT_GLYPH: Record<string, GlyphName> = {
  'first-lesson': 'book',
  'first-unit': 'unit',
  'three-units': 'units',
  'whole-course': 'cap',
  'first-correct': 'note',
  'streak-10': 'num-10',
  'streak-25': 'num-25',
  'streak-50': 'num-50',
  'perfect-easy': 'target',
  'perfect-medium': 'target',
  'perfect-hard': 'target',
  'runs-5': 'loop',
  'runs-25': 'loop',
  'first-song': 'play',
  'songs-5': 'discs-1',
  'songs-15': 'discs-2',
  'songs-30': 'discs-3',
  'movie-song': 'film',
  'hard-song': 'peaks',
  'days-3': 'calendar-3',
  'days-7': 'calendar-7',
  'days-30': 'calendar-30',
  'tuned-up': 'fork',
  'level-5': 'level-5',
  'level-10': 'level-10',
};

export function glyphForAchievement(id: string): GlyphName {
  return ACHIEVEMENT_GLYPH[id] ?? 'play';
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

const round = (value: number) => Math.round(value * 100) / 100;

function rrect(x: number, y: number, w: number, h: number, r: number): string {
  return (
    `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}` +
    `h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`
  );
}

function disc(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
}

function polar(cx: number, cy: number, r: number, degrees: number): [number, number] {
  const radians = (degrees * Math.PI) / 180;
  return [round(cx + r * Math.cos(radians)), round(cy + r * Math.sin(radians))];
}

/** An arc round (cx, cy) from one angle to another, clockwise, ending in an arrowhead. */
function arcArrow(cx: number, cy: number, r: number, from: number, to: number): GlyphShape[] {
  const [x1, y1] = polar(cx, cy, r, from);
  const [x2, y2] = polar(cx, cy, r, to);
  const radians = (to * Math.PI) / 180;
  const along: [number, number] = [-Math.sin(radians), Math.cos(radians)];
  const across: [number, number] = [Math.cos(radians), Math.sin(radians)];
  const tip = [round(x2 + along[0] * 15), round(y2 + along[1] * 15)];
  const left = [round(x2 + across[0] * 12), round(y2 + across[1] * 12)];
  const right = [round(x2 - across[0] * 12), round(y2 - across[1] * 12)];
  return [
    { kind: 'line', d: `M${x1} ${y1}A${r} ${r} 0 0 1 ${x2} ${y2}`, width: 10 },
    { kind: 'fill', d: `M${tip[0]} ${tip[1]}L${left[0]} ${left[1]}L${right[0]} ${right[1]}z` },
  ];
}

type Circle = { cx: number; cy: number; r: number };

/**
 * The part of `back`'s rim that `front` does not cover, as an open arc. Stacked
 * records are drawn this way: a ring behind another would otherwise show
 * straight through it, and an engraving has no way to hide a line.
 */
function rimOutside(back: Circle, front: Circle): string {
  const dx = front.cx - back.cx;
  const dy = front.cy - back.cy;
  const distance = Math.hypot(dx, dy);
  const along = (back.r * back.r - front.r * front.r + distance * distance) / (2 * distance);
  const halfHidden = (Math.acos(Math.max(-1, Math.min(1, along / back.r))) * 180) / Math.PI;
  const facing = (Math.atan2(dy, dx) * 180) / Math.PI;
  const [x1, y1] = polar(back.cx, back.cy, back.r, facing + halfHidden);
  const [x2, y2] = polar(back.cx, back.cy, back.r, facing - halfHidden + 360);
  const large = 360 - 2 * halfHidden > 180 ? 1 : 0;
  return `M${x1} ${y1}A${back.r} ${back.r} 0 ${large} 1 ${x2} ${y2}`;
}

/** A record seen from above: a rim and a label. */
function record(c: Circle): GlyphShape[] {
  return [
    { kind: 'line', d: disc(c.cx, c.cy, c.r), width: 8 },
    { kind: 'fill', d: disc(c.cx, c.cy, c.r * 0.34) },
  ];
}

function discs(count: 1 | 2 | 3): GlyphShape[] {
  if (count === 1) return record({ cx: 50, cy: 50, r: 33 });
  if (count === 2) {
    const front = { cx: 38, cy: 63, r: 26 };
    const back = { cx: 62, cy: 39, r: 26 };
    return [{ kind: 'line', d: rimOutside(back, front), width: 8 }, ...record(front)];
  }
  const circles: Circle[] = [
    { cx: 27, cy: 73, r: 21 },
    { cx: 50, cy: 50, r: 21 },
    { cx: 73, cy: 27, r: 21 },
  ];
  const [front, middle, back] = circles as [Circle, Circle, Circle];
  return [
    { kind: 'line', d: rimOutside(back, middle), width: 7 },
    { kind: 'line', d: rimOutside(middle, front), width: 7 },
    ...record(front),
  ];
}

function calendar(days: 3 | 7 | 30): GlyphShape[] {
  const dots: [number, number, number][] =
    days === 3
      ? [
          [29, 64, 6],
          [50, 64, 6],
          [71, 64, 6],
        ]
      : days === 7
        ? [29, 43, 57, 71]
            .map((x): [number, number, number] => [x, 54, 5])
            .concat([36, 50, 64].map((x): [number, number, number] => [x, 69, 5]))
        : [50, 62, 74].flatMap((y) =>
            [27, 38.5, 50, 61.5, 73].map((x): [number, number, number] => [x, y, 3.8]),
          );
  return [
    { kind: 'line', d: rrect(16, 26, 68, 58, 9), width: 7 },
    { kind: 'fill', d: 'M16 35a9 9 0 0 1 9-9h50a9 9 0 0 1 9 9v7H16z' },
    { kind: 'line', d: 'M32 15V33M68 15V33', width: 8 },
    ...dots.map(([cx, cy, r]): GlyphShape => ({ kind: 'fill', d: disc(cx, cy, r) })),
  ];
}

function numeral(text: string): GlyphShape[] {
  return [{ kind: 'text', text, x: 50, y: text.length === 1 ? 82 : 76, size: text.length === 1 ? 104 : 84 }];
}

/** A level badge: the number with a small peak over it. */
function levelNumber(text: string): GlyphShape[] {
  return [
    { kind: 'line', d: 'M35 25L50 11L65 25', width: 9 },
    { kind: 'text', text, x: 50, y: 91, size: text.length === 1 ? 82 : 70 },
  ];
}

// ---------------------------------------------------------------------------
// The glyphs
// ---------------------------------------------------------------------------

export const GLYPHS: Record<GlyphName, readonly GlyphShape[]> = {
  // An open book: two pages meeting at the spine.
  book: [
    { kind: 'fill', d: 'M48 29C39 23 25 22 13 25V75C25 72 39 73 48 79Z' },
    { kind: 'fill', d: 'M52 29C61 23 75 22 87 25V75C75 72 61 73 52 79Z' },
  ],

  // A unit is a block of lessons: three slabs stacked.
  unit: [
    { kind: 'fill', d: rrect(16, 22, 68, 16, 5) },
    { kind: 'fill', d: rrect(16, 42, 68, 16, 5) },
    { kind: 'fill', d: rrect(16, 62, 68, 16, 5) },
  ],

  // Three units: three columns climbing.
  units: [
    { kind: 'fill', d: rrect(14, 52, 21, 30, 5) },
    { kind: 'fill', d: rrect(39.5, 36, 21, 46, 5) },
    { kind: 'fill', d: rrect(65, 20, 21, 62, 5) },
  ],

  // A mortarboard with its tassel.
  cap: [
    { kind: 'fill', d: 'M50 22L93 41L50 60L7 41Z' },
    { kind: 'fill', d: 'M24 53V67C24 77 76 77 76 67V53L50 65Z' },
    { kind: 'line', d: 'M88 44V70', width: 6 },
    { kind: 'fill', d: disc(88, 73, 5) },
  ],

  // An eighth note.
  note: [
    { kind: 'fill', d: 'M21 73a15 11 -22 1 0 30 0a15 11 -22 1 0 -30 0z' },
    { kind: 'line', d: 'M49 71V21', width: 10 },
    { kind: 'line', d: 'M49 23C50 40 76 42 76 62', width: 10 },
  ],

  'num-10': numeral('10'),
  'num-25': numeral('25'),
  'num-50': numeral('50'),

  // Bullseye: nothing missed.
  target: [
    { kind: 'line', d: disc(50, 50, 37), width: 8 },
    { kind: 'line', d: disc(50, 50, 21), width: 8 },
    { kind: 'fill', d: disc(50, 50, 7.5) },
  ],

  // Two arrows chasing each other round a circle: again.
  loop: [...arcArrow(50, 50, 28, 205, 305), ...arcArrow(50, 50, 28, 25, 125)],

  play: [{ kind: 'fill', d: 'M33 20Q33 14 38 17L84 47Q88 50 84 53L38 83Q33 86 33 80Z' }],

  'discs-1': discs(1),
  'discs-2': discs(2),
  'discs-3': discs(3),

  // A strip of film: a frame window and sprocket holes top and bottom.
  film: [
    {
      kind: 'fill',
      evenodd: true,
      d: [
        rrect(12, 22, 76, 56, 7),
        rrect(26, 38, 48, 24, 3),
        ...[18, 34, 50, 66].flatMap((x) => [rrect(x, 28, 8, 6, 1.5), rrect(x, 66, 8, 6, 1.5)]),
      ].join(''),
    },
  ],

  // Two peaks stacked: higher, harder.
  peaks: [
    { kind: 'line', d: 'M18 52L50 24L82 52', width: 12 },
    { kind: 'line', d: 'M18 78L50 50L82 78', width: 12 },
  ],

  'calendar-3': calendar(3),
  'calendar-7': calendar(7),
  'calendar-30': calendar(30),

  // A tuning fork.
  fork: [
    { kind: 'line', d: 'M33 12V45C33 63 67 63 67 45V12', width: 11 },
    { kind: 'line', d: 'M50 60V88', width: 12 },
  ],

  'level-5': levelNumber('5'),
  'level-10': levelNumber('10'),
};
