/** Which dev-only gallery page the URL asks for. */
export type GalleryMode =
  /** `?gallery`: every illustration and sample card on one scrolling page. */
  | 'all'
  /** `?gallery=lesson`: a demo lesson in the real lesson shell, full screen. */
  | 'lesson';

/**
 * Decides whether the visual-review gallery replaces the app. It only ever
 * can in a dev build: `dev` is `import.meta.env.DEV`, which a production
 * build turns into `false`, so the same URL on a shipped app is just the app.
 * (src/main.tsx also keeps the import itself inside an `import.meta.env.DEV`
 * block, so the gallery's code is stripped from the bundle, not merely unreachable.)
 */
export function galleryMode(search: string, dev: boolean): GalleryMode | null {
  if (!dev) return null;
  const params = new URLSearchParams(search);
  if (!params.has('gallery')) return null;
  return params.get('gallery') === 'lesson' ? 'lesson' : 'all';
}
