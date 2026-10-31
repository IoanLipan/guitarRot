import type { Lesson } from '../../lessons';
import { UKE_UNIT_1 } from './unit1';
import { UKE_UNIT_2 } from './unit2';
import { UKE_UNIT_3 } from './unit3';
import { UKE_UNIT_4 } from './unit4';

/** The ukulele course's units, in teaching order. */
export const UKE_UNITS: readonly (readonly Lesson[])[] = [UKE_UNIT_1, UKE_UNIT_2, UKE_UNIT_3, UKE_UNIT_4];
