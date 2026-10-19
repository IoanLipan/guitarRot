import { describe, expect, it } from 'vitest';
import { validateLesson } from '@/content';
import main from '../main.tsx?raw';
import { galleryMode } from './galleryGuard';
import { DEMO_LESSON, SAMPLE_CHECKS, SAMPLES } from './samples';

describe('galleryMode', () => {
  it('opens the gallery on ?gallery in a dev build', () => {
    expect(galleryMode('?gallery', true)).toBe('all');
    expect(galleryMode('?gallery=1', true)).toBe('all');
    expect(galleryMode('?x=1&gallery', true)).toBe('all');
  });

  it('opens the demo lesson on ?gallery=lesson', () => {
    expect(galleryMode('?gallery=lesson', true)).toBe('lesson');
  });

  it('is not reachable in a production build, whatever the URL says', () => {
    expect(galleryMode('?gallery', false)).toBeNull();
    expect(galleryMode('?gallery=lesson', false)).toBeNull();
    expect(galleryMode('?gallery&step=3', false)).toBeNull();
  });

  it('leaves the app alone when the URL does not ask', () => {
    expect(galleryMode('', true)).toBeNull();
    expect(galleryMode('?p=riff:blues-shuffle-e', true)).toBeNull();
    expect(galleryMode('?galleryx', true)).toBeNull();
  });
});

describe('src/main.tsx', () => {
  it('imports the gallery only inside an import.meta.env.DEV block, so a production build drops it', () => {
    const imports = [...main.matchAll(/import\(['"]\.\/dev\/Gallery['"]\)/g)];
    expect(imports).toHaveLength(1);
    const guard = main.indexOf('if (import.meta.env.DEV)');
    expect(guard).toBeGreaterThan(-1);
    expect(imports[0]?.index).toBeGreaterThan(guard);
    // And never as a static import at the top, which would ship it.
    expect(main).not.toMatch(/^import .* from ['"]\.\/dev\/Gallery/m);
  });

  it('asks the guard with the build\'s own DEV flag', () => {
    expect(main).toContain('galleryMode(window.location.search, import.meta.env.DEV)');
  });
});

describe('the gallery samples', () => {
  it('follow the same rules as the real course', () => {
    expect(validateLesson(DEMO_LESSON)).toEqual([]);
  });

  it('cover every kind of visual, and both callouts', () => {
    const kinds = new Set(SAMPLES.map((sample) => sample.step.visual.kind));
    expect([...kinds].sort()).toEqual(['chords', 'illustration', 'neck', 'notes']);
    expect(SAMPLES.some((sample) => sample.step.tip !== undefined)).toBe(true);
    expect(SAMPLES.some((sample) => sample.step.warn !== undefined)).toBe(true);
  });

  it('include a check step', () => {
    expect(SAMPLE_CHECKS.length).toBeGreaterThan(0);
  });
});
