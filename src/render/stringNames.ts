import { GUITAR } from '@/music';

/**
 * The guitar's six strings as the tab writes them, low to high: E A D G B e.
 * Index matches `stringIndex`. Other instruments name theirs on the
 * instrument itself (`Instrument.stringNames`, ukulele: G C E A), and the
 * boards that draw names take them from there; this stays for the guitar-only
 * callers and tests.
 */
export const STRING_NAMES = GUITAR.stringNames;
