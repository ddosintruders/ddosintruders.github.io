import SplitType from 'split-type';
import { gsap, ScrollTrigger } from './scroll';
import { prefersReducedMotion } from './reduced-motion';

/**
 * Scroll-driven text choreography.
 *
 * Opt in from markup:
 *   data-reveal            → per-line clip-mask rise
 *   data-reveal-fade       → simple fade+rise, for blocks that shouldn't be split
 *   data-scramble          → mono decode effect on entry
 *
 * Under reduced motion every initialiser returns early and the content is left
 * exactly as authored — visible, in flow, no transforms applied. That matters:
 * a "reveal" implemented as opacity-0-until-animated becomes permanently
 * invisible content the moment the animation is skipped.
 */

const ENTER = 'top 85%';

export function initLineReveals(): void {
  if (prefersReducedMotion()) return;

  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    const split = new SplitType(el, { types: 'lines', lineClass: 'reveal-line' });
    if (!split.lines?.length) return;

    // SplitType gives us lines; we need a mask around each to clip the rise.
    split.lines.forEach((line) => {
      const mask = document.createElement('span');
      mask.className = 'line-mask';
      line.parentNode?.insertBefore(mask, line);
      mask.appendChild(line);
    });

    gsap.set(split.lines, { yPercent: 115 });

    gsap.to(split.lines, {
      yPercent: 0,
      duration: 1.05,
      ease: 'expo.out',
      stagger: 0.075,
      scrollTrigger: { trigger: el, start: ENTER, once: true },
    });
  });
}

export function initFadeReveals(): void {
  if (prefersReducedMotion()) return;

  const targets = gsap.utils.toArray<HTMLElement>('[data-reveal-fade]');
  targets.forEach((el) => {
    const delay = Number(el.dataset.revealDelay ?? 0);
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 28 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.9,
        ease: 'expo.out',
        delay,
        scrollTrigger: { trigger: el, start: ENTER, once: true },
      },
    );
  });
}

const GLYPHS = '▚▞░▒▓█/\\<>[]{}=+*·:0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Decode effect. Hand-rolled rather than pulled from a plugin: it is ~20 lines,
 * and it lets each character settle in source order, which reads as *resolving*
 * rather than as random noise stopping.
 */
export function initScrambles(): void {
  if (prefersReducedMotion()) return;

  document.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el) => {
    const final = el.textContent ?? '';
    if (!final.trim()) return;

    // Reserve the final width so nothing reflows mid-scramble.
    el.style.display = 'inline-block';
    el.style.minWidth = `${el.getBoundingClientRect().width}px`;

    let frame = 0;
    let raf = 0;

    const run = () => {
      const totalFrames = 28;
      const settleAt = (i: number) => Math.floor((i / final.length) * (totalFrames * 0.7));

      const tick = () => {
        let output = '';
        for (let i = 0; i < final.length; i += 1) {
          const char = final[i];
          if (char === ' ') {
            output += ' ';
          } else if (frame >= settleAt(i) + totalFrames * 0.3) {
            output += char;
          } else {
            output += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          }
        }
        el.textContent = output;
        frame += 1;

        if (frame <= totalFrames) {
          raf = requestAnimationFrame(tick);
        } else {
          el.textContent = final;
          el.style.minWidth = '';
        }
      };

      tick();
    };

    ScrollTrigger.create({
      trigger: el,
      start: ENTER,
      once: true,
      onEnter: run,
    });

    // If the element is torn down mid-scramble (view transition), stop the loop.
    el.addEventListener('astro:before-swap', () => cancelAnimationFrame(raf), { once: true });
  });
}

/**
 * Failsafe for the reveal system.
 *
 * Every reveal starts fully transparent and is only made visible by a tween, so
 * anything that stops those tweens from running hides real content permanently.
 * rAF is paused in background tabs, throttled under battery saver, and dead if
 * the GSAP chunk fails to fetch — none of which should cost a visitor the page.
 *
 * So: once the document has actually been visible for a few seconds, force
 * anything still transparent into view. Content beats choreography.
 */
function guardReveals(): void {
  const sweep = () => {
    document
      .querySelectorAll<HTMLElement>('[data-reveal-fade], [data-reveal], [data-hero-line]')
      .forEach((el) => {
        const style = getComputedStyle(el);
        if (style.opacity !== '0' && style.visibility !== 'hidden') return;

        // Only rescue elements the reader could already have reached.
        const rect = el.getBoundingClientRect();
        if (rect.top > window.innerHeight * 1.2) return;

        gsap.set(el, { autoAlpha: 1, y: 0, clearProps: 'transform' });
        el.querySelectorAll<HTMLElement>('.reveal-line').forEach((line) => {
          gsap.set(line, { yPercent: 0 });
        });
      });

    // The hero name is split into masked characters parked at yPercent 120.
    // It is the first thing on the page, so a stuck intro means a blank hero.
    const heroChars = document.querySelectorAll<HTMLElement>(
      '[data-hero-title] .line-mask > span',
    );
    if (heroChars.length) {
      const first = heroChars[0];
      const parked = first && Math.abs(first.getBoundingClientRect().height) > 0
        ? getComputedStyle(first).transform
        : 'none';
      if (parked !== 'none' && !parked.endsWith(', 0)')) {
        gsap.set(heroChars, { yPercent: 0 });
      }
    }
  };

  let armed = false;
  const arm = () => {
    if (armed || document.hidden) return;
    armed = true;
    window.setTimeout(sweep, 3500);
  };

  arm();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    // Triggers measured while hidden can be stale; recompute on the way back in.
    ScrollTrigger.refresh();
    arm();
  });

  // Scroll is the strongest signal that rAF is alive and the reader is moving —
  // sweep once shortly after the first one, in case anything was missed.
  window.addEventListener('scroll', () => window.setTimeout(sweep, 1200), { once: true });
}

/** Boots every scroll reveal. Safe to call once per page load. */
export function initReveals(): void {
  initLineReveals();
  initFadeReveals();
  initScrambles();
  // Content height changes as fonts settle and images decode; without this,
  // triggers computed at DOMContentLoaded fire at the wrong scroll positions.
  ScrollTrigger.refresh();
  guardReveals();
}
