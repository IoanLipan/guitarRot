import type { IllustrationSet } from './registry';
import { AlphabetLoop } from './a/AlphabetLoop';
import { ChordNotes } from './a/ChordNotes';
import { ChordSymbols } from './a/ChordSymbols';
import { FingerNumbers } from './a/FingerNumbers';
import { FretFinger } from './a/FretFinger';
import { GuitarParts } from './a/GuitarParts';
import { OctaveShape } from './a/OctaveShape';
import { PianoHalfSteps } from './a/PianoHalfSteps';
import { PickGrip } from './a/PickGrip';
import { Posture } from './a/Posture';
import { SharpFlat } from './a/SharpFlat';
import { ShapeMove } from './a/ShapeMove';
import { StringOrder } from './a/StringOrder';
import { TabMap } from './a/TabMap';
import { TuningPeg } from './a/TuningPeg';

/** Illustrations of group "a" in src/content/illustrations.ts. */
export const ILLUSTRATIONS_A: IllustrationSet = {
  'guitar-parts': GuitarParts,
  'string-order': StringOrder,
  posture: Posture,
  'tuning-peg': TuningPeg,
  'tab-map': TabMap,
  'pick-grip': PickGrip,
  'fret-finger': FretFinger,
  'finger-numbers': FingerNumbers,
  'alphabet-loop': AlphabetLoop,
  'piano-half-steps': PianoHalfSteps,
  'sharp-flat': SharpFlat,
  'octave-shape': OctaveShape,
  'chord-notes': ChordNotes,
  'chord-symbols': ChordSymbols,
  'shape-move': ShapeMove,
};
