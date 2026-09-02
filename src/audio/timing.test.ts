import { describe, expect, it } from 'vitest';
import { beatsToTransportTime, riffToScheduledNotes, speedToBpm } from './timing';
import { getRiff } from '@/content';
import { STANDARD_TUNING, fretToMidi } from '@/music';

describe('beatsToTransportTime', () => {
  it('puts the downbeat at the origin', () => {
    expect(beatsToTransportTime(0, 4)).toBe('0:0:0');
  });

  it('counts whole beats within the first bar', () => {
    expect(beatsToTransportTime(2, 4)).toBe('0:2:0');
  });

  it('converts a half beat to two sixteenths', () => {
    expect(beatsToTransportTime(2.5, 4)).toBe('0:2:2');
  });

  it('rolls over into the next bar', () => {
    expect(beatsToTransportTime(4, 4)).toBe('1:0:0');
  });

  it('handles a fractional beat in a later bar', () => {
    expect(beatsToTransportTime(5.5, 4)).toBe('1:1:2');
  });

  it('respects a three-four bar length', () => {
    expect(beatsToTransportTime(4, 3)).toBe('1:1:0');
  });

  it('converts a quarter beat to one sixteenth', () => {
    expect(beatsToTransportTime(0.25, 4)).toBe('0:0:1');
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
