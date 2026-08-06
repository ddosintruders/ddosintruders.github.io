import { gsap } from './scroll';
import { hasFinePointer, prefersReducedMotion } from './reduced-motion';

/**
 * Pointer-driven flourishes.
 *
 * All three require a fine pointer AND allowed motion. On touch these do nothing
 * at all rather than degrading into something that fires on tap — a tilt that
 * triggers on touch just makes the card feel broken.
 */

function enabled(): boolean {
  return hasFinePointer() && !prefersReducedMotion();
}

/** Buttons that lean toward the cursor within a capture radius. */
export function initMagnetic(): void {
  if (!enabled()) return;

  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const strength = Number(el.dataset.magnetic || 0.35);
    const inner = el.querySelector<HTMLElement>('[data-magnetic-inner]') ?? el;

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = event.clientX - (rect.left + rect.width / 2);
      const y = event.clientY - (rect.top + rect.height / 2);
      gsap.to(inner, {
        x: x * strength,
        y: y * strength,
        duration: 0.7,
        ease: 'power3.out',
      });
    };

    const onLeave = () => {
      gsap.to(inner, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' });
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
  });
}

/**
 * Border spotlight. Writes pointer position into CSS custom properties and lets
 * CSS do the drawing — cheaper than animating a pseudo-element from JS, and it
 * keeps the visual definition in the stylesheet where it belongs.
 */
export function initSpotlight(): void {
  if (!enabled()) return;

  document.querySelectorAll<HTMLElement>('[data-spotlight]').forEach((el) => {
    el.addEventListener(
      'pointermove',
      (event) => {
        const rect = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${event.clientX - rect.left}px`);
        el.style.setProperty('--my', `${event.clientY - rect.top}px`);
        el.style.setProperty('--spot', '1');
      },
      { passive: true },
    );

    el.addEventListener('pointerleave', () => {
      el.style.setProperty('--spot', '0');
    });
  });
}

/** Subtle 3D tilt for archive cards. Kept shallow — big tilts read as a gimmick. */
export function initTilt(): void {
  if (!enabled()) return;

  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
    const max = Number(el.dataset.tilt || 6);

    el.addEventListener(
      'pointermove',
      (event) => {
        const rect = el.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        gsap.to(el, {
          rotateY: px * max * 2,
          rotateX: -py * max * 2,
          transformPerspective: 900,
          duration: 0.5,
          ease: 'power2.out',
        });
      },
      { passive: true },
    );

    el.addEventListener('pointerleave', () => {
      gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.8, ease: 'power3.out' });
    });
  });
}

/**
 * Hover-scrub: swaps through a project's shots as the pointer travels across
 * the card horizontally, so one card previews a whole set without a lightbox.
 */
export function initHoverScrub(): void {
  if (!enabled()) return;

  document.querySelectorAll<HTMLElement>('[data-scrub]').forEach((el) => {
    const frames = Array.from(el.querySelectorAll<HTMLElement>('[data-scrub-frame]'));
    if (frames.length < 2) return;

    const show = (index: number) => {
      frames.forEach((frame, i) => {
        frame.style.opacity = i === index ? '1' : '0';
      });
      const counter = el.querySelector<HTMLElement>('[data-scrub-counter]');
      if (counter) counter.textContent = `${index + 1} / ${frames.length}`;
    };

    el.addEventListener(
      'pointermove',
      (event) => {
        const rect = el.getBoundingClientRect();
        const ratio = (event.clientX - rect.left) / rect.width;
        const index = Math.min(frames.length - 1, Math.max(0, Math.floor(ratio * frames.length)));
        show(index);
      },
      { passive: true },
    );

    el.addEventListener('pointerleave', () => show(0));
  });
}

export function initInteractions(): void {
  initMagnetic();
  initSpotlight();
  initTilt();
  initHoverScrub();
}
