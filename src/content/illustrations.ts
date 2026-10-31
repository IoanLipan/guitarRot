/**
 * The hand-drawn lesson illustrations, by name, with what each one shows.
 *
 * This list is the contract between three parties: lesson authors pick a
 * `name` for an explain card's visual, the validator rejects any name not
 * here, and src/learn/illustrations draws one component per name. The spec
 * is written for whoever draws it: what must be on it, what it teaches.
 *
 * `group` only splits the drawing work (a and b: the guitar course's thirty;
 * c: the ukulele course's, drawn only where a guitar picture would be wrong
 * for four strings); it means nothing at runtime.
 */
export const ILLUSTRATIONS = [
  // --- Start here -----------------------------------------------------------
  {
    name: 'guitar-parts',
    group: 'a',
    spec: 'A whole acoustic guitar lying horizontally, headstock left. Label with leader lines: Headstock, Tuning pegs, Nut, Frets, Neck, Body, Sound hole, Bridge, Strings. Fret dot inlays at 3 5 7 9 12 (double at 12).',
  },
  {
    name: 'string-order',
    group: 'a',
    spec: 'Six horizontal strings as seen looking down at the guitar in your lap: thickest at the TOP (drawn thick), thinnest at the bottom (thin). Left of each: its number (6 at top … 1 at bottom) and a note chip E (Mi), A (La), D (Re), G (Sol), B (Si), E (Mi) in note colours. Right of each: the mnemonic word Eddie / Ate / Dynamite / Good / Bye / Eddie. A small "thick = low sound" ↔ "thin = high sound" cue.',
  },
  {
    name: 'posture',
    group: 'a',
    spec: 'A simple geometric seated figure (rounded shapes, no face detail) with an acoustic guitar resting on the right thigh, neck pointing up-left at a slight angle, fretting hand on the neck, picking arm over the body. Three short callouts: "neck slightly up", "body on your leg", "shoulders loose".',
  },
  {
    name: 'tuning-peg',
    group: 'a',
    spec: 'Close-up of a headstock with one highlighted tuning peg. A curved arrow "tighten" with "pitch ↑" and an opposite arrow "loosen" with "pitch ↓". Below: a small pitch graph — a line rising from below to a dashed "target" line and settling on it, labelled "come up to the note".',
  },
  {
    name: 'tab-map',
    group: 'a',
    spec: 'Left: six horizontal strings, thinnest at the top, labelled e (Mi) … E (Mi) in note colours. Right: the same six lines as a tab staff with a "TAB" clef, numbers on lines: 0 on the top line (callout "0 = open string"), 3 on the bottom line (callout "3 = fret 3, string 6"), and a stacked column of numbers (callout "stacked = together"). Dotted connectors join each string to its tab line. A "read →" arrow under the staff.',
  },
  {
    name: 'pick-grip',
    group: 'a',
    spec: 'Simplified right hand: thumb pad pressing a pick against the side of the curled index finger; only the pick tip pokes out (highlighted in accent). Callouts: "thumb pad", "side of index finger", "just the tip shows". A small arc arrow "pick from the wrist".',
  },
  {
    name: 'fret-finger',
    group: 'a',
    spec: 'Side view of one string over a fretboard with three fret wires. Three fingertip positions on the string, each with a badge: ✓ green "just behind the fret wire" (closest to the wire on the headstock side), ✗ red "on top of the wire", ✗ amber "middle of the gap: buzzes". The ✓ one is the biggest/most prominent.',
  },
  {
    name: 'finger-numbers',
    group: 'a',
    spec: 'An open fretting hand seen from the front (simplified rounded shapes): fingers numbered 1 index, 2 middle, 3 ring, 4 pinky in accent circles; thumb marked "T (behind the neck)". Below: a strip of 4 frets with the same numbers over frets 1 2 3 4: "one finger per fret".',
  },
  {
    name: 'alphabet-loop',
    group: 'a',
    spec: 'Seven note bubbles in a circle, clockwise: A (La), B (Si), C (Do), D (Re), E (Mi), F (Fa), G (Sol), each in its note colour. Arcs between neighbours labelled "2 frets", except B→C and E→F which are drawn short/highlighted and labelled "1 fret". A bold arrow from G back to A labelled "starts again, higher".',
  },
  {
    name: 'piano-half-steps',
    group: 'a',
    spec: 'One octave of piano keys C to B. White keys labelled C (Do) … B (Si) in note colours. Black keys present. The two places with no black key between whites (E–F and B–C) circled/highlighted with the label "no black key = 1 fret (half step)".',
  },
  {
    name: 'sharp-flat',
    group: 'a',
    spec: 'Three adjacent frets on one string: C (Do) | the middle fret | D (Re). The middle fret shows two stacked names, C# (Do#) and Db (Reb). Arrows: from C → middle labelled "# = one fret up"; from D → middle labelled "b = one fret down". Caption "same fret, two names".',
  },
  {
    name: 'octave-shape',
    group: 'a',
    spec: 'A 6-string, 5-fret neck window (frets 2–7). Dot G (Sol) on string 6 fret 3, dot G (Sol) on string 4 fret 5, joined by an L-shaped arrow labelled "2 strings thinner, 2 frets up". Second faint example C (Do) string 5 fret 3 → string 3 fret 5. Note: the B string breaks this shape — small footnote "(from strings 6 and 5)".',
  },
  {
    name: 'chord-notes',
    group: 'a',
    spec: 'Three note bubbles E (Mi), G (Sol), B (Si) in note colours, side by side, with a "+" between them and an "=" leading to a bigger rounded badge "Em (Mi minor)". Under it, a down-strum arrow sweeping across six strings: "strum = all together".',
  },
  {
    name: 'chord-symbols',
    group: 'a',
    spec: 'A chord diagram (vertical strings, nut at top) of Am with a legend: "X = don\'t play this string", "O = play it open", numbered dots "= which finger". An accent arrow at the top showing the strum starting on string 5 ("start here").',
  },
  {
    name: 'shape-move',
    group: 'a',
    spec: 'Two small chord diagrams side by side: Em → Am. On Em, fingers 2 and 3 on strings 5 and 4 at fret 2; on Am, fingers 2 and 3 on strings 4 and 3, plus finger 1 on string 2 fret 1. Curved arrows show 2 and 3 moving together one string over; finger 1 marked "add". Caption "move the shape as one".',
  },
  // --- Rhythm, melody and theory -------------------------------------------
  {
    name: 'beats-bar',
    group: 'b',
    spec: 'One bar of 4/4 as four big beat circles numbered 1 2 3 4 (1 accented), a bar line each side, "4/4" at the start. Under each circle a down-strum arrow. A small metronome icon with "60 bpm = 1 beat per second".',
  },
  {
    name: 'strum-pattern',
    group: 'b',
    spec: 'Eight slots labelled 1 & 2 & 3 & 4 &. Big arrows: ↓ on 1, ghost (dashed, "miss") on &, ↓ on 2, ↑ on &, ghost on 3, ↑ on &, ↓ on 4, ↑ on &. Downs in accent, ups in a second colour. A wavy pendulum line underneath: "the hand never stops".',
  },
  {
    name: 'change-early',
    group: 'b',
    spec: 'A timeline of two bars: bar of G (Sol) with beats 1 2 3 4, then bar of D (Re). An accent arrow leaves during beat 4 of the first bar and lands on beat 1 of the second: "move on beat 4, land on 1". A red faded arrow leaving at the bar line: "too late".',
  },
  {
    name: 'scale-staircase',
    group: 'b',
    spec: 'A staircase of 8 steps rising left to right: Do Re Mi Fa Sol La Si Do in note colours. Step heights: tall (whole) except Mi→Fa and Si→Do, drawn half as tall and highlighted. Labels under the risers: W W H W W W H.',
  },
  {
    name: 'leap-vs-step',
    group: 'b',
    spec: 'Two mini melody paths on a 5-line grid. Left "step": Do → Re → Mi climbing to neighbours. Right "leap": Do jumping straight up to Sol with a big arc arrow, skipping Re Mi Fa (shown ghosted). Note colours on the dots.',
  },
  {
    name: 'note-lengths',
    group: 'b',
    spec: 'A pyramid of blocks spanning one 4-beat bar: 1 whole (4 beats), 2 halves (2 each), 4 quarters (1 each), 8 eighths (½ each), each row labelled with its name and count. A beat ruler 1 2 3 4 on top. Side note: "dot = + half again (dotted half = 3)".',
  },
  {
    name: 'power-chord',
    group: 'b',
    spec: 'A 3-string × 4-fret neck window: root dot "R" on string 6 fret 3 (G (Sol)), fifth dot "5" on string 5 fret 5 (D (Re)), optional octave dot on string 4 fret 5. A crossed-out "3rd" bubble: "no 3rd → not major, not minor". A slide arrow along the neck: "same shape anywhere".',
  },
  {
    name: 'key-family',
    group: 'b',
    spec: 'The G (Sol) major scale as a row of 7 note bubbles: G A B C D E F#, numbered I–VII under them. I (G), IV (C), V (D) circled boldly in accent, labelled "major chords: the family"; vi (E → Em) circled dashed, labelled "relative minor".',
  },
  {
    name: 'twelve-bar',
    group: 'b',
    spec: 'A 3×4 grid of bar boxes: row 1 E E E E, row 2 A A E E, row 3 B A E B, with roman numerals I/IV/V small under each name. Boxes coloured by function (I, IV, V each its own tint). An arrow from the last box back to the first: "repeat".',
  },
  {
    name: 'hammer-pull',
    group: 'b',
    spec: 'Two side-view panels of a string over frets. "Hammer-on": a fingertip coming down hard onto a higher fret, motion lines, label "pick once, then hammer". "Pull-off": a finger flicking off the string sideways (toward the floor), label "flick it off — the lower note rings".',
  },
  {
    name: 'slide-bend',
    group: 'b',
    spec: 'Two panels. "Slide": fingertip gliding along a string from fret 7 to fret 9 with a long arrow, "keep pressing". "Bend": a string pushed upward in an arc by a finger with two helper fingers behind, a pitch arrow "+2 frets of pitch".',
  },
  {
    name: 'barre',
    group: 'b',
    spec: 'A front view of the first 3 frets: the index finger lying flat across all six strings at fret 1 (drawn as a long rounded bar labelled "1"), plus fingers 2, 3, 4 forming the F shape (2 on string 3 fret 2, 3 on string 5 fret 3, 4 on string 4 fret 3). Callouts: "roll onto the bony edge", "thumb low behind the neck".',
  },
  {
    name: 'practice-plan',
    group: 'b',
    spec: 'A 15-minute clock face split into four coloured slices: 3 min warm-up, 5 min new stuff, 4 min a song, 3 min play for fun. Beside it a week strip of 7 day-dots all ticked: "every day beats once a week".',
  },
  {
    name: 'slow-loop',
    group: 'b',
    spec: 'A looped arrow around one bar of tab labelled "loop the hard bar". Below, a staircase of metronome tempos 60 → 65 → 70 → 75 bpm: "+5 bpm when it\'s clean".',
  },
  {
    name: 'tuner-needle',
    group: 'b',
    spec: 'A tuner dial: needle slightly left of centre over a −50 … 0 … +50 cents arc, note E (Mi) big in the middle. Left zone labelled "too low: tighten", right zone "too high: loosen", centre zone in green "in tune".',
  },
  // --- The ukulele (group c): only where a guitar picture would be wrong for four strings -----
  {
    name: 'uke-parts',
    group: 'c',
    spec: 'A whole ukulele lying horizontally, headstock left, seen from the front. Label with leader lines: Headstock, Tuning pegs, Frets, Neck, Strings (accent), Sound hole, Bridge, Body. Four strings, two tuning pegs on each side of the headstock, fret dot inlays at 5 7 10 and a double at 12 where the neck meets the body.',
  },
  {
    name: 'uke-holding',
    group: 'c',
    spec: 'A simple geometric seated figure (no face detail) with a ukulele held against the chest: the strumming forearm lying across the lower body to hug it in, the neck angled up and out to the side, the fretting hand lightly under the neck with the thumb behind it. Callouts: "hug it in with your arm", "neck angled up", "thumb behind the neck".',
  },
  {
    name: 'uke-strum-hand',
    group: 'c',
    spec: 'The strumming hand over the ukulele seen from above, neck to the left: four horizontal strings over the sound hole, an index finger with a down arrow sweeping across all four, a dashed ring marking the spot where the neck meets the body. Callouts: "index finger, nail down", "strum here", "loose wrist".',
  },
  {
    name: 'uke-string-order',
    group: 'c',
    spec: 'Four horizontal strings as you see them looking down at the ukulele you are holding: string 4 at the TOP (nearest your chin), string 1 at the bottom (nearest the floor). Left of each: its number (4 at top, 1 at bottom) and a note chip G (Sol), C (Do), E (Mi), A (La). Right of each: the mnemonic word Goats / Chew / Every / Apple with the first letter in the note colour. Tags: "nearest your chin" above, "nearest the floor" below.',
  },
  {
    name: 'uke-reentrant',
    group: 'c',
    spec: 'Four vertical bars for the open strings in string order 4 3 2 1 (G C E A), each as tall as its pitch: the C bar is the shortest, so the line over the tops dips at the C. Under each bar: its string number and a note chip. A bracket or tag says "G is higher than C: the tuning turns back" and the lowest bar is highlighted as the lowest sound.',
  },
  {
    name: 'uke-tuning-peg',
    group: 'c',
    spec: 'Close-up of a ukulele headstock (two pegs on each side, four strings) with one tuning peg highlighted. A curved arrow "tighten" with "pitch up" and an opposite arrow "loosen" with "pitch down". Below: a small pitch graph, a line rising from below to a dashed "target" line and settling on it, labelled "come up to the note".',
  },
  {
    name: 'uke-chord-box',
    group: 'c',
    spec: 'A ukulele chord box for C: four vertical lines G C E A left to right under a thick nut, three frets, a numbered dot 3 on the A string at fret 3, open circles above the G, C and E strings. A key: "O = ring it open", a numbered dot "= press here, the number is your finger", and "strum all four strings".',
  },
  {
    name: 'uke-shape-move',
    group: 'c',
    spec: 'Two chord boxes side by side, C then Am. In C the ring finger (3) sits on the A string at fret 3; in Am the middle finger (2) sits on the G string at fret 2. A curved arrow from the first dot to the second labelled "one finger hops", the lifted spot faded in the second box.',
  },
  {
    name: 'uke-island-strum',
    group: 'c',
    spec: 'The island strum as seven slots in a row: down on 1, down on 2, up on the "and" after 2, a dashed ghost slot for the swing on 3 labelled "miss", up on the "and" after 3, down on 4, up on the "and" after 4. Arrows in two colours (downs in accent). Under them, brackets with the chant: "Down", "Down-Up", "Up", "Down-Up". A line: "the hand never stops".',
  },
  {
    name: 'uke-chunk',
    group: 'c',
    spec: 'One bar of 4/4 in four columns: beats 1 and 3 are "strum" (an accent down arrow with a long ringing wave under it), beats 2 and 4 are "chop" (a down arrow and a flat hand pressing the strings, a tiny blip under it). A line: "strum, chop, strum, chop".',
  },
  {
    name: 'uke-waltz',
    group: 'c',
    spec: 'One bar of 3/4: three beat circles numbered 1 2 3, beat 1 the largest and in accent, a down-strum arrow under each, the time signature 3 over 4 at the start. A line: "ONE two three, ONE two three" and the words "a waltz leans on the first beat".',
  },
  {
    name: 'uke-tab-map',
    group: 'c',
    spec: 'Left: four horizontal strings with note dots A, E, C, G from the top (string 1) to the bottom (string 4). Right: the same four lines as a tab staff with a "TAB" clef and numbers: 0 on the top line (callout "0 = open"), a 3 on the bottom line (callout "3 = fret 3, string 4"), and a stacked column (callout "together"). Dotted connectors join each string to its tab line, and a "read" arrow under the staff.',
  },
  {
    name: 'uke-fingerpicking',
    group: 'c',
    spec: 'Four horizontal lanes for the strings G C E A (top to bottom), each with its note dot at the left. Six numbered dots in time order on the lanes G C E A E C, joined by a dashed zig-zag and coloured by the finger that plays them: thumb on the G and C lanes, index on E, middle on A. Under each dot the finger letter T, I or M, and a key at the bottom: T thumb, I index, M middle.',
  },
  {
    name: 'uke-bells',
    group: 'c',
    spec: 'Four horizontal strings G C E A (top to bottom). Six note dots in playing order C D E F G A, each on the string it is played on (C open and D fret 2 on the C string, E open and F fret 1 on the E string, G open, A open) joined by an arrow that zig-zags across the strings. Under each dot "open" or "fret 1" or "fret 2". A tag: "each note rings over the next, like bells".',
  },
  {
    name: 'uke-barre',
    group: 'c',
    spec: 'A front view of the first three frets of a ukulele neck, four strings G C E A. The index finger lies flat across the E and A strings at fret 1 (a long rounded bar labelled 1), the middle finger on the C string at fret 2 (2) and the ring finger on the G string at fret 3 (3): the Bb shape. Callouts: "index lies flat across two strings", "roll onto the bony edge".',
  },
] as const;

export type IllustrationName = (typeof ILLUSTRATIONS)[number]['name'];

export const ILLUSTRATION_NAMES: ReadonlySet<string> = new Set(ILLUSTRATIONS.map((i) => i.name));

export function isIllustrationName(name: string): name is IllustrationName {
  return ILLUSTRATION_NAMES.has(name);
}
