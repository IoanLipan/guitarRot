import type { IllustrationSet } from './registry';
import { UkeBarre } from './c/UkeBarre';
import { UkeBells } from './c/UkeBells';
import { UkeChordBox } from './c/UkeChordBox';
import { UkeChunk } from './c/UkeChunk';
import { UkeFingerpicking } from './c/UkeFingerpicking';
import { UkeHolding } from './c/UkeHolding';
import { UkeIslandStrum } from './c/UkeIslandStrum';
import { UkeParts } from './c/UkeParts';
import { UkeReentrant } from './c/UkeReentrant';
import { UkeShapeMove } from './c/UkeShapeMove';
import { UkeStrumHand } from './c/UkeStrumHand';
import { UkeStringOrder } from './c/UkeStringOrder';
import { UkeTabMap } from './c/UkeTabMap';
import { UkeTuningPeg } from './c/UkeTuningPeg';
import { UkeWaltz } from './c/UkeWaltz';

/** Illustrations of group "c" in src/content/illustrations.ts: the ukulele course's own pictures. */
export const ILLUSTRATIONS_C: IllustrationSet = {
  'uke-parts': UkeParts,
  'uke-holding': UkeHolding,
  'uke-strum-hand': UkeStrumHand,
  'uke-string-order': UkeStringOrder,
  'uke-reentrant': UkeReentrant,
  'uke-tuning-peg': UkeTuningPeg,
  'uke-chord-box': UkeChordBox,
  'uke-shape-move': UkeShapeMove,
  'uke-island-strum': UkeIslandStrum,
  'uke-chunk': UkeChunk,
  'uke-waltz': UkeWaltz,
  'uke-tab-map': UkeTabMap,
  'uke-fingerpicking': UkeFingerpicking,
  'uke-bells': UkeBells,
  'uke-barre': UkeBarre,
};
