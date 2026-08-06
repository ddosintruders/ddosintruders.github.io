import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './reduced-motion';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;
let initialised = false;

/**
 * Boots smooth scrolling and hands ScrollTrigger its clock.
 *
 * Order matters here. Lenis must drive ScrollTrigger.update, and GSAP's ticker
 * must drive Lenis's rAF — running two independent rAF loops makes pinned
 * sections jitter by a frame. lagSmoothing(0) stops GSAP from "catching up"
 * after a stall, which would otherwise teleport pinned content.
 *
 * Idempotent: Astro view transitions re-run page scripts, and a second Lenis
 * instance would double every scroll delta.
 */
export function initScroll(): Lenis | null {
  if (initialised) return lenis;
  initialised = true;

  // Reduced motion gets native scrolling. Smooth-scroll interpolation *is*
  // motion — honouring the preference means not lerping the viewport either.
  if (prefersReducedMotion()) {
    ScrollTrigger.refresh();
    return null;
  }

  lenis = new Lenis({
    duration: 1.05,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    smoothWheel: true,
    // Touch devices keep native momentum; Lenis on touch feels laggy and
    // fights the platform's own overscroll behaviour.
    syncTouch: false,
    touchMultiplier: 1.6,
  });

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis?.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  return lenis;
}

export function getLenis(): Lenis | null {
  return lenis;
}

/**
 * Anchor navigation that works whether or not Lenis is running.
 * Falls back to native scrollIntoView under reduced motion.
 */
export function scrollToSection(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;

  if (lenis) {
    lenis.scrollTo(target, { offset: 0, duration: 1.4 });
  } else {
    target.scrollIntoView({ behavior: 'auto', block: 'start' });
  }
}

/** Wires every in-page anchor through the smooth scroller. */
export function bindAnchors(): void {
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
    const href = anchor.getAttribute('href');
    if (!href || href === '#') return;

    anchor.addEventListener('click', (event) => {
      const id = href.slice(1);
      if (!document.getElementById(id)) return;
      event.preventDefault();
      scrollToSection(id);
      // Keep the URL honest so the section is linkable and the back button works.
      history.replaceState(null, '', href);
    });
  });
}

export { gsap, ScrollTrigger };
