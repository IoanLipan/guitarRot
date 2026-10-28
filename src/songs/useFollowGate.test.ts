import { describe, expect, it } from 'vitest';
import { FOLLOW_RESUME_MS, createFollowGate } from './useFollowGate';

function setup() {
  let clock = 1000;
  const gate = createFollowGate(() => clock);
  const element = document.createElement('div');
  document.body.append(element);
  gate.attach(element);
  return {
    gate,
    element,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

describe('createFollowGate', () => {
  it('lets the playhead drive the scroller until someone touches it', () => {
    const { gate } = setup();
    expect(gate.check()).toBe('free');
    expect(gate.check()).toBe('free');
  });

  it('stays out of the way for as long as a finger is down, however long', () => {
    const { gate, element, advance } = setup();
    element.dispatchEvent(new Event('touchstart'));
    expect(gate.check()).toBe('blocked');
    advance(60_000);
    expect(gate.check()).toBe('blocked');
  });

  it('waits about three seconds after the finger lifts, then says it has resumed, once', () => {
    const { gate, element, advance } = setup();
    expect(FOLLOW_RESUME_MS).toBe(3000);

    element.dispatchEvent(new Event('touchstart'));
    element.dispatchEvent(new Event('touchend'));
    expect(gate.check()).toBe('blocked');

    advance(2900);
    expect(gate.check()).toBe('blocked');

    advance(200);
    expect(gate.check()).toBe('resumed');
    expect(gate.check()).toBe('free');
  });

  it('treats a cancelled touch like a lifted one', () => {
    const { gate, element, advance } = setup();
    element.dispatchEvent(new Event('touchstart'));
    element.dispatchEvent(new Event('touchcancel'));
    advance(3001);
    expect(gate.check()).toBe('resumed');
  });

  it('holds off while a wheel is spinning over the scroller, and for three seconds after', () => {
    const { gate, element, advance } = setup();
    element.dispatchEvent(new Event('wheel'));
    advance(1000);
    element.dispatchEvent(new Event('wheel'));
    advance(2500);
    expect(gate.check()).toBe('blocked');
    advance(600);
    expect(gate.check()).toBe('resumed');
  });

  it('holds off during a mouse drag, until the button is up', () => {
    const { gate, element, advance } = setup();
    const down = new Event('pointerdown');
    Object.defineProperty(down, 'pointerType', { value: 'mouse' });
    element.dispatchEvent(down);
    advance(10_000);
    expect(gate.check()).toBe('blocked');

    window.dispatchEvent(new Event('pointerup'));
    advance(3001);
    expect(gate.check()).toBe('resumed');
  });

  it('ignores a touch pointer: the touch events already speak for it', () => {
    // The browser cancels a touch pointer when it takes the gesture over to
    // pan, so reading it would end the hold in the middle of the drag.
    const { gate, element } = setup();
    const down = new Event('pointerdown');
    Object.defineProperty(down, 'pointerType', { value: 'touch' });
    element.dispatchEvent(down);
    expect(gate.check()).toBe('free');
  });

  it('stops listening once the scroller is detached', () => {
    const { gate, element } = setup();
    gate.attach(null);
    element.dispatchEvent(new Event('touchstart'));
    expect(gate.check()).toBe('free');
  });

  it('moves to a new scroller when the old one is swapped out', () => {
    const { gate, element } = setup();
    const next = document.createElement('div');
    gate.attach(next);

    element.dispatchEvent(new Event('touchstart'));
    expect(gate.check()).toBe('free');
    next.dispatchEvent(new Event('touchstart'));
    expect(gate.check()).toBe('blocked');
  });
});
