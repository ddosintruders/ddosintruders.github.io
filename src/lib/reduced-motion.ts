/**
 * The single source of truth for motion preference.
 *
 * Every animated component branches on this rather than checking the media query
 * itself, so there is exactly one definition of "should this move?" in the
 * codebase. The CSS backstop in theme.css catches anything that slips through,
 * but JS-driven timelines must never *start* — killing them after the fact still
 * costs a frame of movement.
 */

const QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/**
 * Subscribe to changes. Users can toggle this at OS level mid-session, and a
 * portfolio that keeps flinging things around after they asked it to stop is
 * exactly the failure this guards against.
 *
 * Returns an unsubscribe function.
 */
export function onReducedMotionChange(
  handler: (reduced: boolean) => void,
): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};

  const mql = window.matchMedia(QUERY);
  const listener = (event: MediaQueryListEvent) => handler(event.matches);
  mql.addEventListener('change', listener);
  return () => mql.removeEventListener('change', listener);
}

/**
 * Coarse pointers (touch) get no custom cursor, no tilt, no hover-scrub.
 * Checked separately from motion preference because they are different concerns:
 * a phone user who allows motion still has no pointer to track.
 */
export function hasFinePointer(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(pointer: fine)').matches;
}
