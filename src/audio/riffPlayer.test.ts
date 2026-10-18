import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Riff } from '@/content';
import { createRiffPlayer } from './riffPlayer';
import type { AudioEngine } from './types';

// Only the scheduling callback matters here: the Part is replaced by a
// recorder so the test can fire a scheduled note by hand.
const fake = vi.hoisted(() => ({
  callback: undefined as ((time: number, note: unknown) => void) | undefined,
  notes: [] as unknown[],
}));

vi.mock('tone', () => {
  class Part {
    loop = false;
    loopStart: unknown = 0;
    loopEnd: unknown = 0;
    constructor(callback: (time: number, note: unknown) => void, notes: unknown[]) {
      fake.callback = callback;
      fake.notes = notes;
    }
    start = vi.fn();
    stop = vi.fn();
    dispose = vi.fn();
  }
  const transport = {
    bpm: { value: 120 },
    stop: vi.fn(),
    start: vi.fn(),
    cancel: vi.fn(),
    position: 0,
    loop: false,
    loopStart: 0,
    loopEnd: 0,
    progress: 0,
  };
  return { Part, getTransport: () => transport, Time: () => ({ toSeconds: () => 0 }) };
});

const riff: Riff = {
  id: 'technique-test',
  title: 'Technique test',
  style: 'Test',
  level: 1,
  bpm: 120,
  timeSignature: [4, 4],
  bars: 1,
  tags: [],
  source: 'original',
  events: [
    { stringIndex: 3, fret: 0, beat: 0, duration: 1 },
    { stringIndex: 3, fret: 2, beat: 1, duration: 1, technique: 'hammer' },
    { stringIndex: 4, fret: 5, beat: 2, duration: 2, technique: 'bend' },
  ],
};

function fakeEngine() {
  const playNote = vi.fn();
  const engine = { playNote } as unknown as AudioEngine;
  return { engine, playNote };
}

beforeEach(() => {
  fake.callback = undefined;
  fake.notes = [];
});

describe('createRiffPlayer', () => {
  it('hands the engine the string and technique of every note it plays', () => {
    const { engine, playNote } = fakeEngine();
    createRiffPlayer(riff, engine);

    for (const note of fake.notes) fake.callback?.(7, note);

    expect(playNote.mock.calls.map(([, opts]) => [opts.stringIndex, opts.technique])).toEqual([
      [3, undefined],
      [3, 'hammer'],
      [4, 'bend'],
    ]);
  });

  it('sends each note\'s length in seconds, from the tempo', () => {
    const { engine, playNote } = fakeEngine();
    createRiffPlayer(riff, engine);
    const bend = fake.notes[2];
    fake.callback?.(7, bend);
    // 2 beats at 120 bpm.
    expect(playNote.mock.calls[0]?.[1].duration).toBeCloseTo(1);
    expect(playNote.mock.calls[0]?.[1].time).toBe(7);
  });
});
