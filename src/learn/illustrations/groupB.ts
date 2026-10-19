import { Barre } from './b/Barre';
import { BeatsBar } from './b/BeatsBar';
import { ChangeEarly } from './b/ChangeEarly';
import { HammerPull } from './b/HammerPull';
import { KeyFamily } from './b/KeyFamily';
import { LeapVsStep } from './b/LeapVsStep';
import { NoteLengths } from './b/NoteLengths';
import { PowerChord } from './b/PowerChord';
import { PracticePlan } from './b/PracticePlan';
import { ScaleStaircase } from './b/ScaleStaircase';
import { SlideBend } from './b/SlideBend';
import { SlowLoop } from './b/SlowLoop';
import { StrumPattern } from './b/StrumPattern';
import { TunerNeedle } from './b/TunerNeedle';
import { TwelveBar } from './b/TwelveBar';
import type { IllustrationSet } from './registry';

/** Illustrations of group "b" in src/content/illustrations.ts. */
export const ILLUSTRATIONS_B: IllustrationSet = {
  'beats-bar': BeatsBar,
  'strum-pattern': StrumPattern,
  'change-early': ChangeEarly,
  'scale-staircase': ScaleStaircase,
  'leap-vs-step': LeapVsStep,
  'note-lengths': NoteLengths,
  'power-chord': PowerChord,
  'key-family': KeyFamily,
  'twelve-bar': TwelveBar,
  'hammer-pull': HammerPull,
  'slide-bend': SlideBend,
  barre: Barre,
  'practice-plan': PracticePlan,
  'slow-loop': SlowLoop,
  'tuner-needle': TunerNeedle,
};
