import { describe, expect, it, vi } from 'vitest';
import {
  BEND_MAX_SECONDS,
  PALM_MUTE_SECONDS,
  RingingNotes,
  SLIDE_SECONDS,
  nearestSample,
  noteEnd,
  noteShape,
  semitonesToRate,
  shouldChoke,
  type RingingNote,
} from './playback';

describe('nearestSample', () => {
  it('picks the closest recording and says how far to pitch it', () => {
    // E2, A2, D3
    const samples = [40, 45, 50];
    expect(nearestSample(40, samples)).toEqual({ sampleMidi: 40, semitones: 0 });
    expect(nearestSample(42, samples)).toEqual({ sampleMidi: 40, semitones: 2 });
    expect(nearestSample(43, samples)).toEqual({ sampleMidi: 45, semitones: -2 });
    expect(nearestSample(52, samples)).toEqual({ sampleMidi: 50, semitones: 2 });
  });

  it('stretches a note below or above the whole set from the nearest end', () => {
    const samples = [40, 45];
    expect(nearestSample(36, samples)).toEqual({ sampleMidi: 40, semitones: -4 });
    expect(nearestSample(60, samples)).toEqual({ sampleMidi: 45, semitones: 15 });
  });

  it('breaks a tie towards the higher recording, pitching it down', () => {
    expect(nearestSample(42.5, [40, 45])).toEqual({ sampleMidi: 45, semitones: -2.5 });
    expect(nearestSample(43, [41, 45])).toEqual({ sampleMidi: 45, semitones: -2 });
  });

  it('is independent of the order the recordings are listed in', () => {
    expect(nearestSample(43, [45, 41])).toEqual(nearestSample(43, [41, 45]));
  });

  it('returns nothing when there are no recordings', () => {
    expect(nearestSample(40, [])).toBeUndefined();
  });
});

describe('semitonesToRate', () => {
  it('is 1 at no shift, doubles an octave up and halves an octave down', () => {
    expect(semitonesToRate(0)).toBe(1);
    expect(semitonesToRate(12)).toBeCloseTo(2);
    expect(semitonesToRate(-12)).toBeCloseTo(0.5);
  });
});

describe('noteShape', () => {
  it('leaves a plain note exactly as asked, letting it ring when no length is given', () => {
    expect(noteShape({ velocity: 0.8 })).toEqual({ velocity: 0.8, duration: undefined, glide: undefined });
    expect(noteShape({ velocity: 0.8, duration: 1.5 }).duration).toBe(1.5);
  });

  it('plays a hammer-on and a pull-off at 0.6 of the level, with no pick behind them', () => {
    expect(noteShape({ velocity: 0.8, technique: 'hammer' }).velocity).toBeCloseTo(0.48);
    expect(noteShape({ velocity: 0.8, technique: 'pull' }).velocity).toBeCloseTo(0.48);
    expect(noteShape({ velocity: 0.8, technique: 'hammer', duration: 1 }).duration).toBe(1);
  });

  it('mutes a palm-muted note: 0.8 of the level, cut off after at most 0.12s', () => {
    const muted = noteShape({ velocity: 0.8, duration: 2, technique: 'palmMute' });
    expect(muted.velocity).toBeCloseTo(0.64);
    expect(muted.duration).toBe(PALM_MUTE_SECONDS);
    expect(PALM_MUTE_SECONDS).toBe(0.12);
  });

  it('never makes a palm mute longer than the note was written', () => {
    expect(noteShape({ velocity: 0.8, duration: 0.05, technique: 'palmMute' }).duration).toBe(0.05);
  });

  it('cuts a palm mute short even when the caller gave no length', () => {
    expect(noteShape({ velocity: 0.8, technique: 'palmMute' }).duration).toBe(PALM_MUTE_SECONDS);
  });

  it('slides in from two semitones below over 0.07s', () => {
    const slid = noteShape({ velocity: 0.8, technique: 'slide' });
    expect(slid.glide).toEqual({ from: -2, to: 0, delay: 0, over: SLIDE_SECONDS });
    expect(SLIDE_SECONDS).toBe(0.07);
    expect(slid.velocity).toBe(0.8);
  });

  it('bends from the fretted pitch up a whole step, starting 0.03s in', () => {
    const bent = noteShape({ velocity: 0.8, duration: 2, technique: 'bend' });
    expect(bent.glide).toEqual({ from: 0, to: 2, delay: 0.03, over: BEND_MAX_SECONDS });
    expect(BEND_MAX_SECONDS).toBe(0.18);
  });

  it('takes the bend no longer than 0.3 of a short note', () => {
    const bent = noteShape({ velocity: 0.8, duration: 0.4, technique: 'bend' });
    expect(bent.glide?.over).toBeCloseTo(0.12);
  });

  it('bends over the full 0.18s when the note has no stated length', () => {
    expect(noteShape({ velocity: 0.8, technique: 'bend' }).glide?.over).toBe(0.18);
  });

  it('never asks for more than full level', () => {
    expect(noteShape({ velocity: 1.4 }).velocity).toBe(1);
  });
});

describe('noteEnd', () => {
  it('lets a note without a length ring for as long as its recording lasts', () => {
    expect(noteEnd(10, undefined, 4, 1)).toEqual({ end: 14, cutShort: false });
  });

  it('shortens the recording when it is played faster', () => {
    expect(noteEnd(10, undefined, 4, 2)).toEqual({ end: 12, cutShort: false });
  });

  it('cuts a note short at its stated length', () => {
    expect(noteEnd(10, 1.5, 4, 1)).toEqual({ end: 11.5, cutShort: true });
  });

  it('does not schedule a stop for a length longer than the recording', () => {
    // A stop after the natural end would only land on an already-ended source.
    expect(noteEnd(10, 6, 4, 1)).toEqual({ end: 14, cutShort: false });
  });
});

describe('shouldChoke', () => {
  it('stops a note that is still ringing when the next one starts', () => {
    expect(shouldChoke(12, 11)).toBe(true);
  });

  it('leaves a note that already ended alone', () => {
    // OneShotSource.stop cancels the stop it already had scheduled, so
    // stopping an ended note would stretch it out to the new start.
    expect(shouldChoke(10, 11)).toBe(false);
  });

  it('leaves a note that ends exactly as the next begins', () => {
    expect(shouldChoke(11, 11)).toBe(false);
  });
});

describe('RingingNotes', () => {
  function note(end: number) {
    return { end, stop: vi.fn<(time: number) => void>() } satisfies RingingNote;
  }

  it('stops what a string was ringing when it is picked again', () => {
    const ringing = new RingingNotes<ReturnType<typeof note>>();
    const first = note(14);
    ringing.pick(first, 2, 10);
    ringing.pick(note(15), 2, 11);
    expect(first.stop).toHaveBeenCalledExactlyOnceWith(11);
  });

  it('leaves the other strings ringing', () => {
    const ringing = new RingingNotes<ReturnType<typeof note>>();
    const low = note(14);
    const high = note(14);
    ringing.pick(low, 0, 10);
    ringing.pick(high, 5, 10.01);
    ringing.pick(note(15), 3, 11);
    expect(low.stop).not.toHaveBeenCalled();
    expect(high.stop).not.toHaveBeenCalled();
  });

  it('does not stop a note on the string that has already ended', () => {
    const ringing = new RingingNotes<ReturnType<typeof note>>();
    const first = note(10.5);
    ringing.pick(first, 1, 10);
    ringing.pick(note(13), 1, 11);
    expect(first.stop).not.toHaveBeenCalled();
  });

  it('only ever chokes the most recent note on a string', () => {
    const ringing = new RingingNotes<ReturnType<typeof note>>();
    const first = note(20);
    const second = note(20);
    ringing.pick(first, 1, 10);
    ringing.pick(second, 1, 11);
    ringing.pick(note(20), 1, 12);
    expect(first.stop).toHaveBeenCalledTimes(1);
    expect(second.stop).toHaveBeenCalledExactlyOnceWith(12);
  });

  it('never chokes notes that name no string', () => {
    const ringing = new RingingNotes<ReturnType<typeof note>>();
    const a = note(20);
    ringing.pick(a, undefined, 10);
    ringing.pick(note(20), undefined, 11);
    ringing.pick(note(20), 99, 12);
    expect(a.stop).not.toHaveBeenCalled();
  });

  it('forgets a note that ended, so a later pick leaves it alone', () => {
    const ringing = new RingingNotes<ReturnType<typeof note>>();
    const first = note(30);
    ringing.pick(first, 4, 10);
    ringing.forget(first);
    ringing.pick(note(30), 4, 11);
    expect(first.stop).not.toHaveBeenCalled();
  });

  it('stops everything still ringing, loose notes included, but not what is over', () => {
    const ringing = new RingingNotes<ReturnType<typeof note>>();
    const onString = note(20);
    const loose = note(20);
    const over = note(10.5);
    ringing.pick(onString, 0, 10);
    ringing.pick(loose, undefined, 10);
    ringing.pick(over, 3, 10);
    ringing.stopAll(11);
    expect(onString.stop).toHaveBeenCalledExactlyOnceWith(11);
    expect(loose.stop).toHaveBeenCalledExactlyOnceWith(11);
    expect(over.stop).not.toHaveBeenCalled();
  });

  it('has nothing left to stop after stopAll', () => {
    const ringing = new RingingNotes<ReturnType<typeof note>>();
    const first = note(20);
    ringing.pick(first, 0, 10);
    ringing.stopAll(11);
    ringing.stopAll(12);
    expect(first.stop).toHaveBeenCalledTimes(1);
  });
});
