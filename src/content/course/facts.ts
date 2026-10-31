import type { FretPosition, ScaleId } from '@/music';
import type { StrumPattern } from '../songs';

/**
 * Musical claims a lesson makes in its prose or in a check, written down so
 * `course.test.ts` can recompute each one from the theory core. A lesson that
 * says "fret 3 of the low E string is G" teaches a wrong note if that is
 * mistyped, and nothing else would notice. Each unit's facts sit in a
 * `unitN.facts.ts` file next to its lessons, and only the tests import them.
 *
 * Notes are plain letter names ("G", "F#", "Bb"). `says` is the claim in
 * words, for whoever reads a failing test.
 */
export type Fact = { says: string } & (
  /** The note sounded at a fret, compared by pitch class so "Db" equals "C#". */
  | { kind: 'note'; stringIndex: number; fret: number; is: string }
  /** `b` sounds exactly `octavesUp` octaves above `a` (0 = the very same pitch). */
  | { kind: 'same-pitch'; a: FretPosition; b: FretPosition; octavesUp: number }
  /** These positions sound in strictly rising pitch, in the order listed. */
  | { kind: 'pitch-order'; positions: readonly FretPosition[] }
  /** Going up from `from` to `to` takes `apart` semitones (within one octave). */
  | { kind: 'semitones'; from: string; to: string; apart: number }
  | { kind: 'solfege'; letter: string; is: string }
  /** The open string at this index is `open`, and guitarists call it string `number`. */
  | { kind: 'string-number'; stringIndex: number; number: number; open: string }
  /** The first letters of these words are the open strings' letters, in string-index order ("My Dog" style mnemonics). */
  | { kind: 'initials'; words: readonly string[] }
  /** The notes of a library chord, root first. */
  | { kind: 'chord-tones'; chordId: string; tones: readonly string[] }
  /** Which finger holds which fret on one string of a library chord. */
  | { kind: 'chord-grip'; chordId: string; stringIndex: number; fret: number; finger: number }
  /** Which strings a library chord sounds (the rest are muted). */
  | { kind: 'chord-strings'; chordId: string; strings: readonly number[] }
  /** How many strings a library chord presses (fretted, not open or muted): "one finger", "two fingers". */
  | { kind: 'chord-fingers'; chordId: string; count: number }
  /** The chords built on the 1st, 4th, 5th and 6th notes of a major scale. */
  | { kind: 'key'; root: string; one: string; four: string; five: string; six: string }
  | { kind: 'scale'; root: string; scale: ScaleId; notes: readonly string[] }
  /** Step pattern as W (whole) and H (half), e.g. "WWHWWWH". */
  | { kind: 'scale-steps'; scale: ScaleId; steps: string }
  /** The opening notes of a single-note song, in fixed-do syllables. */
  | { kind: 'melody'; songId: string; solfege: string }
  /** Every bar of a chord-chart song, holds resolved. */
  | { kind: 'song-bars'; songId: string; chords: readonly string[] }
  /** The distinct chords a chord-chart song uses. */
  | { kind: 'song-chords'; songId: string; chords: readonly string[] }
  /** A chord-chart song's time signature, e.g. "3/4". */
  | { kind: 'song-meter'; songId: string; meter: string }
  /** A drill riff's time signature, e.g. "3/4". */
  | { kind: 'riff-meter'; riffId: string; meter: string }
  /** The opening notes of a single-note riff (a drill), in fixed-do syllables. */
  | { kind: 'riff-melody'; riffId: string; solfege: string }
  /** A note in a single-note song's tab: string, fret and length. */
  | { kind: 'song-event'; songId: string; beat: number; stringIndex: number; fret: number; duration: number }
  /** A note in a riff's tab: string, fret and (optionally) length. */
  | { kind: 'riff-event'; riffId: string; beat: number; stringIndex: number; fret: number; duration?: number }
  /** The folk strum pattern in 4/4 has this many down and up strokes. */
  | { kind: 'strum'; downs: number; ups: number }
  /** The beats of the bar (0 = beat 1) on which a strum pattern hits. */
  | { kind: 'strum-beats'; pattern: StrumPattern; beatsInBar: number; beats: readonly number[] }
  /** A note value lasts this many beats ("half", "dotted half", "eighth" ...). */
  | { kind: 'beats'; length: string; beats: number }
  /** This many of a note value fill one bar of 4/4. */
  | { kind: 'fits'; length: string; inBar: number }
  | { kind: 'beat-seconds'; bpm: number; seconds: number }
  /** Short interval name between two spelled pitches, e.g. C4 to G4 is "P5". */
  | { kind: 'interval'; from: string; to: string; is: string }
  /** The check whose question contains `ask` answers with a word that starts with this string's letter. */
  | { kind: 'check-initial'; ask: string; stringIndex: number }
  /** The check whose question contains `ask` has the note at this fret as its answer. */
  | { kind: 'check-note'; ask: string; stringIndex: number; fret: number; flat: boolean }
  /** The check's answer is the string number that holds this open note, e.g. "String 4". */
  | { kind: 'check-string-number'; ask: string; stringIndex: number }
  /**
   * The check's answer says where to find the note that `from` sounds (shifted
   * `octavesUp` octaves) on another string: "5th fret" or "Fret 7 of the D (Re) string".
   */
  | {
      kind: 'check-same-note';
      ask: string;
      from: FretPosition;
      onString: number;
      octavesUp: number;
      format: 'ordinal' | 'string-fret';
    }
  /** The check's answer is the chord's tones, root first, with solfège; `flat` spells them with flats (Bb, not A#). */
  | { kind: 'check-chord-tones'; ask: string; chordId: string; flat: boolean }
  /** The check's answer names the fret where `note` sits on this string. */
  | { kind: 'check-fret'; ask: string; stringIndex: number; note: string }
);

export type LessonFacts = { lesson: string; facts: readonly Fact[] };

/** Builders keep each fact table short enough to read beside its lessons. */
export const fact = {
  note: (stringIndex: number, fret: number, is: string): Fact => ({
    kind: 'note',
    says: `string index ${stringIndex}, fret ${fret} is ${is}`,
    stringIndex,
    fret,
    is,
  }),

  /** `{ 0: 'E', 3: 'G' }` on a string: each fret listed sounds that note. */
  notesOn: (stringIndex: number, notes: Readonly<Record<number, string>>): Fact[] =>
    Object.entries(notes).map(([fret, is]) => fact.note(stringIndex, Number(fret), is)),

  samePitch: (a: FretPosition, b: FretPosition, octavesUp = 0): Fact => ({
    kind: 'same-pitch',
    says: `s${a.stringIndex}f${a.fret} and s${b.stringIndex}f${b.fret} are ${octavesUp} octave(s) apart`,
    a,
    b,
    octavesUp,
  }),

  pitchOrder: (...positions: FretPosition[]): Fact => ({
    kind: 'pitch-order',
    says: `${positions.map((p) => `s${p.stringIndex}f${p.fret}`).join(' < ')} rise in pitch`,
    positions,
  }),

  initials: (...words: string[]): Fact => ({
    kind: 'initials',
    says: `"${words.join(' ')}" spells the open strings`,
    words,
  }),

  semitones: (from: string, to: string, apart: number): Fact => ({
    kind: 'semitones',
    says: `${from} up to ${to} is ${apart} semitone(s)`,
    from,
    to,
    apart,
  }),

  solfege: (letter: string, is: string): Fact => ({ kind: 'solfege', says: `${letter} is ${is}`, letter, is }),

  stringNumber: (stringIndex: number, number: number, open: string): Fact => ({
    kind: 'string-number',
    says: `string ${number} is open ${open}`,
    stringIndex,
    number,
    open,
  }),

  chordTones: (chordId: string, tones: readonly string[]): Fact => ({
    kind: 'chord-tones',
    says: `${chordId} is ${tones.join(' ')}`,
    chordId,
    tones,
  }),

  grip: (chordId: string, stringIndex: number, fret: number, finger: number): Fact => ({
    kind: 'chord-grip',
    says: `${chordId}: finger ${finger} on string index ${stringIndex}, fret ${fret}`,
    chordId,
    stringIndex,
    fret,
    finger,
  }),

  strings: (chordId: string, strings: readonly number[]): Fact => ({
    kind: 'chord-strings',
    says: `${chordId} sounds string indices ${strings.join(',')}`,
    chordId,
    strings,
  }),

  fingers: (chordId: string, count: number): Fact => ({
    kind: 'chord-fingers',
    says: `${chordId} presses ${count} string(s)`,
    chordId,
    count,
  }),

  key: (root: string, one: string, four: string, five: string, six: string): Fact => ({
    kind: 'key',
    says: `key of ${root}: I ${one}, IV ${four}, V ${five}, vi ${six}m`,
    root,
    one,
    four,
    five,
    six,
  }),

  scale: (root: string, scale: ScaleId, notes: readonly string[]): Fact => ({
    kind: 'scale',
    says: `${root} ${scale} is ${notes.join(' ')}`,
    root,
    scale,
    notes,
  }),

  scaleSteps: (scale: ScaleId, steps: string): Fact => ({
    kind: 'scale-steps',
    says: `${scale} steps are ${steps}`,
    scale,
    steps,
  }),

  melody: (songId: string, solfege: string): Fact => ({
    kind: 'melody',
    says: `${songId} opens ${solfege}`,
    songId,
    solfege,
  }),

  songBars: (songId: string, chords: readonly string[]): Fact => ({
    kind: 'song-bars',
    says: `${songId} bars: ${chords.join(' ')}`,
    songId,
    chords,
  }),

  songChords: (songId: string, chords: readonly string[]): Fact => ({
    kind: 'song-chords',
    says: `${songId} uses only ${chords.join(' ')}`,
    songId,
    chords,
  }),

  songMeter: (songId: string, meter: string): Fact => ({
    kind: 'song-meter',
    says: `${songId} is in ${meter}`,
    songId,
    meter,
  }),

  riffMeter: (riffId: string, meter: string): Fact => ({
    kind: 'riff-meter',
    says: `${riffId} is in ${meter}`,
    riffId,
    meter,
  }),

  riffMelody: (riffId: string, solfege: string): Fact => ({
    kind: 'riff-melody',
    says: `${riffId} opens ${solfege}`,
    riffId,
    solfege,
  }),

  songEvent: (songId: string, beat: number, stringIndex: number, fret: number, duration: number): Fact => ({
    kind: 'song-event',
    says: `${songId} beat ${beat}: string index ${stringIndex}, fret ${fret}, ${duration} beat(s)`,
    songId,
    beat,
    stringIndex,
    fret,
    duration,
  }),

  riffEvent: (riffId: string, beat: number, stringIndex: number, fret: number, duration?: number): Fact => ({
    kind: 'riff-event',
    says: `${riffId} beat ${beat}: string index ${stringIndex}, fret ${fret}`,
    riffId,
    beat,
    stringIndex,
    fret,
    ...(duration === undefined ? {} : { duration }),
  }),

  strum: (downs: number, ups: number): Fact => ({
    kind: 'strum',
    says: `folk pattern is ${downs} down and ${ups} up strokes`,
    downs,
    ups,
  }),

  strumBeats: (pattern: StrumPattern, beatsInBar: number, beats: readonly number[]): Fact => ({
    kind: 'strum-beats',
    says: `${pattern} in ${beatsInBar} beats hits at ${beats.join(' ')}`,
    pattern,
    beatsInBar,
    beats,
  }),

  beats: (length: string, beats: number): Fact => ({
    kind: 'beats',
    says: `a ${length} note is ${beats} beat(s)`,
    length,
    beats,
  }),

  fits: (length: string, inBar: number): Fact => ({
    kind: 'fits',
    says: `${inBar} ${length} notes fill a bar of 4/4`,
    length,
    inBar,
  }),

  beatSeconds: (bpm: number, seconds: number): Fact => ({
    kind: 'beat-seconds',
    says: `a beat at ${bpm} bpm lasts ${seconds}s`,
    bpm,
    seconds,
  }),

  interval: (from: string, to: string, is: string): Fact => ({
    kind: 'interval',
    says: `${from} to ${to} is ${is}`,
    from,
    to,
    is,
  }),

  checkInitial: (ask: string, stringIndex: number): Fact => ({
    kind: 'check-initial',
    says: `check "${ask}" answers a word starting with string index ${stringIndex}'s letter`,
    ask,
    stringIndex,
  }),

  checkNote: (ask: string, stringIndex: number, fret: number, flat = false): Fact => ({
    kind: 'check-note',
    says: `check "${ask}" answers the note at s${stringIndex} f${fret}`,
    ask,
    stringIndex,
    fret,
    flat,
  }),

  checkStringNumber: (ask: string, stringIndex: number): Fact => ({
    kind: 'check-string-number',
    says: `check "${ask}" answers the string number of index ${stringIndex}`,
    ask,
    stringIndex,
  }),

  checkSameNote: (
    ask: string,
    from: FretPosition,
    onString: number,
    octavesUp: number,
    format: 'ordinal' | 'string-fret',
  ): Fact => ({
    kind: 'check-same-note',
    says: `check "${ask}" answers where s${from.stringIndex}f${from.fret} (+${octavesUp} oct) is on s${onString}`,
    ask,
    from,
    onString,
    octavesUp,
    format,
  }),

  checkChordTones: (ask: string, chordId: string, flat = false): Fact => ({
    kind: 'check-chord-tones',
    says: `check "${ask}" answers the tones of ${chordId}`,
    ask,
    chordId,
    flat,
  }),

  checkFret: (ask: string, stringIndex: number, note: string): Fact => ({
    kind: 'check-fret',
    says: `check "${ask}" answers the fret of ${note} on s${stringIndex}`,
    ask,
    stringIndex,
    note,
  }),
};
