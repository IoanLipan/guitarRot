import { describe, expect, it } from 'vitest';

describe('toolchain', () => {
  it('runs typescript through vitest', () => {
    const doubled: number[] = [1, 2, 3].map((n) => n * 2);
    expect(doubled).toEqual([2, 4, 6]);
  });
});
