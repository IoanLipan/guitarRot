import { describe, expect, it } from 'vitest';
import { beatsToTransportTime, riffLoopEnd, riffToScheduledNotes, speedToBpm } from './timing';
import { beatsPerBar, getRiff, type Riff } from '@/content';
import { STANDARD_TUNING, fretToMidi } from '@/music';

describe('beatsToTransportTime', () => {
  it('puts the downbeat at the origin', () => {
    expect(beatsToTransportTime(0)).toBe('0:0:0');
  });

  it('counts whole beats within the first bar', () => {
    expect(beatsToTransportTime(2)).toBe('0:2:0');
  });

  it('converts a half beat to two sixteenths', () => {
    expect(beatsToTransportTime(2.5)).toBe('0:2:2');
  });

  it('keeps counting beats past a nominal bar length instead of wrapping into a new bar', () => {
    // Bar is always pinned at 0 -- see the doc comment on beatsToTransportTime.
    // Tone's own "tr" parser only multiplies by Transport.timeSignature when
    // the bars component is non-zero, so wrapping into higher bar numbers
    // here would make the string's meaning depend on a value (Transport's
    // global timeSignature, which defaults to 4 and is never set by this
    // app) that has nothing to do with the riff's actual time signature.
    expect(beatsToTransportTime(4)).toBe('0:4:0');
  });

  it('handles a fractional beat past the first bar', () => {
    expect(beatsToTransportTime(5.5)).toBe('0:5:2');
  });

  it('converts a quarter beat to one sixteenth', () => {
    expect(beatsToTransportTime(0.25)).toBe('0:0:1');
  });
});

describe('riffLoopEnd', () => {
  const threeFourRiff: Riff = {
    id: 'test-3-4',
    title: 'Test 3/4',
    style: 'test',
    level: 1,
    bpm: 120,
    timeSignature: [3, 4],
    bars: 2,
    events: [],
    tags: [],
    source: 'original',
  };

  it('carries the full beat count of a non-4/4 riff without wrapping into bars', () => {
    // 2 bars of 3/4 = 6 quarter-note beats.
    expect(riffLoopEnd(threeFourRiff)).toBe('0:6:0');
  });

  it('round-trips the beat count through Tone\'s own bars:beats:sixteenths formula regardless of time signature', () => {
    // 3 bars of 3/4 = 9 quarter-note beats -- more beats than a 4/4 bar
    // would nominally hold, which is exactly the case the old
    // perBar-relative encoding got wrong.
    const totalBeats = 3 * beatsPerBar([3, 4]);
    const transportTime = beatsToTransportTime(totalBeats);
    expect(transportTime).toBe('0:9:0');

    // Replicates Tone's "tr" expression (TimeBase.js) directly, so this
    // assertion fails if that parsing behavior is ever misremembered: with
    // bars pinned at "0" that term is skipped outright, so the beats
    // component alone must carry the correct number of seconds.
    const bpm = 120;
    const parts = transportTime.split(':');
    const bars = parts[0] ?? '0';
    const beats = parts[1] ?? '0';
    const sixteenths = parts[2] ?? '0';
    const seconds =
      (bars !== '0' ? (60 / bpm) * 4 * Number(bars) : 0) +
      (60 / bpm) * Number(beats) +
      (60 / bpm) * (Number(sixteenths) / 4);
    expect(seconds).toBeCloseTo((60 / bpm) * totalBeats);
  });
});

describe('speedToBpm', () => {
  it('leaves the tempo alone at full speed', () => {
    expect(speedToBpm(120, 1)).toBe(120);
  });

  it('halves the tempo at half speed', () => {
    expect(speedToBpm(120, 0.5)).toBe(60);
  });

  it('clamps absurdly slow requests', () => {
    expect(speedToBpm(120, 0.01)).toBe(speedToBpm(120, 0.25));
  });

  it('clamps absurdly fast requests', () => {
    expect(speedToBpm(120, 9)).toBe(speedToBpm(120, 1.5));
  });
});

describe('riffToScheduledNotes', () => {
  const riff = getRiff('em-pentatonic-box1');
  if (riff === undefined) throw new Error('seed riff missing');

  it('schedules every event', () => {
    expect(riffToScheduledNotes(riff)).toHaveLength(riff.events.length);
  });

  it('resolves each event to the pitch that fret actually sounds', () => {
    const scheduled = riffToScheduledNotes(riff);
    riff.events.forEach((event, i) => {
      const note = scheduled[i];
      expect(note).toBeDefined();
      if (note === undefined) return;
      expect(note.midi).toBe(fretToMidi(STANDARD_TUNING, event.stringIndex, event.fret));
      expect(note.stringIndex).toBe(event.stringIndex);
    });
  });

  it('places the first note at the origin', () => {
    expect(riffToScheduledNotes(riff)[0]?.time).toBe('0:0:0');
  });

  it('keeps durations in beats so tempo changes stay correct', () => {
    const scheduled = riffToScheduledNotes(riff);
    riff.events.forEach((event, i) => {
      expect(scheduled[i]?.durationBeats).toBe(event.duration);
    });
  });
});
